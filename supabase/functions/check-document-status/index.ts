
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Request-Headers': '*',
  'Content-Type': 'application/json'
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { documentId } = await req.json();
    
    if (!documentId) {
      throw new Error('Document ID manquant');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const apiKey = Deno.env.get('GOOGLE_CLOUD_VISION_API_KEY');

    if (!supabaseUrl || !supabaseServiceKey || !apiKey) {
      throw new Error('Variables d\'environnement manquantes');
    }

    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);

    // Récupérer le document et son operation_id
    const { data: document, error: docError } = await supabaseClient
      .from('documents')
      .select('*')
      .eq('id', documentId)
      .single();

    if (docError || !document) {
      throw new Error('Document non trouvé');
    }

    if (!document.operation_id) {
      throw new Error('Operation ID manquant');
    }

    // Vérifier le statut de l'opération avec Google Cloud Vision
    const response = await fetch(
      `https://vision.googleapis.com/v1/${document.operation_id}?key=${apiKey}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );

    if (!response.ok) {
      throw new Error(`Erreur lors de la vérification du statut: ${response.status}`);
    }

    const result = await response.json();
    console.log('Statut de l\'opération:', result);

    if (!result.done) {
      // L'opération est toujours en cours
      return new Response(
        JSON.stringify({ status: 'processing' }),
        { headers: corsHeaders }
      );
    }

    if (result.error) {
      // Il y a eu une erreur pendant le traitement
      await supabaseClient
        .from('documents')
        .update({
          status: 'error',
          ocr_status: 'error',
          ocr_error: result.error.message
        })
        .eq('id', documentId);

      throw new Error(result.error.message);
    }

    // Extraire le texte du résultat
    const responses = result.response.responses;
    let extractedText = '';
    
    if (responses && responses.length > 0) {
      for (const response of responses) {
        if (response.fullTextAnnotation) {
          extractedText += response.fullTextAnnotation.text + '\n\n';
        }
      }
    }

    if (!extractedText.trim()) {
      throw new Error('Aucun texte n\'a pu être extrait du document');
    }

    // Mettre à jour le document avec le texte extrait
    const now = new Date().toISOString();
    const { error: updateError } = await supabaseClient
      .from('documents')
      .update({
        status: 'completed',
        ocr_status: 'completed',
        ocr_completed_at: now,
        extracted_text: extractedText,
        processed: true,
        processed_at: now
      })
      .eq('id', documentId);

    if (updateError) {
      throw updateError;
    }

    return new Response(
      JSON.stringify({
        status: 'completed',
        message: 'Document traité avec succès'
      }),
      { headers: corsHeaders }
    );

  } catch (error) {
    console.error('Erreur:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Erreur inconnue',
        details: error instanceof Error ? error.stack : undefined
      }),
      { headers: corsHeaders, status: 500 }
    );
  }
});
