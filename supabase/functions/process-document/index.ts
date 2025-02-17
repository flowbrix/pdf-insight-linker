
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'
import { PDFDocument } from 'https://esm.sh/pdf-lib@1.17.1'
import { encode as encodeBase64 } from "https://deno.land/std@0.182.0/encoding/base64.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Request-Headers': '*',
  'Content-Type': 'application/json'
}

async function extractFirstPageAsPdf(pdfArrayBuffer: ArrayBuffer): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.load(pdfArrayBuffer);
  const newPdfDoc = await PDFDocument.create();
  
  const [firstPage] = await newPdfDoc.copyPages(pdfDoc, [0]);
  newPdfDoc.addPage(firstPage);
  
  return await newPdfDoc.save();
}

async function processDocumentWithVision(fileData: Uint8Array): Promise<any> {
  try {
    const apiKey = Deno.env.get('GOOGLE_CLOUD_VISION_API_KEY');
    if (!apiKey) {
      throw new Error('Clé API Google Cloud Vision non configurée');
    }

    console.log('Construction de la requête Vision API...');
    const base64Content = encodeBase64(fileData);
    
    const requestBody = {
      requests: [{
        image: {
          content: base64Content
        },
        features: [{
          type: 'DOCUMENT_TEXT_DETECTION'
        }]
      }]
    };

    console.log('Envoi de la requête à Google Cloud Vision...');
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
      const errorText = await response.text();
      console.error('Erreur Google Cloud Vision:', errorText);
      throw new Error(`Erreur Google Cloud Vision: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    console.log('Réponse de Google Cloud Vision reçue avec succès');
    return result;
  } catch (error) {
    console.error('Erreur dans processDocumentWithVision:', error);
    throw error;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Début du traitement de la requête');
    const body = await req.json();
    const documentId = body.documentId;

    if (!documentId) {
      console.error('Document ID manquant');
      return new Response(
        JSON.stringify({ error: 'Document ID is required' }), 
        { headers: corsHeaders, status: 400 }
      );
    }

    console.log('Initialisation du client Supabase...');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Variables d\'environnement Supabase manquantes');
    }

    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);

    console.log('Recherche du document:', documentId);
    const { data: document, error: docError } = await supabaseClient
      .from('documents')
      .select('*')
      .eq('id', documentId)
      .single();

    if (docError || !document) {
      console.error('Document non trouvé:', docError);
      throw new Error(docError ? docError.message : 'Document non trouvé');
    }

    console.log('Téléchargement du fichier:', document.file_path);
    const { data: fileData, error: fileError } = await supabaseClient.storage
      .from('documents')
      .download(document.file_path);

    if (fileError) {
      console.error('Erreur lors du téléchargement:', fileError);
      throw fileError;
    }

    if (!fileData) {
      throw new Error('Fichier non trouvé dans le storage');
    }

    console.log('Extraction de la première page...');
    const pdfArrayBuffer = await fileData.arrayBuffer();
    const firstPagePdf = await extractFirstPageAsPdf(pdfArrayBuffer);
    
    console.log('Envoi à Google Cloud Vision...');
    const visionResult = await processDocumentWithVision(firstPagePdf);

    // Extraction du texte du résultat de Vision API
    const extractedText = visionResult.responses[0]?.fullTextAnnotation?.text || '';
    console.log('Texte extrait:', extractedText);

    // Mise à jour du document avec le résultat et le texte extrait
    const now = new Date().toISOString();
    const { error: updateError } = await supabaseClient
      .from('documents')
      .update({
        status: 'completed',
        ocr_status: 'completed',
        ocr_completed_at: now,
        total_pages: 1,
        processed_at: now,
        extracted_text: {
          page_1: extractedText
        }
      })
      .eq('id', documentId);

    if (updateError) {
      console.error('Erreur lors de la mise à jour:', updateError);
      throw updateError;
    }

    console.log('Traitement terminé avec succès');
    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Traitement du document terminé',
        pages: 1,
        extracted_text: extractedText
      }),
      { headers: corsHeaders }
    );

  } catch (error) {
    console.error('Erreur lors du traitement:', error);
    
    if (body?.documentId) {
      try {
        const supabaseClient = createClient(
          Deno.env.get('SUPABASE_URL') ?? '',
          Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        );

        await supabaseClient
          .from('documents')
          .update({ 
            status: 'error',
            ocr_status: 'error',
            ocr_error: error instanceof Error ? error.message : 'Erreur inconnue'
          })
          .eq('id', body.documentId);
      } catch (updateError) {
        console.error('Erreur lors de la mise à jour du statut d\'erreur:', updateError);
      }
    }

    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Erreur inconnue',
        details: error instanceof Error ? error.stack : undefined
      }),
      { headers: corsHeaders, status: 500 }
    );
  }
});
