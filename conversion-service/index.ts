
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function convertPdfToImage(inputPath: string): Promise<Uint8Array> {
  // Utilisation de pdftoppm via le shell
  const process = new Deno.Command("pdftoppm", {
    args: ["-png", inputPath, "output"],
  });

  const { code, stdout, stderr } = await process.output();

  if (code !== 0) {
    throw new Error(`Erreur lors de la conversion: ${new TextDecoder().decode(stderr)}`);
  }

  // Lire le fichier PNG généré
  const pngData = await Deno.readFile("output-1.png");
  
  // Nettoyer les fichiers temporaires
  await Deno.remove("output-1.png");
  
  return pngData;
}

serve(async (req) => {
  // Gérer les requêtes CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const payload = await req.json();
    const { jobId, pageId, inputPath } = payload;

    console.log(`Début du traitement du job ${jobId} pour la page ${pageId}`);

    // Initialiser le client Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    try {
      // Télécharger le PDF depuis Supabase Storage
      const { data: pdfData, error: downloadError } = await supabase
        .storage
        .from('documents')
        .download(inputPath);

      if (downloadError) {
        throw new Error(`Erreur lors du téléchargement du PDF: ${downloadError.message}`);
      }

      // Sauvegarder temporairement le PDF
      await Deno.writeFile("input.pdf", new Uint8Array(await pdfData.arrayBuffer()));

      // Convertir le PDF en PNG
      const pngData = await convertPdfToImage("input.pdf");

      // Nettoyer le fichier PDF temporaire
      await Deno.remove("input.pdf");

      // Générer le chemin de sortie
      const outputPath = inputPath.replace('.pdf', '.png');

      // Uploader le PNG dans Supabase Storage
      const { error: uploadError } = await supabase
        .storage
        .from('documents')
        .upload(outputPath, pngData, {
          contentType: 'image/png',
          upsert: true
        });

      if (uploadError) {
        throw new Error(`Erreur lors de l'upload du PNG: ${uploadError.message}`);
      }

      // Mettre à jour le statut du job
      await supabase
        .from('conversion_jobs')
        .update({
          status: 'completed',
          output_path: outputPath
        })
        .eq('id', jobId);

      // Mettre à jour le statut de la page
      await supabase
        .from('document_pages')
        .update({
          png_conversion_status: 'completed',
          png_path: outputPath
        })
        .eq('id', pageId);

      console.log(`Conversion réussie pour le job ${jobId}`);

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Conversion terminée avec succès',
          outputPath
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } catch (error) {
      console.error(`Erreur lors de la conversion:`, error);

      // Mettre à jour les statuts en erreur
      await supabase
        .from('conversion_jobs')
        .update({
          status: 'error',
          error_message: error.message
        })
        .eq('id', jobId);

      await supabase
        .from('document_pages')
        .update({
          png_conversion_status: 'error'
        })
        .eq('id', pageId);

      throw error;
    }

  } catch (error) {
    console.error('Erreur générale:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});
