
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Request-Headers': '*',
  'Content-Type': 'application/json'
}

async function analyzeDocumentWithVision(fileBytes: Uint8Array): Promise<any> {
  const apiKey = Deno.env.get('GOOGLE_CLOUD_VISION_API_KEY');
  if (!apiKey) {
    throw new Error('Clé API Google Cloud Vision non configurée');
  }

  const base64Content = btoa(String.fromCharCode(...fileBytes));
  
  const requestBody = {
    requests: [{
      image: {
        content: base64Content
      },
      features: [{
        type: 'DOCUMENT_TEXT_DETECTION',
        maxResults: 1
      }]
    }]
  };

  const response = await fetch(
    `https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    }
  );

  if (!response.ok) {
    throw new Error(`Erreur Google Cloud Vision: ${await response.text()}`);
  }

  return await response.json();
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

    // Téléchargement du document
    console.log('Téléchargement du fichier:', document.file_path);
    const { data: fileData, error: fileError } = await supabaseClient.storage
      .from('documents')
      .download(document.file_path);

    if (fileError) {
      console.error('Erreur lors du téléchargement:', fileError);
      throw fileError;
    }

    // Mise à jour du statut
    await supabaseClient
      .from('documents')
      .update({ 
        status: 'processing',
        ocr_status: 'processing'
      })
      .eq('id', documentId);

    // Analyse avec Google Cloud Vision
    console.log('Envoi à Google Cloud Vision');
    const fileBytes = new Uint8Array(await fileData.arrayBuffer());
    const visionResult = await analyzeDocumentWithVision(fileBytes);

    // Mise à jour des résultats
    const now = new Date().toISOString();
    await supabaseClient
      .from('documents')
      .update({
        status: 'completed',
        ocr_status: 'completed',
        ocr_completed_at: now,
        extracted_text: visionResult,
        processed: true,
        processed_at: now
      })
      .eq('id', documentId);

    console.log('Traitement terminé avec succès');
    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Document traité avec succès par Google Cloud Vision'
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
