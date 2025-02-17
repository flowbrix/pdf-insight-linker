
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'
import { processImage } from './pdfToImage.ts'

// En-têtes CORS nécessaires
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Gestion des requêtes OPTIONS pour CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { documentId, filePath, bucketName } = await req.json()
    console.log(`Début du traitement pour le document ${documentId}`)

    // Initialisation du client Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Récupération du fichier PDF
    const { data: pdfFile, error: downloadError } = await supabase.storage
      .from(bucketName)
      .download(filePath)

    if (downloadError) {
      throw new Error(`Erreur lors de la récupération du PDF: ${downloadError.message}`)
    }

    // Mettre à jour le statut du document
    await supabase
      .from('documents')
      .update({ status: 'processing' })
      .eq('id', documentId)

    // Envoyer le PDF à l'API de conversion (à implémenter)
    const apiKey = Deno.env.get('GOOGLE_CLOUD_VISION_API_KEY')
    if (!apiKey) {
      throw new Error('Clé API Google Cloud non configurée')
    }

    // Traitement des 10 premières pages maximum
    const maxPages = 10
    const pagePromises = []

    console.log('Début de la conversion des pages...')
    
    for (let pageNum = 1; pageNum <= maxPages; pageNum++) {
      // Note: processImage est une fonction à implémenter qui utilisera l'API Google Cloud Vision
      const pagePromise = processImage(pdfFile, pageNum, documentId)
        .then(async (imageData) => {
          if (!imageData) return null

          const imagePath = `${documentId}/page-${pageNum}.png`
          
          // Upload de l'image convertie
          const { error: uploadError } = await supabase.storage
            .from('document_pages')
            .upload(imagePath, imageData, {
              contentType: 'image/png',
              upsert: true
            })

          if (uploadError) {
            console.error(`Erreur upload page ${pageNum}:`, uploadError)
            return null
          }

          // Obtenir l'URL publique
          const { data: { publicUrl } } = supabase.storage
            .from('document_pages')
            .getPublicUrl(imagePath)

          console.log(`Page ${pageNum} convertie et stockée: ${publicUrl}`)

          // Enregistrer les métadonnées de la page
          await supabase
            .from('document_pages')
            .insert({
              document_id: documentId,
              page_number: pageNum,
              image_path: imagePath
            })

          return { pageNum, url: publicUrl }
        })
        .catch(error => {
          console.error(`Erreur traitement page ${pageNum}:`, error)
          return null
        })

      pagePromises.push(pagePromise)
    }

    // Attendre la fin du traitement de toutes les pages
    const results = await Promise.all(pagePromises)
    const successfulPages = results.filter(r => r !== null)

    // Mise à jour finale du document
    await supabase
      .from('documents')
      .update({ 
        status: 'completed',
        processed: true,
        processed_at: new Date().toISOString(),
        total_pages: successfulPages.length
      })
      .eq('id', documentId)

    console.log(`Traitement terminé. ${successfulPages.length} pages traitées.`)

    return new Response(
      JSON.stringify({
        success: true,
        message: `${successfulPages.length} pages traitées avec succès`,
        pages: successfulPages
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Erreur:', error)
    
    // En cas d'erreur, mettre à jour le statut du document
    const { documentId } = await req.json()
    if (documentId) {
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      )
      
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
