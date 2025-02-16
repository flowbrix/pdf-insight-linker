
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'
import * as pdf from "https://deno.land/x/pdf@v0.1.0/mod.ts"

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
    // Amélioration de la regex pour capturer le texte jusqu'à la fin de la ligne ou jusqu'au prochain label
    const regex = new RegExp(`${keyName}[\\s:]*([^\\n\\r]+?)(?=\\s*(?:${DATA_KEYS.map(k => k.alternativeNames[0]).join('|')})|$)`, 'i');
    const match = text.match(regex);
    if (match && match[1]) {
      return match[1].trim();
    }
  }
  return null;
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

    if (documentError) throw documentError

    // 2. Télécharger le fichier PDF depuis le bucket
    const { data: fileData, error: downloadError } = await supabase
      .storage
      .from('documents')
      .download(document.file_path)

    if (downloadError) throw downloadError

    // 3. Extraire le texte du PDF
    console.log('Début de l\'extraction du texte...')
    const pdfDocument = await pdf.default(fileData)
    let pdfText = '';
    
    // Limiter l'extraction aux 10 premières pages
    const totalPages = pdfDocument.numPages();
    const numPages = Math.min(totalPages, 10);
    console.log(`Traitement des ${numPages} premières pages sur un total de ${totalPages} pages`);
    
    for (let i = 1; i <= numPages; i++) {
      console.log(`Traitement de la page ${i}/${numPages}`);
      const page = await pdfDocument.getPage(i);
      const pageText = await page.text();
      pdfText += pageText + '\n';
      console.log(`Texte extrait de la page ${i} :`, pageText.substring(0, 200) + '...');
    }
    
    console.log('Texte complet extrait:', pdfText.substring(0, 500) + '...');

    // 4. Rechercher les valeurs pour chaque clé
    const extractedData = DATA_KEYS.map(key => {
      const value = findValueForKey(pdfText, key);
      console.log(`Recherche de ${key.name}: ${value || 'non trouvé'}`);
      return {
        key_name: key.name,
        extracted_value: value || null,
        page_number: 1
      }
    }).filter(data => data.extracted_value !== null);

    // 5. Sauvegarder les données extraites
    if (extractedData.length > 0) {
      const { error: insertError } = await supabase
        .from('extracted_data')
        .insert(extractedData.map(data => ({
          document_id: documentId,
          ...data
        })))

      if (insertError) throw insertError

      console.log(`${extractedData.length} données extraites sauvegardées avec succès`);
    } else {
      console.log('Aucune donnée n\'a pu être extraite du document');
    }

    // 6. Mettre à jour le statut du document
    const { error: updateError } = await supabase
      .from('documents')
      .update({
        processed: true,
        processed_at: new Date().toISOString(),
      })
      .eq('id', documentId)

    if (updateError) throw updateError

    return new Response(
      JSON.stringify({ 
        success: true, 
        extractedData,
        message: `${extractedData.length} données extraites avec succès`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Erreur:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})
