
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'
import { corsHeaders } from '../_shared/cors.ts'

interface DocumentData {
  documentId: string;
  fileUrl: string;
  fileName: string;
  extractedData: Record<string, string>;
  extracted_values: {
    "LIAISON"?: string;
    "N° AMORCE"?: string;
    "CUVE"?: string;
    "Section N°"?: string;
    "N° EQUIPEMENT"?: string;
    "TYPE DE CABLE"?: string;
    "FIBRES"?: string;
    "SCENARIO"?: string;
    "N° LONGUEUR"?: string;
    "MÉTRAGE"?: string;
    "CÔTÉ"?: string;
    "N° EXTREMITE"?: string;
    "N° EXTREMITE SUP"?: string;
    "N°0 EXTREMITE INF"?: string;
    "SEGMENT"?: string;
    "DIAMÈTRE CÂBLE"?: string;
    "Machine"?: string;
    "Recette"?: string;
    "Version Plan"?: string;
    "Type Activité"?: string;
    "Type de Plan"?: string;
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    if (req.method !== 'POST') {
      throw new Error('Méthode non autorisée')
    }

    const body: DocumentData = await req.json()
    console.log('Données complètes reçues du webhook:', JSON.stringify(body, null, 2))

    if (!body.documentId) {
      throw new Error('documentId est requis')
    }

    // Nettoyer et convertir les valeurs
    const cleanNumber = (value: string | undefined) => {
      if (!value) return null;
      // Extraire uniquement les chiffres et le point décimal
      const number = value.replace(/[^\d.]/g, '');
      return number ? parseFloat(number) : null;
    };

    const extractedValues = body.extracted_values || {};
    console.log('Valeurs extraites:', JSON.stringify(extractedValues, null, 2));

    const updateData = {
      liaison_id: null, // À gérer séparément si nécessaire
      amorce_number: extractedValues["N° AMORCE"],
      cuve: extractedValues["CUVE"],
      section_number: extractedValues["Section N°"],
      equipment_number: extractedValues["N° EQUIPEMENT"],
      cable_type: extractedValues["TYPE DE CABLE"],
      fibers: extractedValues["FIBRES"],
      scenario: extractedValues["SCENARIO"],
      length_number: extractedValues["N° LONGUEUR"],
      metrage: cleanNumber(extractedValues["MÉTRAGE"]),
      cote: extractedValues["CÔTÉ"],
      extremite_number: extractedValues["N° EXTREMITE"],
      extremite_sup_number: extractedValues["N° EXTREMITE SUP"],
      extremite_inf_number: extractedValues["N°0 EXTREMITE INF"],
      segment: extractedValues["SEGMENT"],
      cable_diameter: cleanNumber(extractedValues["DIAMÈTRE CÂBLE"]),
      machine: extractedValues["Machine"],
      recette: extractedValues["Recette"],
      plan_version: extractedValues["Version Plan"],
      activity_type: extractedValues["Type Activité"],
      plan_type: extractedValues["Type de Plan"],
      status: 'completed',
      processed_at: new Date().toISOString()
    };

    console.log('Données préparées pour la mise à jour:', JSON.stringify(updateData, null, 2));

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Mise à jour du document
    const { data, error } = await supabaseClient
      .from('documents')
      .update(updateData)
      .eq('id', body.documentId)
      .select();

    if (error) {
      console.error('Erreur lors de la mise à jour:', error);
      throw error;
    }

    console.log('Document mis à jour avec succès:', JSON.stringify(data, null, 2));

    return new Response(
      JSON.stringify({ success: true, data }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Erreur webhook:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
