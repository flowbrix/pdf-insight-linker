
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'
import { corsHeaders } from '../_shared/cors.ts'

Deno.serve(async (req) => {
  // Gestion du pre-flight CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Vérification de la méthode
    if (req.method !== 'POST') {
      throw new Error('Méthode non autorisée')
    }

    // Récupération et validation du body
    const body = await req.json()
    console.log('Données reçues du webhook:', body)

    if (!body.documentId || !body.extractedData) {
      throw new Error('Données manquantes: documentId et extractedData sont requis')
    }

    // Création du client Supabase
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Mise à jour du document avec les données extraites
    const { data, error } = await supabaseClient
      .from('documents')
      .update({
        extracted_text: body.extractedData,
        status: 'completed',
        processed_at: new Date().toISOString(),
      })
      .eq('id', body.documentId)
      .select()

    if (error) {
      console.error('Erreur lors de la mise à jour:', error)
      throw error
    }

    console.log('Document mis à jour avec succès:', data)

    return new Response(
      JSON.stringify({ success: true, data }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('Erreur webhook:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})
