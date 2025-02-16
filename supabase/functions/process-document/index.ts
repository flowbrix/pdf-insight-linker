
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
    const { documentId } = await req.json()

    if (!documentId) {
      throw new Error('Document ID is required')
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // 1. Récupérer les informations du document
    const { data: document, error: documentError } = await supabase
      .from('documents')
      .select('*')
      .eq('id', documentId)
      .single()

    if (documentError) throw documentError

    // 2. Télécharger le fichier PDF depuis le bucket
    const { data: fileData, error: downloadError } = await supabase
      .storage
      .from('documents')
      .download(document.file_path)

    if (downloadError) throw downloadError

    // 3. Extraire le texte des premières pages (à implémenter avec une bibliothèque OCR)
    // Pour l'instant, on simule l'extraction
    const extractedData = [
      { key_name: 'numero_serie', extracted_value: 'ABC123', page_number: 1 },
      { key_name: 'date_fabrication', extracted_value: '2024-02-20', page_number: 1 },
      { key_name: 'operateur', extracted_value: 'John Doe', page_number: 2 },
    ]

    // 4. Sauvegarder les données extraites
    const { error: insertError } = await supabase
      .from('extracted_data')
      .insert(extractedData.map(data => ({
        document_id: documentId,
        ...data
      })))

    if (insertError) throw insertError

    // 5. Mettre à jour le statut du document
    const { error: updateError } = await supabase
      .from('documents')
      .update({
        processed: true,
        processed_at: new Date().toISOString(),
      })
      .eq('id', documentId)

    if (updateError) throw updateError

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})
