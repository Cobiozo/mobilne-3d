import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

// Generate or retrieve session ID
const getSessionId = () => {
  let sessionId = sessionStorage.getItem('session_id');
  if (!sessionId) {
    sessionId = crypto.randomUUID();
    sessionStorage.setItem('session_id', sessionId);
  }
  return sessionId;
};

export const useSessionTracking = () => {
  useEffect(() => {
    const trackSession = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) return;

      const sessionId = getSessionId();
      const userAgent = navigator.userAgent;
      
      // Delete any existing sessions for this user to prevent duplicates
      await supabase
        .from('active_sessions')
        .delete()
        .eq('user_id', user.id)
        .eq('session_id', sessionId);

      // Create new session
      const { error } = await supabase
        .from('active_sessions')
        .insert({
          user_id: user.id,
          session_id: sessionId,
          user_agent: userAgent,
          last_activity: new Date().toISOString(),
        });

      if (error) {
        console.error('Error tracking session:', error);
      }
    };

    // Track session on mount
    trackSession();

    // Track session every 5 minutes
    const interval = setInterval(trackSession, 5 * 60 * 1000);

    // Track session on visibility change
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        trackSession();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);
};
