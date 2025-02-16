
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

function extractTextFromPdf(pdfBytes: Uint8Array): string {
  // Pour l'instant, nous allons simuler l'extraction de texte
  // car pdf-lib ne supporte pas directement l'extraction de texte
  // Nous implémenterons une solution plus robuste plus tard
  return new TextDecoder().decode(pdfBytes);
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

    // 1. Récupérer les informations du document
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

    // 2. Télécharger le fichier PDF depuis le bucket
    const { data: fileData, error: downloadError } = await supabase
      .storage
      .from('documents')
      .download(document.file_path)

    if (downloadError) {
      console.error('Error downloading file:', downloadError);
      throw downloadError;
    }

    console.log('File downloaded successfully');

    // 3. Extraire le texte du PDF
    const arrayBuffer = await fileData.arrayBuffer();
    const pdfBytes = new Uint8Array(arrayBuffer);
    console.log('PDF bytes loaded:', pdfBytes.length, 'bytes');

    // Charger le PDF avec pdf-lib
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const numPages = pdfDoc.getPageCount();
    console.log(`Document has ${numPages} pages`);

    // Extraire le texte
    let pdfText = extractTextFromPdf(pdfBytes);
    console.log('Extracted text sample:', pdfText.substring(0, 200));

    // 4. Rechercher les valeurs pour chaque clé
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

    // 5. Sauvegarder les données extraites
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

    // 6. Mettre à jour le statut du document
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
