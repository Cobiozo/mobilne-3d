import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const useSessionTracking = () => {
  useEffect(() => {
    const trackSession = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) return;

      // Get user's IP and user agent (user agent from browser)
      const userAgent = navigator.userAgent;
      
      // Update or create session
      const { error } = await supabase
        .from('active_sessions')
        .upsert({
          user_id: user.id,
          user_agent: userAgent,
          last_activity: new Date().toISOString(),
        }, {
          onConflict: 'user_id',
          ignoreDuplicates: false
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
