import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imageBase64, options = {} } = await req.json();
    
    if (!imageBase64) {
      throw new Error('No image data provided');
    }

    console.log('Starting Stable3DGen (Trellis) generation using fal.ai');
    
    // Use Stable3DGen (Trellis) from fal.ai
    const result = await generateStable3DGen(imageBase64, options);
    
    if (result.success) {
      return new Response(JSON.stringify({
        success: true,
        method: 'Stable3DGen (Trellis)',
        result: result.data,
        format: 'glb'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } else {
      throw new Error(result.error || 'Stable3DGen generation failed');
    }

  } catch (error) {
    console.error('Error in Stable3DGen conversion:', error);
    return new Response(JSON.stringify({ 
      success: false,
      error: error instanceof Error ? error.message : 'An error occurred'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

// Generate 3D model using Stable3DGen (Trellis) from fal.ai
async function generateStable3DGen(imageBase64: string, options: any) {
  const FAL_AI_API_KEY = Deno.env.get('FAL_AI_API_KEY');
  
  if (!FAL_AI_API_KEY) {
    throw new Error('FAL_AI_API_KEY is not configured');
  }

  console.log('Using fal.ai Trellis API for 3D generation');

  try {
    // Convert base64 to data URI for fal.ai
    const imageDataUri = `data:image/png;base64,${imageBase64}`;

    // Submit request to fal.ai Trellis API
    const response = await fetch('https://queue.fal.run/fal-ai/trellis', {
      method: 'POST',
      headers: {
        'Authorization': `Key ${FAL_AI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        image_url: imageDataUri,
        format: "glb",
        preprocess: true
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Trellis API error: ${response.status} - ${errorText}`);
    }

    const submissionResult = await response.json();
    const requestId = submissionResult.request_id;
    
    console.log('Trellis request submitted, ID:', requestId);

    // Poll for completion
    let result;
    let attempts = 0;
    const maxAttempts = 60; // 5 minutes with 5-second intervals
    
    while (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds
      
      const statusResponse = await fetch(`https://queue.fal.run/fal-ai/trellis/requests/${requestId}`, {
        headers: {
          'Authorization': `Key ${FAL_AI_API_KEY}`,
        }
      });
      
      if (!statusResponse.ok) {
        throw new Error(`Status check failed: ${statusResponse.status}`);
      }
      
      const statusResult = await statusResponse.json();
      console.log('Trellis status:', statusResult.status);
      
      if (statusResult.status === 'COMPLETED') {
        result = statusResult;
        break;
      } else if (statusResult.status === 'FAILED') {
        throw new Error(`Trellis generation failed: ${statusResult.error}`);
      }
      
      attempts++;
    }
    
    if (!result) {
      throw new Error('Trellis generation timed out');
    }

    // Download the GLB file and convert to base64
    const glbUrl = result.data.model.url;
    console.log('Downloading GLB from:', glbUrl);
    
    const glbResponse = await fetch(glbUrl);
    if (!glbResponse.ok) {
      throw new Error(`Failed to download GLB: ${glbResponse.status}`);
    }
    
    const glbArrayBuffer = await glbResponse.arrayBuffer();
    const glbBase64 = btoa(String.fromCharCode(...new Uint8Array(glbArrayBuffer)));
    
    return {
      success: true,
      data: {
        glb_data: glbBase64,
        model_type: 'Stable3DGen (Trellis)',
        file_size: result.data.model.file_size
      }
    };

  } catch (error) {
    console.error('Stable3DGen generation error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Generation failed'
    };
  }
}