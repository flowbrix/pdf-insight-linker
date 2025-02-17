
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { PDFDocument } from 'https://cdn.skypack.dev/pdf-lib';
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
    const { documentId, filePath, bucketName } = await req.json()
    
    console.log(`Traitement du document ${documentId} depuis ${bucketName}/${filePath}`)
    
    // Initialiser le client Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Récupérer le fichier PDF
    const { data: pdfData, error: downloadError } = await supabase.storage
      .from(bucketName)
      .download(filePath)

    if (downloadError || !pdfData) {
      throw new Error(`Impossible de récupérer le PDF: ${downloadError?.message}`)
    }

    console.log('PDF récupéré, conversion en cours...')

    // Charger le PDF avec pdf-lib
    const arrayBuffer = await pdfData.arrayBuffer()
    const pdfDoc = await PDFDocument.load(arrayBuffer)
    const totalPages = Math.min(pdfDoc.getPageCount(), 10) // Maximum 10 pages

    console.log(`Traitement de ${totalPages} pages`)

    // Pour chaque page, convertir en PNG et sauvegarder
    for (let pageNum = 0; pageNum < totalPages; pageNum++) {
      console.log(`Conversion de la page ${pageNum + 1}/${totalPages}`)
      
      const page = pdfDoc.getPages()[pageNum]
      
      // Convertir la page en PNG
      const imageFormat = 'png'
      const jpgPage = await page.exportAsImage({
        width: page.getWidth(),
        height: page.getHeight(),
      })
      
      const imageBytes = await jpgPage.encode()
      const imagePath = `${documentId}/page-${pageNum + 1}.png`

      // Uploader l'image dans le bucket document_pages
      const { error: uploadError } = await supabase.storage
        .from('document_pages')
        .upload(imagePath, imageBytes, {
          contentType: 'image/png',
          upsert: true
        })

      if (uploadError) {
        throw new Error(`Erreur lors de l'upload de la page ${pageNum + 1}: ${uploadError.message}`)
      }

      // Obtenir l'URL publique
      const { data: { publicUrl } } = supabase.storage
        .from('document_pages')
        .getPublicUrl(imagePath)

      console.log(`Page ${pageNum + 1} convertie et stockée: ${publicUrl}`)
      
      // Créer l'entrée dans la table document_pages
      await supabase
        .from('document_pages')
        .insert({
          document_id: documentId,
          page_number: pageNum + 1,
          image_path: imagePath,
        })
    }

    // Mettre à jour le document
    await supabase
      .from('documents')
      .update({ 
        status: 'completed',
        processed: true,
        processed_at: new Date().toISOString(),
        total_pages: totalPages
      })
      .eq('id', documentId)

    console.log('Traitement terminé avec succès')

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Document traité avec succès',
        totalPages 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Erreur:', error)
    
    // En cas d'erreur, mettre à jour le statut du document
    const { documentId } = await req.json()
    if (documentId) {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')
      const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
      const supabase = createClient(supabaseUrl, supabaseServiceKey)
      
      await supabase
        .from('documents')
        .update({ 
          status: 'error',
          processed: false
        })
        .eq('id', documentId)
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
