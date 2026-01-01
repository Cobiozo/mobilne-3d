import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCallback, useEffect } from 'react';

interface SiteSettings {
  homepage_title?: { pl?: string; en?: string };
  homepage_subtitle?: { pl?: string; en?: string };
  company_name?: string;
  company_logo?: string;
  primary_color?: string;
  secondary_color?: string;
  [key: string]: any;
}

const fetchSiteSettings = async (): Promise<SiteSettings> => {
  const { data, error } = await supabase
    .from('site_settings')
    .select('setting_key, setting_value');

  if (error) throw error;

  return data?.reduce((acc, setting) => {
    acc[setting.setting_key] = setting.setting_value;
    return acc;
  }, {} as SiteSettings) || {};
};

export const useSiteSettings = () => {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['siteSettings'],
    queryFn: fetchSiteSettings,
    staleTime: 5 * 60 * 1000, // 5 minutes - site settings change rarely
  });

  const refreshSiteSettings = useCallback(() => {
    return queryClient.invalidateQueries({ queryKey: ['siteSettings'] });
  }, [queryClient]);

  // Listen for settings updates from other components
  useEffect(() => {
    const handleSettingsUpdate = () => {
      refreshSiteSettings();
    };

    window.addEventListener('settingsUpdated', handleSettingsUpdate);
    return () => window.removeEventListener('settingsUpdated', handleSettingsUpdate);
  }, [refreshSiteSettings]);

  return {
    ...query,
    siteSettings: query.data || {},
    refreshSiteSettings,
  };
};
