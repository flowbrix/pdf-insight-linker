
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'
import { corsHeaders } from '../_shared/cors.ts'

interface DocumentData {
  documentId: string;
  extractedData: {
    liaison?: string;
    amorce_number?: string;
    cuve?: string;
    section_number?: string;
    equipment_number?: string;
    cable_type?: string;
    fibers?: string;
    scenario?: string;
    length_number?: string;
    metrage?: number;
    cote?: string;
    extremite_number?: string;
    extremite_sup_number?: string;
    extremite_inf_number?: string;
    segment?: string;
    cable_diameter?: number;
    machine?: string;
    recette?: string;
    plan_version?: string;
    activity_type?: string;
    plan_type?: string;
  };
}

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
    const body: DocumentData = await req.json()
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
        amorce_number: body.extractedData.amorce_number,
        cuve: body.extractedData.cuve,
        section_number: body.extractedData.section_number,
        equipment_number: body.extractedData.equipment_number,
        cable_type: body.extractedData.cable_type,
        fibers: body.extractedData.fibers,
        scenario: body.extractedData.scenario,
        length_number: body.extractedData.length_number,
        metrage: body.extractedData.metrage,
        cote: body.extractedData.cote,
        extremite_number: body.extractedData.extremite_number,
        extremite_sup_number: body.extractedData.extremite_sup_number,
        extremite_inf_number: body.extractedData.extremite_inf_number,
        segment: body.extractedData.segment,
        cable_diameter: body.extractedData.cable_diameter,
        machine: body.extractedData.machine,
        recette: body.extractedData.recette,
        plan_version: body.extractedData.plan_version,
        activity_type: body.extractedData.activity_type,
        plan_type: body.extractedData.plan_type,
        status: 'completed',
        processed_at: new Date().toISOString()
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
