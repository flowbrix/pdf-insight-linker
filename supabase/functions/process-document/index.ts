
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'
import { encode as base64Encode } from "https://deno.land/std@0.177.0/encoding/base64.ts";
import { PDFDocument } from 'https://esm.sh/pdf-lib@1.17.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Request-Headers': '*',
  'Content-Type': 'application/json'
}

async function convertPDFPageToImage(pdfBytes: ArrayBuffer, pageNum: number): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.load(pdfBytes);
  const page = pdfDoc.getPages()[pageNum];
  
  // Créer un nouveau document PDF avec une seule page
  const singlePagePdf = await PDFDocument.create();
  const [copiedPage] = await singlePagePdf.copyPages(pdfDoc, [pageNum]);
  singlePagePdf.addPage(copiedPage);
  
  const pdfBytes2 = await singlePagePdf.save();
  
  // Utiliser pdf2pic pour convertir en PNG
  const { fromPath } = await import('https://esm.sh/pdf2pic@3.1.1');
  
  const options = {
    density: 300,
    saveFilename: `page-${pageNum}`,
    format: "png",
    width: 2480,
    height: 3508
  };
  
  const convert = fromPath(new Uint8Array(pdfBytes2), options);
  const result = await convert(pageNum + 1);
  
  return result.buffer;
}

async function analyzeDocumentWithVision(imageBuffer: ArrayBuffer): Promise<any> {
  try {
    const apiKey = Deno.env.get('GOOGLE_CLOUD_VISION_API_KEY');
    if (!apiKey) {
      throw new Error('Clé API Google Cloud Vision non configurée');
    }

    console.log('Préparation de l\'image pour Vision API...');
    const base64Content = base64Encode(new Uint8Array(imageBuffer));
    
    console.log('Construction de la requête Vision API...');
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
    console.error('Erreur dans analyzeDocumentWithVision:', error);
    throw error;
  }
}

serve(async (req) => {
  let documentId: string | undefined;

  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: corsHeaders
    });
  }

  try {
    console.log('Début du traitement de la requête');
    const body = await req.json();
    documentId = body.documentId;

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

    console.log('Mise à jour du statut initial...');
    const { error: statusError } = await supabaseClient
      .from('documents')
      .update({ 
        status: 'processing',
        ocr_status: 'processing'
      })
      .eq('id', documentId);

    if (statusError) {
      console.error('Erreur lors de la mise à jour du statut initial:', statusError);
      throw statusError;
    }

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

    console.log('Conversion du fichier...');
    const pdfArrayBuffer = await fileData.arrayBuffer();
    const pdfDoc = await PDFDocument.load(pdfArrayBuffer);
    const numPages = pdfDoc.getPageCount();
    
    console.log(`Nombre de pages dans le PDF: ${numPages}`);
    let allText = '';

    for (let i = 0; i < numPages; i++) {
      console.log(`Traitement de la page ${i + 1}/${numPages}`);
      const pageImage = await convertPDFPageToImage(pdfArrayBuffer, i);
      const visionResult = await analyzeDocumentWithVision(pageImage);
      const pageText = visionResult.responses[0]?.fullTextAnnotation?.text;
      
      if (pageText) {
        allText += pageText + '\n\n';
      }
    }

    if (!allText.trim()) {
      throw new Error('Aucun texte n\'a pu être extrait du document');
    }

    console.log('Mise à jour des résultats...');
    const now = new Date().toISOString();
    const { error: updateError } = await supabaseClient
      .from('documents')
      .update({
        status: 'completed',
        ocr_status: 'completed',
        ocr_completed_at: now,
        extracted_text: allText,
        processed: true,
        processed_at: now,
        total_pages: numPages
      })
      .eq('id', documentId);

    if (updateError) {
      console.error('Erreur lors de la mise à jour finale:', updateError);
      throw updateError;
    }

    console.log('Traitement terminé avec succès');
    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Document traité avec succès',
        pages: numPages
      }),
      { headers: corsHeaders }
    );

  } catch (error) {
    console.error('Erreur lors du traitement:', error);
    
    if (documentId) {
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
          .eq('id', documentId);
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
