import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ShareRequest {
  modelId: string;
  shareWith: string[]; // Array of email addresses
  permissions: 'view' | 'download' | 'edit';
  message?: string;
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

    const { modelId, shareWith, permissions, message }: ShareRequest = await req.json();

    // Fetch model data to verify ownership
    const { data: model, error: modelError } = await supabaseClient
      .from('models')
      .select('*')
      .eq('id', modelId)
      .eq('user_id', user.id)
      .single();

    if (modelError || !model) {
      throw new Error('Model not found or you do not have permission to share it');
    }

    // Get user profile for sender info
    const { data: senderProfile } = await supabaseClient
      .from('profiles')
      .select('display_name')
      .eq('user_id', user.id)
      .single();

    const senderName = senderProfile?.display_name || user.email || 'Someone';

    // Create sharing records and send notifications
    const sharingResults = [];

    for (const email of shareWith) {
      // Generate a unique sharing token
      const sharingToken = crypto.randomUUID();
      
      // Create sharing record
      const { error: shareError } = await supabaseClient
        .from('model_shares')
        .insert({
          model_id: modelId,
          shared_by: user.id,
          shared_with_email: email,
          permissions,
          sharing_token: sharingToken,
          expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days
        });

      if (shareError) {
        console.error(`Failed to create share record for ${email}:`, shareError);
        continue;
      }

      // Here you would send an email notification
      // For now, we'll just log it
      console.log(`Model "${model.name}" shared with ${email} by ${senderName}`);
      
      sharingResults.push({
        email,
        status: 'success',
        sharingToken,
        shareUrl: `${req.headers.get('origin')}/shared/${sharingToken}`
      });
    }

    return new Response(JSON.stringify({
      success: true,
      modelName: model.name,
      sharingResults,
      sharedAt: new Date().toISOString()
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders,
      },
    });

  } catch (error) {
    console.error('Error in model-sharing function:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'An error occurred',
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