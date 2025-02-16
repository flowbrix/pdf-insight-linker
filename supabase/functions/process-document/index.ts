
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'
import { PDFDocument } from 'https://cdn.skypack.dev/pdf-lib@1.17.1'

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

async function analyzeWithMistralVision(imageUrl: string): Promise<any> {
  try {
    console.log('Début de l\'analyse avec Mistral Vision pour l\'URL:', imageUrl);
    
    const mistralApiKey = Deno.env.get("MISTRAL_API");
    if (!mistralApiKey) {
      throw new Error('Clé API Mistral manquante');
    }

    const response = await fetch("https://api.mistral.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${mistralApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "pixtral-12b-2409",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Extract the values of the following keys from the document: LIAISON, N° AMORCE, CUVE (also named Emission), Section N°, B.J. N°, B.E. N°, or BU. N° (identify as N° EQUIPEMENT), TYPE DE CABLE (can be found as Type Câble), FIBRES, SCENARIO, N° LONGUEUR (can be found as LG 1), METRAGE, COTE, N° EXTREMITE, SEGMENT, DIAMETRE CABLE, Machine, Recette, Version Plan, Type activité, Type de Plan, title. If there are multiple inputs for a value, use the most accurate one. Structure the output in JSON format."
              },
              {
                type: "image_url",
                image_url: imageUrl
              }
            ]
          }
        ],
        max_tokens: 1000
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Erreur de réponse Mistral API:', errorText);
      throw new Error(`Erreur Mistral API: ${errorText}`);
    }

    const result = await response.json();
    console.log('Réponse Mistral reçue');
    
    let content = result.choices[0].message.content;
    content = content.replace(/```json\n?/g, '').replace(/```\n?/g, '');
    content = content.trim();
    
    try {
      const parsedContent = JSON.parse(content);
      return parsedContent;
    } catch (parseError) {
      console.error('Erreur lors du parsing du contenu:', parseError);
      throw new Error(`Impossible de parser la réponse JSON: ${parseError.message}`);
    }
  } catch (error) {
    console.error('Erreur dans analyzeWithMistralVision:', error);
    throw error;
  }
}

serve(async (req) => {
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
    const baseUrl = Deno.env.get('SUPABASE_URL');
    for (let i = 0; i < pdfPages.length; i++) {
      const pageNumber = i + 1;
      console.log(`Début du traitement de la page ${pageNumber}`);

      try {
        // Générer un nom de fichier unique pour l'image
        const imagePath = `${documentId}/${pageNumber}.pdf`;
        console.log(`Uploading page ${pageNumber} vers ${imagePath}`);

        // Upload de la page PDF
        const { error: uploadError } = await supabase.storage
          .from('temp_images')
          .upload(imagePath, pdfPages[i], {
            contentType: 'application/pdf',
            upsert: true
          });

        if (uploadError) {
          console.error(`Erreur lors de l'upload de la page ${pageNumber}:`, uploadError);
          throw uploadError;
        }

        // Construire l'URL publique
        const publicUrl = `${baseUrl}/storage/v1/object/public/temp_images/${imagePath}`;
        console.log(`URL publique générée pour la page ${pageNumber}:`, publicUrl);

        // Analyser avec Mistral Vision
        console.log(`Envoi de la page ${pageNumber} à Mistral Vision...`);
        const analysisResult = await analyzeWithMistralVision(publicUrl);
        
        // Sauvegarder les résultats
        console.log(`Sauvegarde du contenu de la page ${pageNumber}...`);
        await supabase.from('document_pages').insert({
          document_id: documentId,
          page_number: pageNumber,
          image_path: imagePath,
          text_content: JSON.stringify(analysisResult)
        });

        // Pour chaque paire clé:valeur trouvée
        for (const [key, value] of Object.entries(analysisResult)) {
          if (value) {
            console.log(`Sauvegarde de la donnée - Clé: ${key}, Valeur: ${value}`);
            await supabase.from('extracted_data').insert({
              document_id: documentId,
              key_name: key,
              extracted_value: value.toString(),
              page_number: pageNumber
            });
          }
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
