
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Récupérer les jobs en attente
    const { data: pendingJobs, error: jobsError } = await supabase
      .from('conversion_jobs')
      .select(`
        id,
        page_id,
        input_path,
        output_path,
        status,
        attempts,
        document_pages (id)
      `)
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(10)

    if (jobsError) {
      throw jobsError
    }

    console.log(`${pendingJobs.length} jobs en attente trouvés`)

    // Traiter chaque job
    for (const job of pendingJobs) {
      try {
        // Vérifier si le service de conversion est disponible
        const conversionServiceUrl = Deno.env.get('CONVERSION_SERVICE_URL')
        if (!conversionServiceUrl) {
          throw new Error('URL du service de conversion non configurée')
        }

        // Notifier le service de conversion
        const response = await fetch(`${conversionServiceUrl}/process`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${Deno.env.get('CONVERSION_SERVICE_KEY')}`
          },
          body: JSON.stringify({
            jobId: job.id,
            pageId: job.page_id,
            inputPath: job.input_path,
            outputPath: job.output_path
          })
        })

        if (!response.ok) {
          throw new Error(`Erreur du service de conversion: ${response.statusText}`)
        }

        // Mettre à jour le statut du job
        await supabase
          .from('conversion_jobs')
          .update({
            status: 'processing',
            attempts: job.attempts + 1
          })
          .eq('id', job.id)

        console.log(`Job ${job.id} envoyé pour traitement`)

      } catch (jobError) {
        console.error(`Erreur lors du traitement du job ${job.id}:`, jobError)

        // Mettre à jour le statut du job en erreur
        await supabase
          .from('conversion_jobs')
          .update({
            status: 'error',
            error_message: jobError.message,
            attempts: job.attempts + 1
          })
          .eq('id', job.id)

        // Mettre à jour le statut de la page
        if (job.page_id) {
          await supabase
            .from('document_pages')
            .update({
              png_conversion_status: 'error'
            })
            .eq('id', job.page_id)
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        processed: pendingJobs.length
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Erreur générale:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
})
