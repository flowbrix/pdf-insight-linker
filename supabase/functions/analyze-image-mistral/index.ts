
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { imageId } = await req.json()

    if (!imageId) {
      throw new Error('Image ID est requis')
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Récupérer les informations de l'image
    const { data: imageTest, error: imageError } = await supabaseClient
      .from('image_tests')
      .select('*')
      .eq('id', imageId)
      .single()

    if (imageError || !imageTest) {
      throw new Error('Image non trouvée')
    }

    // Obtenir l'URL publique de l'image
    const { data: { publicUrl } } = supabaseClient
      .storage
      .from('test-images')
      .getPublicUrl(imageTest.image_path)

    const mistralApiKey = Deno.env.get('MISTRAL_API')
    if (!mistralApiKey) {
      throw new Error('Clé API Mistral non configurée')
    }

    // Appel à l'API Mistral
    const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${mistralApiKey}`
      },
      body: JSON.stringify({
        model: "pixtral-large-latest",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Extrais tout le texte trouvé dans cette image"
              },
              {
                type: "image_url",
                image_url: publicUrl
              }
            ]
          }
        ],
        max_tokens: 300
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Erreur API Mistral: ${errorText}`)
    }

    const result = await response.json()
    const extractedText = result.choices[0]?.message?.content

    // Mise à jour du résultat dans la base de données
    const { error: updateError } = await supabaseClient
      .from('image_tests')
      .update({
        extracted_text: extractedText,
        status: 'completed'
      })
      .eq('id', imageId)

    if (updateError) {
      throw updateError
    }

    return new Response(
      JSON.stringify({ success: true, extractedText }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Erreur:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
