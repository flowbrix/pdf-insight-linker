
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'
import { PDFDocument } from 'https://cdn.skypack.dev/pdf-lib@1.17.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

async function extractPagesFromPDF(pdfBytes: Uint8Array, maxPages: number = 10): Promise<Uint8Array[]> {
  const pdfDoc = await PDFDocument.load(pdfBytes);
  const pages = pdfDoc.getPages();
  const totalPages = Math.min(pages.length, maxPages);
  
  const extractedPages: Uint8Array[] = [];
  for (let i = 0; i < totalPages; i++) {
    const newPdf = await PDFDocument.create();
    const [copiedPage] = await newPdf.copyPages(pdfDoc, [i]);
    newPdf.addPage(copiedPage);
    const pageBytes = await newPdf.save();
    extractedPages.push(pageBytes);
  }
  
  return extractedPages;
}

async function convertPDFPageToImage(pdfBytes: Uint8Array): Promise<Uint8Array> {
  // Utiliser pdf2img pour convertir le PDF en image
  // Note: Cette partie nécessite l'installation de pdf2img dans l'environnement Deno
  const command = new Deno.Command("convert", {
    args: ["-density", "300", "pdf:-", "jpg:-"],
    stdin: "piped",
    stdout: "piped",
  });
  
  const process = command.spawn();
  const writer = process.stdin.getWriter();
  await writer.write(pdfBytes);
  await writer.close();
  
  const { stdout } = await process.output();
  return stdout;
}

async function analyzeWithMistralVision(imageBytes: Uint8Array): Promise<any> {
  const response = await fetch("https://api.mistral.ai/v1/vision", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${Deno.env.get("MISTRAL_API_KEY")}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "mistral-medium",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Extrais toutes les paires clé:valeur que tu trouves dans cette image. Réponds uniquement avec un objet JSON contenant ces paires."
            },
            {
              type: "image",
              data: imageBytes.toString('base64')
            }
          ]
        }
      ]
    })
  });

  if (!response.ok) {
    throw new Error(`Erreur Mistral API: ${await response.text()}`);
  }

  return await response.json();
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { documentId } = await req.json()

    if (!documentId) {
      throw new Error('Document ID is required')
    }

    console.log('Processing document with ID:', documentId);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // 1. Récupérer le document PDF depuis le storage
    const { data: document } = await supabase
      .from('documents')
      .select('file_path')
      .eq('id', documentId)
      .single();

    if (!document) {
      throw new Error('Document not found');
    }

    const { data: pdfData, error: pdfError } = await supabase.storage
      .from('documents')
      .download(document.file_path);

    if (pdfError) {
      throw pdfError;
    }

    // 2. Extraire les 10 premières pages
    const pdfPages = await extractPagesFromPDF(new Uint8Array(await pdfData.arrayBuffer()));
    console.log(`Extracted ${pdfPages.length} pages from PDF`);

    // 3. Pour chaque page
    for (let i = 0; i < pdfPages.length; i++) {
      const pageNumber = i + 1;
      console.log(`Processing page ${pageNumber}`);

      // Convertir en image
      const imageBytes = await convertPDFPageToImage(pdfPages[i]);
      
      // Sauvegarder l'image
      const imagePath = `${documentId}/${pageNumber}.jpg`;
      const { error: uploadError } = await supabase.storage
        .from('document-pages')
        .upload(imagePath, imageBytes);

      if (uploadError) {
        throw uploadError;
      }

      // Analyser avec Mistral Vision
      const analysisResult = await analyzeWithMistralVision(imageBytes);

      // Sauvegarder les résultats
      await supabase.from('document_pages').insert({
        document_id: documentId,
        page_number: pageNumber,
        image_path: imagePath,
        text_content: JSON.stringify(analysisResult)
      });

      // Pour chaque paire clé:valeur trouvée
      const extractedData = analysisResult.choices[0].message.content;
      try {
        const keyValuePairs = JSON.parse(extractedData);
        for (const [key, value] of Object.entries(keyValuePairs)) {
          await supabase.from('extracted_data').insert({
            document_id: documentId,
            key_name: key,
            extracted_value: value?.toString(),
            page_number: pageNumber
          });
        }
      } catch (e) {
        console.error('Error parsing Mistral response:', e);
      }
    }

    // Mettre à jour le document
    await supabase
      .from('documents')
      .update({
        status: 'completed',
        processed: true,
        processed_at: new Date().toISOString(),
        total_pages: pdfPages.length
      })
      .eq('id', documentId);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Document processed successfully - ${pdfPages.length} pages analyzed`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})
