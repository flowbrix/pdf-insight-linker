
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

    try {
      // Créer un fichier temporaire pour le PDF
      const tempPdfPath = `/tmp/${documentId}_${pageId}.pdf`
      await Deno.writeFile(tempPdfPath, new Uint8Array(await pdfFile.arrayBuffer()))

      // Créer le répertoire de sortie
      const outputDir = `/tmp/${documentId}`
      await Deno.mkdir(outputDir, { recursive: true })

      // Utiliser pdftoppm (de Poppler) pour la conversion
      const process = new Deno.Command("pdftoppm", {
        args: [
          "-png",
          "-r", "300",  // 300 DPI
          tempPdfPath,
          `${outputDir}/page`
        ],
      });

      const { code, stdout, stderr } = await process.output()

      if (code !== 0) {
        const errorOutput = new TextDecoder().decode(stderr)
        throw new Error(`Erreur lors de la conversion: ${errorOutput}`)
      }

      // Lire le fichier PNG généré
      const pngPath = `${outputDir}/page-1.png`
      const pngData = await Deno.readFile(pngPath)

      // Générer le chemin de stockage pour le PNG
      const storagePngPath = pdfPath.replace('.pdf', '.png')

      // Upload du PNG
      const { error: uploadError } = await supabase.storage
        .from('document_pages')
        .upload(storagePngPath, pngData, {
          contentType: 'image/png',
          upsert: true
        })

      if (uploadError) {
        throw new Error(`Erreur lors de l'upload du PNG: ${uploadError.message}`)
      }

      // Nettoyer les fichiers temporaires
      await Deno.remove(tempPdfPath)
      await Deno.remove(pngPath)
      await Deno.remove(outputDir, { recursive: true })

      // Mettre à jour le statut
      await supabase
        .from('document_pages')
        .update({ 
          png_conversion_status: 'completed',
          png_path: storagePngPath
        })
        .eq('id', pageId)

      console.log(`Conversion en PNG réussie pour la page ${pageId}`)

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Conversion en PNG réussie',
          png_path: storagePngPath
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
