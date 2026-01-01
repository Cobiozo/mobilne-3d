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
      
      // Call edge function to track session with IP address
      try {
        const { error } = await supabase.functions.invoke('track-session', {
          body: {
            sessionId,
            userAgent,
          },
        });

        if (error) {
          console.error('Error tracking session:', error);
        }
      } catch (error) {
        console.error('Error calling track-session function:', error);
      }
    };

    const cleanupSession = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        // If user is not authenticated, clean up local session
        const sessionId = sessionStorage.getItem('session_id');
        if (sessionId) {
          sessionStorage.removeItem('session_id');
        }
      }
    };

    // Track session on mount
    trackSession();

    // Track session every 5 minutes
    const interval = setInterval(trackSession, 5 * 60 * 1000);

    // Track session on visibility change with debouncing
    let visibilityTimeout: NodeJS.Timeout | null = null;
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        // Debounce - wait 1 second before tracking
        if (visibilityTimeout) clearTimeout(visibilityTimeout);
        visibilityTimeout = setTimeout(trackSession, 1000);
      }
    };

    // Clean up on unmount
    const handleBeforeUnload = () => {
      // Don't delete session on page refresh - only track last activity
      trackSession();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      clearInterval(interval);
      if (visibilityTimeout) clearTimeout(visibilityTimeout);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      cleanupSession();
    };
  }, []);
};
