
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

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

    // 3. Extraire le texte des premières pages (à implémenter avec une bibliothèque OCR)
    // Pour l'instant, on simule l'extraction avec des données de test
    const extractedData = DATA_KEYS.map((key, index) => ({
      key_name: key.name,
      extracted_value: `Valeur simulée pour ${key.name}`,
      page_number: Math.floor(index / 5) + 1 // Répartir les données sur les premières pages
    }))

    console.log('Données extraites:', extractedData)

    // 4. Sauvegarder les données extraites
    const { error: insertError } = await supabase
      .from('extracted_data')
      .insert(extractedData.map(data => ({
        document_id: documentId,
        ...data
      })))

    if (insertError) throw insertError

    // 5. Mettre à jour le statut du document
    const { error: updateError } = await supabase
      .from('documents')
      .update({
        processed: true,
        processed_at: new Date().toISOString(),
      })
      .eq('id', documentId)

    if (updateError) throw updateError

    return new Response(
      JSON.stringify({ success: true }),
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
