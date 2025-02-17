
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

    console.log('Document PDF récupéré avec succès')

    // Pour test, on crée une "fausse" image pour simuler la conversion
    const dummyImageData = new Uint8Array([]);  // Image vide pour test
    const imagePath = `${documentId}/page-1.png`
    
    // Upload de l'image test
    const { error: uploadError } = await supabase.storage
      .from('document_pages')
      .upload(imagePath, dummyImageData, {
        contentType: 'image/png',
        upsert: true
      })

    if (uploadError) {
      console.error('Erreur upload:', uploadError)
      throw uploadError
    }

    // Obtenir l'URL publique
    const { data: { publicUrl } } = supabase.storage
      .from('document_pages')
      .getPublicUrl(imagePath)

    console.log(`Test image stockée: ${publicUrl}`)

    // Enregistrer les métadonnées de la page
    await supabase
      .from('document_pages')
      .insert({
        document_id: documentId,
        page_number: 1,
        image_path: imagePath
      })

    // Mise à jour finale du document
    await supabase
      .from('documents')
      .update({ 
        status: 'completed',
        processed: true,
        processed_at: new Date().toISOString(),
        total_pages: 1
      })
      .eq('id', documentId)

    console.log('Traitement de test terminé')

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Test de stockage effectué',
        pages: [{ pageNum: 1, url: publicUrl }]
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
