import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Language } from '@/lib/i18n';
import { supabase } from '@/integrations/supabase/client';

interface SiteSettings {
  homepage_title?: { pl?: string; en?: string };
  homepage_subtitle?: { pl?: string; en?: string };
  company_name?: string;
  company_logo?: string;
  primary_color?: string;
  secondary_color?: string;
  [key: string]: any;
}

interface AppContextType {
  language: Language;
  setLanguage: (language: Language) => void;
  siteSettings: SiteSettings;
  refreshSiteSettings: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const [language, setLanguage] = useState<Language>('pl');
  const [siteSettings, setSiteSettings] = useState<SiteSettings>({});

  const fetchSiteSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('site_settings')
        .select('setting_key, setting_value');

      if (error) throw error;

      const settingsMap = data?.reduce((acc, setting) => {
        acc[setting.setting_key] = setting.setting_value;
        return acc;
      }, {} as SiteSettings) || {};

      setSiteSettings(settingsMap);
    } catch (error) {
      console.error('Error fetching site settings:', error);
    }
  };

  useEffect(() => {
    fetchSiteSettings();

    // Listen for settings updates
    const handleSettingsUpdate = () => {
      fetchSiteSettings();
    };

    window.addEventListener('settingsUpdated', handleSettingsUpdate);
    return () => window.removeEventListener('settingsUpdated', handleSettingsUpdate);
  }, []);

  return (
    <AppContext.Provider value={{ 
      language, 
      setLanguage, 
      siteSettings,
      refreshSiteSettings: fetchSiteSettings
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within AppProvider');
  }
  return context;
};