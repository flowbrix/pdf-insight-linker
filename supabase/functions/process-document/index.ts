
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
    const regex = new RegExp(`${keyName}[\\s:]*([^\\n\\r]+)`, 'i');
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
    
    // On limite l'extraction aux 10 premières pages
    const numPages = Math.min(pdfDocument.numPages(), 10);
    for (let i = 1; i <= numPages; i++) {
      const page = await pdfDocument.getPage(i);
      pdfText += await page.text() + '\n';
    }
    
    console.log('Texte extrait :', pdfText.substring(0, 500) + '...') // Log des 500 premiers caractères

    // 4. Rechercher les valeurs pour chaque clé
    const extractedData = DATA_KEYS.map(key => {
      const value = findValueForKey(pdfText, key)
      console.log(`Recherche de ${key.name}: ${value || 'non trouvé'}`)
      return {
        key_name: key.name,
        extracted_value: value || 'Non trouvé',
        page_number: 1 // Note: même si on extrait de plusieurs pages, on garde 1 par défaut
      }
    })

    // 5. Sauvegarder les données extraites
    const { error: insertError } = await supabase
      .from('extracted_data')
      .insert(extractedData.map(data => ({
        document_id: documentId,
        ...data
      })))

    if (insertError) throw insertError

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
      JSON.stringify({ success: true, extractedData }),
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
