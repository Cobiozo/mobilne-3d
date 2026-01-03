import { useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useVisibilityChange } from './useVisibilityChange';

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
  const visibilityTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const trackSession = useCallback(async () => {
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
  }, []);

  const cleanupSession = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      // If user is not authenticated, clean up local session
      const sessionId = sessionStorage.getItem('session_id');
      if (sessionId) {
        sessionStorage.removeItem('session_id');
      }
    }
  }, []);

  // Handle visibility change with debouncing
  const handleVisibilityCallback = useCallback(() => {
    // Debounce - wait 1 second before tracking
    if (visibilityTimeoutRef.current) clearTimeout(visibilityTimeoutRef.current);
    visibilityTimeoutRef.current = setTimeout(trackSession, 1000);
  }, [trackSession]);

  // Use centralized visibility change hook
  useVisibilityChange(handleVisibilityCallback);

  useEffect(() => {
    // Track session on mount
    trackSession();

    // Track session every 10 minutes (increased from 5 to reduce NPROC usage)
    const interval = setInterval(trackSession, 10 * 60 * 1000);

    // Clean up on unmount
    const handleBeforeUnload = () => {
      // Don't delete session on page refresh - only track last activity
      trackSession();
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      clearInterval(interval);
      if (visibilityTimeoutRef.current) clearTimeout(visibilityTimeoutRef.current);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      cleanupSession();
    };
  }, [trackSession, cleanupSession]);
};
