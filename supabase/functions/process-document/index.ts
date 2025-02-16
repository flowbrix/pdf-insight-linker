
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'
import { PDFDocument } from 'https://cdn.skypack.dev/pdf-lib@1.17.1'
import * as pdfjs from 'https://cdn.skypack.dev/pdfjs-dist@3.11.174'

const baseHeaders = {
  'Content-Type': 'application/json',
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
  // Handler OPTIONS pour la compatibilité navigateur
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: baseHeaders });
  }

  try {
    console.log('Début du traitement de la requête');
    const body = await req.json();
    const { documentId } = body;

    if (!documentId) {
      console.error('Document ID manquant');
      return new Response(
        JSON.stringify({ error: 'Document ID is required' }), 
        { headers: baseHeaders, status: 400 }
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
        { headers: baseHeaders, status: 404 }
      );
    }

    console.log('Téléchargement du fichier:', document.file_path);
    const { data: fileData, error: fileError } = await supabaseClient.storage
      .from('documents')
      .download(document.file_path);

    if (fileError) {
      console.error('Erreur lors du téléchargement:', fileError);
      throw fileError;
    }

    console.log('Mise à jour du statut en processing');
    await supabaseClient
      .from('documents')
      .update({ status: 'processing' })
      .eq('id', documentId);

    console.log('Conversion du PDF en images');
    const pdfBytes = new Uint8Array(await fileData.arrayBuffer());
    const pages = await extractPagesFromPDF(pdfBytes);

    console.log('Mise à jour finale du document');
    await supabaseClient
      .from('documents')
      .update({
        status: 'completed',
        processed: true,
        processed_at: new Date().toISOString(),
        total_pages: pages.length
      })
      .eq('id', documentId);

    console.log('Traitement terminé avec succès');
    return new Response(
      JSON.stringify({ 
        success: true,
        message: `Document processed successfully - ${pages.length} pages analyzed` 
      }),
      { headers: baseHeaders }
    );
  } catch (error) {
    console.error('Erreur lors du traitement:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: error.stack
      }),
      { headers: baseHeaders, status: 500 }
    );
  }
});
