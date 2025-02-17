
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'
import { fromPath } from 'https://esm.sh/pdf2pic@1.4.0'

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

    // Créer un fichier temporaire pour le PDF
    const tempPdfPath = `/tmp/${documentId}_${pageId}.pdf`
    await Deno.writeFile(tempPdfPath, new Uint8Array(await pdfFile.arrayBuffer()))

    // Configuration de la conversion
    const options = {
      density: 300,
      saveFilename: `page_${pageId}`,
      savePath: "/tmp",
      format: "png",
      width: 2480, // Format A4 à 300 DPI
      height: 3508
    }

    try {
      // Convertir le PDF en PNG
      const convert = fromPath(tempPdfPath, options)
      const pageImage = await convert(1) // Convertir la première page (le PDF ne contient qu'une page)

      if (!pageImage || !pageImage.path) {
        throw new Error("La conversion en PNG a échoué")
      }

      console.log(`PNG généré avec succès: ${pageImage.path}`)

      // Nettoyer les fichiers temporaires
      await Deno.remove(tempPdfPath)
      await Deno.remove(pageImage.path)

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Conversion en PNG réussie',
          page_image: pageImage
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )

    } catch (conversionError) {
      console.error('Erreur lors de la conversion:', conversionError)
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
