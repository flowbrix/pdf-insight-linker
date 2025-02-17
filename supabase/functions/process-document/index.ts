
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

    // Récupérer les informations du document
    const { data: document, error: docError } = await supabase
      .from('documents')
      .select('*')
      .eq('id', documentId)
      .single()

    if (docError || !document) {
      throw new Error(`Document non trouvé: ${docError?.message}`)
    }

    // Mettre à jour le statut du document
    await supabase
      .from('documents')
      .update({ status: 'processing' })
      .eq('id', documentId)

    // Récupérer le fichier PDF
    const { data: pdfData, error: downloadError } = await supabase.storage
      .from(bucketName)
      .download(filePath)

    if (downloadError || !pdfData) {
      throw new Error(`Impossible de récupérer le PDF: ${downloadError?.message}`)
    }

    console.log('PDF récupéré, chargement...')

    // Charger le PDF avec pdf-lib
    const arrayBuffer = await pdfData.arrayBuffer()
    const pdfDoc = await PDFDocument.load(arrayBuffer)
    const totalPages = pdfDoc.getPageCount()

    console.log(`Nombre total de pages: ${totalPages}`)

    // Mettre à jour le nombre total de pages
    await supabase
      .from('documents')
      .update({ total_pages: totalPages })
      .eq('id', documentId)

    console.log('Création des entrées pour chaque page...')

    // Pour chaque page, créer une entrée dans la table document_pages
    for (let pageNum = 0; pageNum < totalPages; pageNum++) {
      const imagePath = `${document.id}/page-${pageNum + 1}.jpg`
      
      console.log(`Traitement de la page ${pageNum + 1}/${totalPages}`)
      
      await supabase
        .from('document_pages')
        .insert({
          document_id: documentId,
          page_number: pageNum + 1,
          image_path: imagePath,
        })
    }

    // Mettre à jour le statut une fois terminé
    await supabase
      .from('documents')
      .update({ 
        status: 'completed',
        processed: true,
        processed_at: new Date().toISOString()
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
