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

    // Verify user is authenticated and is admin
    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);

    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if user is admin
    const { data: roleData, error: roleError } = await supabaseClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (roleError || roleData?.role !== 'admin') {
      return new Response(JSON.stringify({ error: 'Forbidden - Admin access required' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { action, userId } = await req.json();

    if (action === 'list') {
      // Get active sessions from our tracking table (last 7 days)
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const { data: sessions, error: sessionsError } = await supabaseClient
        .from('active_sessions')
        .select(`
          id,
          user_id,
          session_id,
          ip_address,
          user_agent,
          last_activity,
          created_at
        `)
        .gte('last_activity', sevenDaysAgo)
        .order('last_activity', { ascending: false });

      if (sessionsError) {
        console.error('Error fetching sessions:', sessionsError);
        throw sessionsError;
      }

      console.log('Active sessions found:', sessions?.length || 0);

      // Get user emails for each session
      const { data: { users }, error: usersError } = await supabaseClient.auth.admin.listUsers();
      
      if (usersError) {
        console.error('Error fetching users:', usersError);
        throw usersError;
      }

      // Map sessions with user details
      const sessionsWithDetails = (sessions || []).map(session => {
        const user = users.find(u => u.id === session.user_id);
        return {
          id: session.id,
          user_id: session.user_id,
          email: user?.email || 'Unknown',
          created_at: session.created_at,
          last_seen: session.last_activity,
          ip_address: session.ip_address ? session.ip_address.toString() : 'Unknown',
          user_agent: session.user_agent || 'Unknown'
        };
      });

      console.log('Sessions to return:', sessionsWithDetails.length);

      return new Response(
        JSON.stringify({ sessions: sessionsWithDetails }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (action === 'terminate') {
      console.log('Terminate action called with session ID:', userId);
      
      if (!userId) {
        console.error('session ID is missing');
        return new Response(JSON.stringify({ error: 'session ID is required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Delete specific session by ID
      console.log('Deleting session:', userId);
      const { error: deleteError } = await supabaseClient
        .from('active_sessions')
        .delete()
        .eq('id', userId);

      if (deleteError) {
        console.error('Session deletion error:', deleteError);
        throw deleteError;
      }

      console.log('Session terminated successfully');

      // Log the action
      await supabaseClient.from('audit_logs').insert({
        user_id: user.id,
        action: 'terminate_session',
        resource_type: 'user_session',
        resource_id: userId,
        severity: 'warning',
        details: { terminated_session_id: userId }
      });

      console.log('Audit log created');

      return new Response(
        JSON.stringify({ success: true, message: 'Session terminated' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in manage-sessions:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
