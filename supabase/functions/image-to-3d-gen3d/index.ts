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
    const meshyApiKey = Deno.env.get('MESHY_API_KEY');
    if (!meshyApiKey) {
      throw new Error('MESHY_API_KEY not configured');
    }

    const { imageBase64, options = {} } = await req.json();
    
    if (!imageBase64) {
      throw new Error('No image data provided');
    }

    console.log('Starting Gen3D 2.0 conversion with Meshy API');

    // Create image-to-3D task with Meshy API (Gen3D 2.0 engine)
    const createTaskResponse = await fetch('https://api.meshy.ai/openapi/v1/image-to-3d', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${meshyApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        image_url: `data:image/png;base64,${imageBase64}`,
        ai_model: 'latest', // Using Meshy 6 Preview (Gen3D 2.0)
        topology: options.topology || 'triangle',
        target_polycount: options.target_polycount || 30000,
        symmetry_mode: options.symmetry_mode || 'auto',
        should_remesh: options.should_remesh !== false,
        should_texture: options.should_texture !== false,
        enable_pbr: options.enable_pbr || true,
        is_a_t_pose: options.is_a_t_pose || false,
        moderation: true,
      }),
    });

    if (!createTaskResponse.ok) {
      const errorText = await createTaskResponse.text();
      console.error('Meshy API Error:', errorText);
      throw new Error(`Meshy API error: ${createTaskResponse.status} - ${errorText}`);
    }

    const taskResult = await createTaskResponse.json();
    const taskId = taskResult.result;

    console.log('Gen3D task created with ID:', taskId);

    // Poll for completion (Meshy typically takes 1-3 minutes)
    let attempts = 0;
    const maxAttempts = 60; // 5 minutes max wait
    
    while (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds
      
      const statusResponse = await fetch(`https://api.meshy.ai/openapi/v1/image-to-3d/${taskId}`, {
        headers: {
          'Authorization': `Bearer ${meshyApiKey}`,
        },
      });

      if (!statusResponse.ok) {
        throw new Error(`Failed to check task status: ${statusResponse.status}`);
      }

      const status = await statusResponse.json();
      console.log(`Gen3D task status (attempt ${attempts + 1}):`, status.status);

      if (status.status === 'SUCCEEDED') {
        console.log('Gen3D conversion completed successfully');
        return new Response(JSON.stringify({
          success: true,
          taskId,
          model_urls: status.model_urls,
          thumbnail_url: status.thumbnail_url,
          video_url: status.video_url,
          task_error: status.task_error,
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      } else if (status.status === 'FAILED') {
        throw new Error(`Gen3D conversion failed: ${status.task_error?.message || 'Unknown error'}`);
      }

      attempts++;
    }

    throw new Error('Gen3D conversion timed out');

  } catch (error) {
    console.error('Error in Gen3D conversion:', error);
    return new Response(JSON.stringify({ 
      success: false,
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});