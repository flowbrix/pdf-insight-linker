
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Request-Headers': '*',
  'Content-Type': 'application/json'
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: corsHeaders
    });
  }

  try {
    console.log('Début du traitement de la requête');
    const body = await req.json();
    const { documentId } = body;

    if (!documentId) {
      console.error('Document ID manquant');
      return new Response(
        JSON.stringify({ error: 'Document ID is required' }), 
        { headers: corsHeaders, status: 400 }
      );
    }

    console.log('Initialisation du client Supabase');
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('Recherche du document:', documentId);
    const { data: document, error: docError } = await supabaseClient
      .from('documents')
      .select('*')
      .eq('id', documentId)
      .single();

    if (docError || !document) {
      console.error('Document non trouvé:', docError);
      return new Response(
        JSON.stringify({ error: 'Document not found' }), 
        { headers: corsHeaders, status: 404 }
      );
    }

    // Pour l'instant, on met juste à jour le statut
    await supabaseClient
      .from('documents')
      .update({
        status: 'pending_google_vision',
        processed: false
      })
      .eq('id', documentId);

    console.log('Document mis en attente de traitement Google Vision');
    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Document mis en attente de traitement Google Vision'
      }),
      { headers: corsHeaders }
    );
  } catch (error) {
    console.error('Erreur lors du traitement:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: error.stack
      }),
      { headers: corsHeaders, status: 500 }
    );
  }
});
