
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'
import * as pdf from "https://deno.land/x/pdfjs@v0.1.0/mod.ts"
import { createCanvas } from "https://deno.land/x/canvas@v1.4.1/mod.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

async function convertPageToImage(pdfDoc: any, pageNum: number): Promise<Uint8Array | null> {
  try {
    const page = await pdfDoc.getPage(pageNum)
    const viewport = page.getViewport({ scale: 1.5 }) // Scale 1.5 pour une meilleure qualité
    
    const canvas = createCanvas(viewport.width, viewport.height)
    const context = canvas.getContext('2d')
    
    const renderContext = {
      canvasContext: context,
      viewport: viewport
    }
    
    await page.render(renderContext).promise
    
    // Convertir le canvas en PNG
    const imageData = await canvas.toBuffer('image/png')
    return new Uint8Array(imageData)
  } catch (error) {
    console.error(`Erreur conversion page ${pageNum}:`, error)
    return null
  }
}

serve(async (req) => {
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

    console.log('Document PDF récupéré, début de la conversion...')

    // Charger le PDF
    const pdfData = await pdfFile.arrayBuffer()
    const pdfDoc = await pdf.getDocument({ data: pdfData }).promise
    const totalPages = Math.min(pdfDoc.numPages, 10) // Maximum 10 pages
    
    console.log(`Nombre total de pages à traiter: ${totalPages}`)
    
    const processedPages = []

    // Traiter chaque page
    for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
      console.log(`Traitement de la page ${pageNum}...`)
      
      const imageData = await convertPageToImage(pdfDoc, pageNum)
      if (!imageData) {
        console.error(`Échec de la conversion de la page ${pageNum}`)
        continue
      }

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
        continue
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

      processedPages.push({ pageNum, url: publicUrl })
    }

    // Mise à jour finale du document
    await supabase
      .from('documents')
      .update({ 
        status: 'completed',
        processed: true,
        processed_at: new Date().toISOString(),
        total_pages: processedPages.length
      })
      .eq('id', documentId)

    console.log(`Traitement terminé. ${processedPages.length} pages traitées.`)

    return new Response(
      JSON.stringify({
        success: true,
        message: `${processedPages.length} pages traitées avec succès`,
        pages: processedPages
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
