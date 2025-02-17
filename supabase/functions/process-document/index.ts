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

async function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function extractPageAsPdf(pdfArrayBuffer: ArrayBuffer, pageIndex: number): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.load(pdfArrayBuffer);
  const newPdfDoc = await PDFDocument.create();
  
  const [page] = await newPdfDoc.copyPages(pdfDoc, [pageIndex]);
  newPdfDoc.addPage(page);
  
  return await newPdfDoc.save();
}

async function savePdfPageAsJpg(supabaseClient: any, documentId: string, pageIndex: number, pdfData: Uint8Array): Promise<string> {
  const fileName = `${documentId}/page_${pageIndex + 1}.jpg`;
  const { error } = await supabaseClient.storage
    .from('documents-debug')
    .upload(fileName, pdfData, {
      contentType: 'application/pdf',
      upsert: true
    });

  if (error) {
    console.error('Erreur lors de la sauvegarde de la page en JPG:', error);
    throw error;
  }

  return fileName;
}

async function processDocumentWithVision(fileData: Uint8Array, maxRetries = 3): Promise<string> {
  try {
    const apiKey = Deno.env.get('GOOGLE_CLOUD_VISION_API_KEY');
    if (!apiKey) {
      throw new Error('Clé API Google Cloud Vision non configurée');
    }

    let attempt = 0;
    while (attempt < maxRetries) {
      try {
        console.log(`Tentative ${attempt + 1} d'extraction de texte...`);
        const base64Content = encodeBase64(fileData);
        
        const requestBody = {
          requests: [{
            image: {
              content: base64Content
            },
            features: [
              {
                type: 'DOCUMENT_TEXT_DETECTION',
                maxResults: 1
              },
              {
                type: 'TEXT_DETECTION',
                maxResults: 1
              }
            ],
            imageContext: {
              languageHints: ['fr', 'en'],
              textDetectionParams: {
                enableTextDetectionConfidenceScore: true
              }
            }
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
          const errorText = await response.text();
          console.error('Réponse Vision API:', errorText);
          throw new Error(`Erreur HTTP: ${response.status}`);
        }

        const result = await response.json();
        console.log('Réponse Vision API reçue:', JSON.stringify(result, null, 2));

        let extractedText = result.responses?.[0]?.fullTextAnnotation?.text;
        
        if (!extractedText && result.responses?.[0]?.textAnnotations?.[0]?.description) {
          extractedText = result.responses[0].textAnnotations[0].description;
        }

        if (!extractedText) {
          throw new Error('Aucun texte extrait dans la réponse');
        }

        console.log(`Texte extrait (${extractedText.length} caractères)`);
        return extractedText;
      } catch (error) {
        console.error(`Erreur tentative ${attempt + 1}:`, error);
        if (attempt === maxRetries - 1) throw error;
        attempt++;
        await delay(5000);
      }
    }
    throw new Error('Échec de toutes les tentatives d\'extraction');
  } catch (error) {
    console.error('Erreur finale dans processDocumentWithVision:', error);
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

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Variables d\'environnement Supabase manquantes');
    }

    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);

    const { data: document, error: docError } = await supabaseClient
      .from('documents')
      .select('*')
      .eq('id', documentId)
      .single();

    if (docError || !document) {
      throw new Error(docError ? docError.message : 'Document non trouvé');
    }

    const { data: fileData, error: fileError } = await supabaseClient.storage
      .from('documents')
      .download(document.file_path);

    if (fileError || !fileData) {
      throw new Error('Erreur lors du téléchargement du fichier');
    }

    const pdfArrayBuffer = await fileData.arrayBuffer();
    const pdfDoc = await PDFDocument.load(pdfArrayBuffer);
    const totalPages = Math.min(pdfDoc.getPageCount(), 10);
    console.log(`Nombre total de pages à traiter: ${totalPages}`);

    const extractedTextByPage: { 
      [key: string]: { 
        text: string, 
        debugImagePath?: string 
      } 
    } = {};

    for (let pageIndex = 0; pageIndex < totalPages; pageIndex++) {
      try {
        console.log(`\nTraitement de la page ${pageIndex + 1}/${totalPages}`);
        const pagePdf = await extractPageAsPdf(pdfArrayBuffer, pageIndex);
        
        const debugImagePath = await savePdfPageAsJpg(
          supabaseClient, 
          documentId, 
          pageIndex, 
          pagePdf
        );
        console.log(`Page ${pageIndex + 1} sauvegardée pour débogage: ${debugImagePath}`);
        
        const extractedText = await processDocumentWithVision(pagePdf);
        console.log(`Page ${pageIndex + 1}: ${extractedText.length} caractères extraits`);
        
        extractedTextByPage[`page_${pageIndex + 1}`] = {
          text: extractedText,
          debugImagePath
        };

        const { error: updateError } = await supabaseClient
          .from('documents')
          .update({
            status: 'processing',
            total_pages: totalPages,
            processed_at: new Date().toISOString(),
            extracted_text: extractedTextByPage
          })
          .eq('id', documentId);

        if (updateError) {
          throw new Error(`Erreur lors de la mise à jour pour la page ${pageIndex + 1}`);
        }

        if (pageIndex < totalPages - 1) {
          await delay(5000);
        }
      } catch (pageError) {
        console.error(`Erreur sur la page ${pageIndex + 1}:`, pageError);
        extractedTextByPage[`page_${pageIndex + 1}`] = {
          text: `Erreur: ${pageError.message}`
        };
      }
    }

    const now = new Date().toISOString();
    const { error: finalUpdateError } = await supabaseClient
      .from('documents')
      .update({
        status: 'completed',
        ocr_status: 'completed',
        ocr_completed_at: now,
        total_pages: totalPages,
        processed_at: now,
        extracted_text: extractedTextByPage
      })
      .eq('id', documentId);

    if (finalUpdateError) {
      throw finalUpdateError;
    }

    console.log('Traitement terminé avec succès');
    return new Response(
      JSON.stringify({
        success: true,
        message: 'Traitement du document terminé',
        pages: totalPages,
        extracted_text: extractedTextByPage
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
