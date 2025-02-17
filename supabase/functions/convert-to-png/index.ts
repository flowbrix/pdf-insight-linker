
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'
import * as pdfjsLib from 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.min.js'

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

    try {
      // Configuration de PDF.js
      const data = new Uint8Array(await pdfFile.arrayBuffer())
      
      // Charger le PDF
      const loadingTask = pdfjsLib.getDocument({ data })
      const pdf = await loadingTask.promise
      
      // Récupérer la première page
      const page = await pdf.getPage(1)
      const viewport = page.getViewport({ scale: 1.0 })
      
      console.log(`Dimensions de la page: ${viewport.width}x${viewport.height}`)

      // Préparer le canvas pour le rendu
      const canvas = new OffscreenCanvas(viewport.width, viewport.height)
      const context = canvas.getContext('2d')
      
      // Configurer le contexte de rendu
      const renderContext = {
        canvasContext: context,
        viewport: viewport
      }

      // Rendre la page
      await page.render(renderContext).promise
      
      // Convertir le canvas en PNG
      const pngBlob = await canvas.convertToBlob({ type: 'image/png' })
      const pngBuffer = await pngBlob.arrayBuffer()

      // Générer le chemin du fichier PNG
      const pngPath = pdfPath.replace('.pdf', '.png')

      // Upload du PNG
      const { error: uploadError } = await supabase.storage
        .from('document_pages')
        .upload(pngPath, pngBuffer, {
          contentType: 'image/png',
          upsert: true
        })

      if (uploadError) {
        throw new Error(`Erreur lors de l'upload du PNG: ${uploadError.message}`)
      }

      // Mettre à jour le statut
      await supabase
        .from('document_pages')
        .update({ 
          png_conversion_status: 'completed',
          png_path: pngPath
        })
        .eq('id', pageId)

      console.log(`Conversion en PNG réussie pour la page ${pageId}`)

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Conversion en PNG réussie',
          png_path: pngPath,
          dimensions: {
            width: viewport.width,
            height: viewport.height
          }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )

    } catch (conversionError) {
      console.error('Erreur lors de la conversion:', conversionError)
      throw conversionError
    }

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
