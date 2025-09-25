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

    console.log('Starting Hunyuan3D-2.0 generation using real Tencent model');
    
    // Use real Hunyuan3D-2.0 from fal.ai
    const result = await generateHunyuan3D(imageBase64, options);
    
    if (result.success) {
      return new Response(JSON.stringify({
        success: true,
        method: 'Hunyuan3D-2.0 (Tencent)',
        result: result.data,
        format: 'glb'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } else {
      throw new Error(result.error || 'Hunyuan3D-2.0 generation failed');
    }

  } catch (error) {
    console.error('Error in Hunyuan3D-2.0 conversion:', error);
    return new Response(JSON.stringify({ 
      success: false,
      error: error instanceof Error ? error.message : 'An error occurred'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

// Generate 3D model using real Hunyuan3D-2.0 from fal.ai
async function generateHunyuan3D(imageBase64: string, options: any) {
  const FAL_AI_API_KEY = Deno.env.get('FAL_AI_API_KEY');
  
  if (!FAL_AI_API_KEY) {
    throw new Error('FAL_AI_API_KEY is not configured');
  }

  console.log('Using fal.ai Hunyuan3D-2.0 API for 3D generation');

  try {
    // Convert base64 to data URI for fal.ai
    const imageDataUri = `data:image/png;base64,${imageBase64}`;

    // Submit request to fal.ai Hunyuan3D-2.0 API
    const response = await fetch('https://queue.fal.run/fal-ai/hunyuan3d/v2', {
      method: 'POST',
      headers: {
        'Authorization': `Key ${FAL_AI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        input: {
          input_image_url: imageDataUri,
          num_inference_steps: options.num_inference_steps || 50,
          guidance_scale: options.guidance_scale || 7.5,
          octree_resolution: options.octree_resolution || 256,
          textured_mesh: options.textured_mesh || false
        }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Hunyuan3D-2.0 API error: ${response.status} - ${errorText}`);
    }

    const submissionResult = await response.json();
    const requestId = submissionResult.request_id;
    
    console.log('Hunyuan3D-2.0 request submitted, ID:', requestId);

    // Poll for completion
    let result;
    let attempts = 0;
    const maxAttempts = 60; // 5 minutes with 5-second intervals
    
    while (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds
      
      const statusResponse = await fetch(`https://queue.fal.run/fal-ai/hunyuan3d/v2/requests/${requestId}`, {
        headers: {
          'Authorization': `Key ${FAL_AI_API_KEY}`,
        }
      });
      
      if (!statusResponse.ok) {
        throw new Error(`Status check failed: ${statusResponse.status}`);
      }
      
      const statusResult = await statusResponse.json();
      console.log('Hunyuan3D-2.0 status:', statusResult.status);
      
      if (statusResult.status === 'COMPLETED') {
        result = statusResult;
        break;
      } else if (statusResult.status === 'FAILED') {
        throw new Error(`Hunyuan3D-2.0 generation failed: ${statusResult.error}`);
      }
      
      attempts++;
    }
    
    if (!result) {
      throw new Error('Hunyuan3D-2.0 generation timed out');
    }

    // Download the GLB file and convert to base64
    const glbUrl = result.data.model_mesh.url;
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
        model_type: 'Hunyuan3D-2.0',
        seed: result.data.seed,
        file_size: result.data.model_mesh.file_size
      }
    };

  } catch (error) {
    console.error('Hunyuan3D-2.0 generation error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Generation failed'
    };
  }
}