
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'
import { spawn } from "https://deno.land/std@0.177.0/node/child_process.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { documentId } = await req.json()

    if (!documentId) {
      throw new Error('Document ID is required')
    }

    console.log('Processing document with ID:', documentId);

    // Créer un processus Python
    const process = spawn('python3', ['process.py', documentId]);

    let output = '';
    let error = '';

    // Capturer la sortie standard
    for await (const chunk of process.stdout) {
      output += new TextDecoder().decode(chunk);
    }

    // Capturer les erreurs
    for await (const chunk of process.stderr) {
      error += new TextDecoder().decode(chunk);
    }

    // Attendre la fin du processus
    const status = await process.status();

    if (!status.success) {
      throw new Error(`Python process failed: ${error}`);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Document processed successfully`, 
        data: output 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})
