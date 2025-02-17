
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'
import { decode } from "https://deno.land/x/pdfjs@v0.1.0/mod.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { pageId, documentId, pdfPath } = await req.json()
    
    console.log(`Début de la conversion en PNG pour la page ${pageId} du document ${documentId}`)

    // Initialisation du client Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Mettre à jour le statut de conversion
    await supabase
      .from('document_pages')
      .update({ png_conversion_status: 'processing' })
      .eq('id', pageId)

    // Récupérer le fichier PDF
    const { data: pdfFile, error: downloadError } = await supabase.storage
      .from('document_pages')
      .download(pdfPath)

    if (downloadError) {
      throw new Error(`Erreur lors de la récupération du PDF: ${downloadError.message}`)
    }

    try {
      // Lire le contenu du PDF
      const pdfData = new Uint8Array(await pdfFile.arrayBuffer())
      const pdf = await decode(pdfData)
      
      // On ne traite que la première page car le PDF ne contient qu'une page
      const page = pdf.pages[0]
      
      console.log(`Dimensions de la page: ${page.width}x${page.height}`)
      
      // Pour l'instant, on simule juste la conversion pour vérifier que la lecture du PDF fonctionne
      await new Promise(resolve => setTimeout(resolve, 1000))

      // Mettre à jour le statut
      await supabase
        .from('document_pages')
        .update({ 
          png_conversion_status: 'completed'
        })
        .eq('id', pageId)

      return new Response(
        JSON.stringify({
          success: true,
          message: 'PDF lu avec succès, prêt pour la conversion',
          dimensions: {
            width: page.width,
            height: page.height
          }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )

    } catch (conversionError) {
      console.error('Erreur lors de la lecture du PDF:', conversionError)
      throw conversionError
    }

  } catch (error) {
    console.error('Erreur:', error)
    
    // En cas d'erreur, mettre à jour le statut
    const { pageId } = await req.json()
    if (pageId) {
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      )
      
      await supabase
        .from('document_pages')
        .update({ 
          png_conversion_status: 'error'
        })
        .eq('id', pageId)
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
