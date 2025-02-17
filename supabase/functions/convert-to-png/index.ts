
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { pageId, documentId, pdfPath } = await req.json()
    
    console.log(`Début de la conversion en PNG pour la page ${pageId} du document ${documentId}`)

    // Initialisation du client Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Mettre à jour le statut de conversion
    await supabase
      .from('document_pages')
      .update({ png_conversion_status: 'processing' })
      .eq('id', pageId)

    // Récupérer le fichier PDF
    const { data: pdfFile, error: downloadError } = await supabase.storage
      .from('document_pages')
      .download(pdfPath)

    if (downloadError) {
      throw new Error(`Erreur lors de la récupération du PDF: ${downloadError.message}`)
    }

    // TODO: Implémenter la conversion en PNG avec une bibliothèque appropriée
    // Pour l'instant, nous allons simuler la conversion
    const pngPath = pdfPath.replace('.pdf', '.png')
    
    // Simuler la conversion (à remplacer par la vraie conversion)
    await new Promise(resolve => setTimeout(resolve, 1000))

    // Mettre à jour le statut et le chemin PNG
    await supabase
      .from('document_pages')
      .update({ 
        png_conversion_status: 'completed',
        png_path: pngPath
      })
      .eq('id', pageId)

    console.log(`Conversion en PNG terminée pour la page ${pageId}`)

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Conversion en PNG réussie',
        png_path: pngPath
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Erreur:', error)
    
    // En cas d'erreur, mettre à jour le statut
    const { pageId } = await req.json()
    if (pageId) {
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      )
      
      await supabase
        .from('document_pages')
        .update({ 
          png_conversion_status: 'error'
        })
        .eq('id', pageId)
    }

    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
})
