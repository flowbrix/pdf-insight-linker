import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'
import { PDFDocument } from 'https://cdn.skypack.dev/pdf-lib@1.17.1'
import * as pdfjs from 'https://cdn.skypack.dev/pdfjs-dist@3.11.174'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Max-Age': '86400',
}

const pdfjsLib = pdfjs as any;
pdfjsLib.GlobalWorkerOptions = pdfjsLib.GlobalWorkerOptions || {};
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdn.skypack.dev/pdfjs-dist@3.11.174/build/pdf.worker.min.js`;

async function convertPDFPageToImage(pdfBytes: Uint8Array, pageNumber: number): Promise<Uint8Array> {
  const pdf = await pdfjsLib.getDocument({ data: pdfBytes }).promise;
  const page = await pdf.getPage(pageNumber);
  
  const scale = 2.0;
  const viewport = page.getViewport({ scale });
  
  const canvas = new OffscreenCanvas(viewport.width, viewport.height);
  const context = canvas.getContext('2d');
  
  if (!context) {
    throw new Error('Impossible de créer le contexte 2D');
  }
  
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  
  const renderContext = {
    canvasContext: context,
    viewport: viewport,
  };
  
  await page.render(renderContext).promise;
  
  const blob = await canvas.convertToBlob({ type: 'image/jpeg', quality: 0.8 });
  return new Uint8Array(await blob.arrayBuffer());
}

async function extractPagesFromPDF(pdfBytes: Uint8Array, maxPages: number = 10): Promise<Uint8Array[]> {
  console.log('Début de l\'extraction des pages du PDF');
  const pdfDoc = await PDFDocument.load(pdfBytes);
  const pages = pdfDoc.getPages();
  const totalPages = Math.min(pages.length, maxPages);
  console.log(`Nombre total de pages trouvées: ${pages.length}, pages à traiter: ${totalPages}`);
  
  const extractedPages: Uint8Array[] = [];
  for (let i = 0; i < totalPages; i++) {
    const pageImage = await convertPDFPageToImage(pdfBytes, i + 1);
    extractedPages.push(pageImage);
    console.log(`Page ${i + 1} convertie en image avec succès`);
  }
  
  return extractedPages;
}

serve(async (req) => {
  // Gestion simplifiée des CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const body = await req.json();
    const { documentId } = body;

    if (!documentId) {
      throw new Error('Document ID is required');
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Récupération du document
    const { data: document, error: docError } = await supabaseClient
      .from('documents')
      .select('*')
      .eq('id', documentId)
      .single();

    if (docError || !document) {
      throw new Error('Document not found');
    }

    // Téléchargement du PDF
    const { data: fileData, error: fileError } = await supabaseClient.storage
      .from('documents')
      .download(document.file_path);

    if (fileError) {
      throw fileError;
    }

    // Mise à jour du statut
    await supabaseClient
      .from('documents')
      .update({ status: 'processing' })
      .eq('id', documentId);

    // Conversion du PDF
    const pdfBytes = new Uint8Array(await fileData.arrayBuffer());
    const pages = await extractPagesFromPDF(pdfBytes);

    // Traitement réussi
    await supabaseClient
      .from('documents')
      .update({
        status: 'completed',
        processed: true,
        processed_at: new Date().toISOString(),
        total_pages: pages.length
      })
      .eq('id', documentId);

    return new Response(
      JSON.stringify({ 
        success: true,
        message: `Document processed successfully - ${pages.length} pages analyzed` 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );
  } catch (error) {
    console.error('Error:', error);
    
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: error.stack
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});
