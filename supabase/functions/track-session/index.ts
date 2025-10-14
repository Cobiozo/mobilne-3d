import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get user from auth token
    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);

    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { sessionId, userAgent } = await req.json();

    if (!sessionId) {
      return new Response(JSON.stringify({ error: 'Session ID is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get real IP address from request headers
    const ipAddress = req.headers.get('x-forwarded-for')?.split(',')[0] || 
                     req.headers.get('x-real-ip') || 
                     'Unknown';

    console.log('Tracking session for user:', user.email, 'IP:', ipAddress);

    // Try to update existing session
    const { data: existingSessions } = await supabaseClient
      .from('active_sessions')
      .select('id')
      .eq('user_id', user.id)
      .eq('session_id', sessionId);

    if (existingSessions && existingSessions.length > 0) {
      // Update existing session
      const { error: updateError } = await supabaseClient
        .from('active_sessions')
        .update({
          last_activity: new Date().toISOString(),
          user_agent: userAgent,
          ip_address: ipAddress,
        })
        .eq('user_id', user.id)
        .eq('session_id', sessionId);

      if (updateError) {
        console.error('Error updating session:', updateError);
        throw updateError;
      }
    } else {
      // Create new session
      const { error: insertError } = await supabaseClient
        .from('active_sessions')
        .insert({
          user_id: user.id,
          session_id: sessionId,
          user_agent: userAgent,
          ip_address: ipAddress,
          last_activity: new Date().toISOString(),
        });

      if (insertError) {
        console.error('Error creating session:', insertError);
        throw insertError;
      }
    }

    // Clean up old sessions for this user (older than 24 hours)
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    await supabaseClient
      .from('active_sessions')
      .delete()
      .eq('user_id', user.id)
      .lt('last_activity', oneDayAgo);

    return new Response(
      JSON.stringify({ success: true }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in track-session:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});