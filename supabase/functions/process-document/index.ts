import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'
import { PDFDocument } from 'https://cdn.skypack.dev/pdf-lib@1.17.1'
import { encode as base64Encode } from "https://deno.land/std@0.168.0/encoding/base64.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

async function extractPagesFromPDF(pdfBytes: Uint8Array, maxPages: number = 10): Promise<Uint8Array[]> {
  console.log('Début de l\'extraction des pages du PDF');
  const pdfDoc = await PDFDocument.load(pdfBytes);
  const pages = pdfDoc.getPages();
  const totalPages = Math.min(pages.length, maxPages);
  console.log(`Nombre total de pages trouvées: ${pages.length}, pages à traiter: ${totalPages}`);
  
  const extractedPages: Uint8Array[] = [];
  for (let i = 0; i < totalPages; i++) {
    const newPdf = await PDFDocument.create();
    const [copiedPage] = await newPdf.copyPages(pdfDoc, [i]);
    newPdf.addPage(copiedPage);
    const pageBytes = await newPdf.save();
    extractedPages.push(pageBytes);
    console.log(`Page ${i + 1} extraite avec succès`);
  }
  
  return extractedPages;
}

async function analyzeWithMistralVision(pdfBytes: Uint8Array): Promise<any> {
  try {
    console.log('Début de l\'analyse avec Mistral Vision');
    const base64PDF = base64Encode(pdfBytes);
    console.log('PDF converti en base64');
    
    const mistralApiKey = Deno.env.get("MISTRAL_API");
    if (!mistralApiKey) {
      throw new Error('Clé API Mistral manquante');
    }
    
    console.log('Envoi de la requête à Mistral API...');
    const response = await fetch("https://api.mistral.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${mistralApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "pixtral-large-latest",
        messages: [
          {
            role: "user",
            content: "Extrais toutes les paires clé:valeur que tu trouves dans cette image. Réponds uniquement avec un objet JSON contenant ces paires, sans aucun texte avant ou après, sans formatage markdown.\n" + base64PDF
          }
        ]
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Erreur de réponse Mistral API:', errorText);
      throw new Error(`Erreur Mistral API: ${errorText}`);
    }

    const result = await response.json();
    console.log('Réponse Mistral brute:', JSON.stringify(result, null, 2));

    // Nettoyer la réponse de Mistral
    let content = result.choices[0].message.content;
    // Supprimer les délimiteurs markdown ```json et ``` s'ils existent
    content = content.replace(/```json\n?/g, '').replace(/```\n?/g, '');
    // Nettoyer les espaces au début et à la fin
    content = content.trim();
    
    console.log('Contenu nettoyé:', content);
    
    try {
      const parsedContent = JSON.parse(content);
      console.log('Contenu parsé avec succès:', parsedContent);
      return parsedContent;
    } catch (parseError) {
      console.error('Erreur lors du parsing du contenu nettoyé:', parseError);
      throw new Error(`Impossible de parser la réponse JSON: ${parseError.message}`);
    }
  } catch (error) {
    console.error('Erreur dans analyzeWithMistralVision:', error);
    throw error;
  }
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    console.log('Début du traitement de la requête');
    const reqBody = await req.json();
    const { documentId } = reqBody;

    if (!documentId) {
      throw new Error('Document ID is required')
    }

    console.log('Traitement du document avec ID:', documentId);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // 1. Récupérer le document PDF depuis le storage
    console.log('Récupération des informations du document depuis la base de données...');
    const { data: document } = await supabase
      .from('documents')
      .select('file_path')
      .eq('id', documentId)
      .single();

    if (!document) {
      throw new Error('Document not found');
    }

    console.log('Téléchargement du fichier PDF depuis le storage...');
    const { data: pdfData, error: pdfError } = await supabase.storage
      .from('documents')
      .download(document.file_path);

    if (pdfError) {
      console.error('Erreur lors du téléchargement du PDF:', pdfError);
      throw pdfError;
    }

    // 2. Extraire les pages
    console.log('Conversion du PDF en bytes...');
    const pdfBytes = new Uint8Array(await pdfData.arrayBuffer());
    const pdfPages = await extractPagesFromPDF(pdfBytes);
    console.log(`Extraction réussie de ${pdfPages.length} pages du PDF`);

    // 3. Pour chaque page
    for (let i = 0; i < pdfPages.length; i++) {
      const pageNumber = i + 1;
      console.log(`Début du traitement de la page ${pageNumber}`);

      try {
        // Analyser avec Mistral Vision
        console.log(`Envoi de la page ${pageNumber} à Mistral Vision...`);
        const analysisResult = await analyzeWithMistralVision(pdfPages[i]);
        
        // Sauvegarder les résultats
        console.log(`Sauvegarde du contenu de la page ${pageNumber}...`);
        await supabase.from('document_pages').insert({
          document_id: documentId,
          page_number: pageNumber,
          text_content: JSON.stringify(analysisResult)
        });

        // Pour chaque paire clé:valeur trouvée
        try {
          console.log(`Analyse des données extraites de la page ${pageNumber}:`, analysisResult);
          for (const [key, value] of Object.entries(analysisResult)) {
            console.log(`Sauvegarde de la paire - Clé: ${key}, Valeur: ${value}`);
            await supabase.from('extracted_data').insert({
              document_id: documentId,
              key_name: key,
              extracted_value: value?.toString(),
              page_number: pageNumber
            });
          }
        } catch (e) {
          console.error(`Erreur lors du parsing des données de la page ${pageNumber}:`, e);
        }
      } catch (error) {
        console.error(`Erreur lors du traitement de la page ${pageNumber}:`, error);
        continue; // Continue avec la page suivante même si celle-ci échoue
      }
    }

    // Mettre à jour le document
    console.log('Mise à jour du statut du document...');
    await supabase
      .from('documents')
      .update({
        status: 'completed',
        processed: true,
        processed_at: new Date().toISOString(),
        total_pages: pdfPages.length
      })
      .eq('id', documentId);

    console.log('Traitement du document terminé avec succès');
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Document processed successfully - ${pdfPages.length} pages analyzed`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Erreur globale:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})
