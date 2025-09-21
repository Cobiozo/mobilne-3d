import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AnalysisRequest {
  modelId: string;
  analysisType: 'quality' | 'printability' | 'structure';
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get the authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    // Verify the JWT token
    const jwt = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(jwt);
    
    if (userError || !user) {
      throw new Error('Invalid token');
    }

    const { modelId, analysisType }: AnalysisRequest = await req.json();

    // Fetch model data
    const { data: model, error: modelError } = await supabaseClient
      .from('models')
      .select('*')
      .eq('id', modelId)
      .single();

    if (modelError || !model) {
      throw new Error('Model not found');
    }

    // Check if user owns the model or is admin
    const { data: userRole } = await supabaseClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (model.user_id !== user.id && userRole?.role !== 'admin') {
      throw new Error('Unauthorized access to model');
    }

    console.log(`Analyzing model ${modelId} for ${analysisType}`);

    // Simulate AI analysis (in real implementation, you'd integrate with AI services)
    const analysisResults = {
      modelId,
      analysisType,
      results: {
        score: Math.floor(Math.random() * 100),
        issues: generateRandomIssues(analysisType),
        recommendations: generateRecommendations(analysisType),
        analyzedAt: new Date().toISOString()
      }
    };

    // Store analysis results in database
    const { error: insertError } = await supabaseClient
      .from('model_analyses')
      .insert({
        model_id: modelId,
        user_id: user.id,
        analysis_type: analysisType,
        results: analysisResults.results
      });

    if (insertError) {
      console.error('Failed to store analysis:', insertError);
    }

    return new Response(JSON.stringify(analysisResults), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders,
      },
    });

  } catch (error) {
    console.error('Error in ai-model-analysis function:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message || 'An error occurred',
        success: false 
      }),
      {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      }
    );
  }
});

function generateRandomIssues(analysisType: string): string[] {
  const issues = {
    quality: ['Low polygon density in some areas', 'Minor surface imperfections detected'],
    printability: ['Overhangs may require supports', 'Wall thickness could be optimized'],
    structure: ['Weak points detected at joints', 'Consider reinforcing base structure']
  };
  
  return issues[analysisType as keyof typeof issues] || [];
}

function generateRecommendations(analysisType: string): string[] {
  const recommendations = {
    quality: ['Increase mesh resolution', 'Apply smoothing algorithms'],
    printability: ['Add support structures', 'Adjust print orientation'],
    structure: ['Increase wall thickness', 'Add internal supports']
  };
  
  return recommendations[analysisType as keyof typeof recommendations] || [];
}