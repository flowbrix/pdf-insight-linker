
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const CONVERSION_SERVICE_URL = Deno.env.get('CONVERSION_SERVICE_URL')

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  let payload;
  try {
    payload = await req.json()
    const { pageId, documentId, pdfPath } = payload
    
    console.log(`Création d'un job de conversion pour la page ${pageId} du document ${documentId}`)

    // Initialisation du client Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Mise à jour du statut de la page
    await supabase
      .from('document_pages')
      .update({ png_conversion_status: 'pending' })
      .eq('id', pageId)

    // Création du job de conversion
    const { data: job, error: jobError } = await supabase
      .from('conversion_jobs')
      .insert({
        page_id: pageId,
        input_path: pdfPath,
        output_path: pdfPath.replace('.pdf', '.png'),
        status: 'pending'
      })
      .select()
      .single()

    if (jobError) {
      throw new Error(`Erreur lors de la création du job: ${jobError.message}`)
    }

    // Notification du service de conversion (si configuré)
    if (CONVERSION_SERVICE_URL) {
      try {
        const response = await fetch(CONVERSION_SERVICE_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${Deno.env.get('CONVERSION_SERVICE_KEY')}`
          },
          body: JSON.stringify({
            jobId: job.id,
            pageId,
            documentId,
            inputPath: pdfPath
          })
        })

        if (!response.ok) {
          throw new Error(`Le service de conversion a répondu avec le statut: ${response.status}`)
        }
      } catch (notificationError) {
        console.error('Erreur lors de la notification du service:', notificationError)
        // On continue malgré l'erreur - le service pourra récupérer les jobs en attente
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Job de conversion créé',
        jobId: job.id
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Erreur:', error)
    
    // Mise à jour du statut de la page en cas d'erreur
    if (payload?.pageId) {
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      )
      
      await supabase
        .from('document_pages')
        .update({ 
          png_conversion_status: 'error'
        })
        .eq('id', payload.pageId)
    }

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
