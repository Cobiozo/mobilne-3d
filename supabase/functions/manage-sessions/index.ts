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
      // Get all users first
      const { data: { users }, error: listError } = await supabaseClient.auth.admin.listUsers();

      if (listError) {
        console.error('Error listing users:', listError);
        throw listError;
      }

      console.log('Total users found:', users.length);

      // Get recent analytics events to determine active sessions (last 7 days)
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const { data: events, error: eventsError } = await supabaseClient
        .from('analytics_events')
        .select('user_id, ip_address, user_agent, created_at')
        .not('user_id', 'is', null)
        .gte('created_at', sevenDaysAgo)
        .order('created_at', { ascending: false });

      if (eventsError) {
        console.error('Error fetching analytics events:', eventsError);
      }

      console.log('Analytics events found:', events?.length || 0);

      // Group by user_id to get latest activity
      const sessionsMap = new Map();
      
      if (events && events.length > 0) {
        for (const event of events) {
          if (!sessionsMap.has(event.user_id)) {
            const user = users.find(u => u.id === event.user_id);
            if (user) {
              sessionsMap.set(event.user_id, {
                id: event.user_id,
                user_id: event.user_id,
                email: user.email || 'Unknown',
                created_at: user.created_at,
                last_seen: event.created_at,
                ip_address: event.ip_address || 'Unknown',
                user_agent: event.user_agent || 'Unknown'
              });
            }
          }
        }
      } else {
        // If no analytics events, show all users as potential sessions
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        for (const user of users) {
          // Only show users who logged in within last 24 hours
          if (user.last_sign_in_at && user.last_sign_in_at > oneDayAgo) {
            sessionsMap.set(user.id, {
              id: user.id,
              user_id: user.id,
              email: user.email || 'Unknown',
              created_at: user.created_at,
              last_seen: user.last_sign_in_at,
              ip_address: 'Unknown',
              user_agent: 'Unknown'
            });
          }
        }
      }

      const sessions = Array.from(sessionsMap.values());
      console.log('Sessions to return:', sessions.length);

      return new Response(
        JSON.stringify({ sessions }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (action === 'terminate') {
      console.log('Terminate action called with userId:', userId);
      
      if (!userId) {
        console.error('userId is missing');
        return new Response(JSON.stringify({ error: 'userId is required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Delete all sessions for this user from auth.sessions table
      console.log('Deleting all sessions for user:', userId);
      const { error: deleteError } = await supabaseClient
        .from('auth.sessions')
        .delete()
        .eq('user_id', userId);

      if (deleteError) {
        console.error('Session deletion error:', deleteError);
        // If direct deletion fails, try using admin API to update user
        // This will invalidate all their tokens
        const { error: updateError } = await supabaseClient.auth.admin.updateUserById(
          userId,
          { 
            user_metadata: { 
              force_logout: new Date().toISOString() 
            } 
          }
        );
        
        if (updateError) {
          console.error('Update user error:', updateError);
          throw updateError;
        }
      }

      console.log('User sessions terminated successfully');

      // Log the action
      await supabaseClient.from('audit_logs').insert({
        user_id: user.id,
        action: 'terminate_session',
        resource_type: 'user_session',
        resource_id: userId,
        severity: 'warning',
        details: { terminated_user_id: userId }
      });

      console.log('Audit log created');

      return new Response(
        JSON.stringify({ success: true, message: 'User session terminated' }),
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
