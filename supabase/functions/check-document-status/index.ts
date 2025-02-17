
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

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Variables d\'environnement manquantes');
    }

    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);

    // Récupérer le document
    const { data: document, error: docError } = await supabaseClient
      .from('documents')
      .select('*')
      .eq('id', documentId)
      .single();

    if (docError || !document) {
      throw new Error('Document non trouvé');
    }

    // Comme nous utilisons maintenant l'API synchrone, nous pouvons considérer 
    // que le traitement est terminé dès que le document a un statut
    if (document.status === 'processing') {
      await supabaseClient
        .from('documents')
        .update({
          status: 'completed',
          ocr_status: 'completed',
          ocr_completed_at: new Date().toISOString(),
        })
        .eq('id', documentId);

      return new Response(
        JSON.stringify({ 
          status: 'completed',
          message: 'Document traité avec succès'
        }),
        { headers: corsHeaders }
      );
    }

    return new Response(
      JSON.stringify({
        status: document.status,
        message: document.status === 'error' ? document.ocr_error : 'En cours de traitement'
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
