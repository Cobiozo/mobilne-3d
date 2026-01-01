import { createContext, useContext, useState, ReactNode } from 'react';
import { Language } from '@/lib/i18n';
import { useSiteSettings } from '@/hooks/useSiteSettings';

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
  // Load language from localStorage on init, default to 'pl' if not found
  const [language, setLanguageState] = useState<Language>(() => {
    const savedLanguage = localStorage.getItem('preferredLanguage');
    return (savedLanguage === 'en' || savedLanguage === 'pl') ? savedLanguage : 'pl';
  });
  
  const { siteSettings, refreshSiteSettings } = useSiteSettings();

  // Custom setLanguage that also saves to localStorage
  const setLanguage = (newLanguage: Language) => {
    setLanguageState(newLanguage);
    localStorage.setItem('preferredLanguage', newLanguage);
  };

  return (
    <AppContext.Provider value={{ 
      language, 
      setLanguage, 
      siteSettings,
      refreshSiteSettings
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