
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'
import { createRequire } from "https://deno.land/std@0.177.0/node/module.ts";
const require = createRequire(import.meta.url);
const pdf = require('pdf-lib');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { documentId } = await req.json()
    
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
    const { data: pdfData } = await supabase.storage
      .from('documents')
      .download(document.file_path)

    if (!pdfData) {
      throw new Error('Impossible de récupérer le PDF')
    }

    // Charger le PDF avec pdf-lib
    const pdfDoc = await pdf.PDFDocument.load(await pdfData.arrayBuffer())
    const totalPages = pdfDoc.getPageCount()

    // Mettre à jour le nombre total de pages
    await supabase
      .from('documents')
      .update({ total_pages: totalPages })
      .eq('id', documentId)

    // Pour chaque page, créer une entrée dans la table document_pages
    for (let pageNum = 0; pageNum < totalPages; pageNum++) {
      const imagePath = `${document.id}/page-${pageNum + 1}.jpg`
      
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
