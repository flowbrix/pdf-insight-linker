
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'
import { PDFDocument } from "https://cdn.skypack.dev/pdf-lib@1.17.1?dts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const DATA_KEYS = [
  { name: 'LIAISON', alternativeNames: ['LIAISON'] },
  { name: 'N° AMORCE', alternativeNames: ['N° AMORCE', 'NUMERO AMORCE'] },
  { name: 'CUVE', alternativeNames: ['CUVE', 'Emission'] },
  { name: 'Section N°', alternativeNames: ['Section N°', 'SECTION N°'] },
  { name: 'N° EQUIPEMENT', alternativeNames: ['B.J. N°', 'B.E. N°', 'BU. N°'] },
  { name: 'TYPE DE CABLE', alternativeNames: ['TYPE DE CABLE', 'Type Câble'] },
  { name: 'FIBRES', alternativeNames: ['FIBRES'] },
  { name: 'SCENARIO', alternativeNames: ['SCENARIO'] },
  { name: 'N°LONGUEUR', alternativeNames: ['N°LONGUEUR', 'LG 1'] },
  { name: 'METRAGE', alternativeNames: ['METRAGE'] },
  { name: 'COTE', alternativeNames: ['COTE'] },
  { name: 'N° EXTREMITE', alternativeNames: ['N° EXTREMITE'] },
  { name: 'SEGMENT', alternativeNames: ['SEGMENT'] },
  { name: 'DIAMETRE CABLE', alternativeNames: ['DIAMETRE CABLE'] },
  { name: 'Machine', alternativeNames: ['Machine'] },
  { name: 'Recette', alternativeNames: ['Recette'] },
  { name: 'Version Plan', alternativeNames: ['Version Plan'] },
  { name: 'Type activité', alternativeNames: ['Type activité'] },
  { name: 'Type de Plan', alternativeNames: ['Type de Plan'] }
]

function findValueForKey(text: string, key: { name: string, alternativeNames: string[] }): string | null {
  for (const keyName of key.alternativeNames) {
    const regex = new RegExp(`${keyName}[\\s:]*([^\\n\\r]+?)(?=\\s*(?:${DATA_KEYS.map(k => k.alternativeNames[0]).join('|')})|$)`, 'i');
    const match = text.match(regex);
    if (match && match[1]) {
      return match[1].trim();
    }
  }
  return null;
}

async function extractTextWithTesseract(pdfBytes: Uint8Array): Promise<string> {
  try {
    console.log('Loading Tesseract worker directly...');
    
    // Créer un polyfill minimal pour document
    // @ts-ignore: Ajout de document global pour Tesseract
    globalThis.document = {
      currentScript: { src: '' },
      createElement: () => ({
        setAttribute: () => {},
        style: {},
        addEventListener: () => {},
        removeEventListener: () => {},
      }),
    };
    
    const { createWorker } = await import('https://cdn.skypack.dev/tesseract.js@2.1.5?dts');
    
    console.log('Creating worker with minimal configuration...');
    const worker = await createWorker({
      workerPath: 'https://unpkg.com/tesseract.js@2.1.5/dist/worker.min.js',
      corePath: 'https://unpkg.com/tesseract.js-core@2.1.5/tesseract-core.wasm.js',
      langPath: 'https://tessdata.projectnaptha.com/4.0.0',
    });

    console.log('Loading French language data...');
    await worker.loadLanguage('fra');
    await worker.initialize('fra');
    
    console.log('Worker initialized successfully');

    const pdfDoc = await PDFDocument.load(pdfBytes);
    const pages = pdfDoc.getPages();
    const maxPages = Math.min(pages.length, 10);
    
    let extractedText = '';
    
    for (let i = 0; i < maxPages; i++) {
      console.log(`Processing page ${i + 1}/${maxPages}`);
      const page = pages[i];
      const { width, height } = page.getSize();
      
      const pngImage = await page.toPng({
        width: Math.min(width * 2, 4000),
        height: Math.min(height * 2, 4000)
      });
      
      try {
        console.log(`Starting OCR for page ${i + 1}...`);
        const { data: { text } } = await worker.recognize(pngImage);
        console.log(`OCR completed for page ${i + 1}`);
        extractedText += text + '\n';
        console.log(`Text sample from page ${i + 1}:`, text.substring(0, 100));
      } catch (pageError) {
        console.error(`Error processing page ${i + 1}:`, pageError);
      }
    }
    
    console.log('Terminating worker...');
    await worker.terminate();
    
    // Nettoyer le polyfill
    // @ts-ignore: Suppression du document global
    delete globalThis.document;
    
    return extractedText;
  } catch (error) {
    console.error('Fatal error in text extraction:', error);
    throw new Error(`Text extraction failed: ${error.message}`);
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { documentId } = await req.json()

    if (!documentId) {
      throw new Error('Document ID is required')
    }

    console.log('Processing document:', documentId);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { data: document, error: documentError } = await supabase
      .from('documents')
      .select('*')
      .eq('id', documentId)
      .single()

    if (documentError) {
      console.error('Error fetching document:', documentError);
      throw documentError;
    }

    console.log('Document found:', document.file_name);

    const { data: fileData, error: downloadError } = await supabase
      .storage
      .from('documents')
      .download(document.file_path)

    if (downloadError) {
      console.error('Error downloading file:', downloadError);
      throw downloadError;
    }

    console.log('File downloaded successfully');

    const arrayBuffer = await fileData.arrayBuffer();
    const pdfBytes = new Uint8Array(arrayBuffer);
    console.log('PDF bytes loaded:', pdfBytes.length, 'bytes');

    const pdfText = await extractTextWithTesseract(pdfBytes);
    console.log('Extracted text sample:', pdfText.substring(0, 500));

    const extractedData = DATA_KEYS.map(key => {
      const value = findValueForKey(pdfText, key);
      console.log(`Searching for ${key.name}: ${value || 'not found'}`);
      return {
        key_name: key.name,
        extracted_value: value || null,
        page_number: 1
      }
    }).filter(data => data.extracted_value !== null);

    console.log(`Found ${extractedData.length} data points`);

    if (extractedData.length > 0) {
      const { error: insertError } = await supabase
        .from('extracted_data')
        .insert(extractedData.map(data => ({
          document_id: documentId,
          ...data
        })))

      if (insertError) {
        console.error('Error inserting extracted data:', insertError);
        throw insertError;
      }

      console.log(`${extractedData.length} data points saved successfully`);
    } else {
      console.log('No data could be extracted from the document');
    }

    const { error: updateError } = await supabase
      .from('documents')
      .update({
        processed: true,
        processed_at: new Date().toISOString(),
      })
      .eq('id', documentId)

    if (updateError) {
      console.error('Error updating document status:', updateError);
      throw updateError;
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        extractedData,
        message: `${extractedData.length} données extraites avec succès`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Fatal error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})
