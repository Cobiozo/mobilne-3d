import { createContext, useContext, useState, ReactNode } from 'react';
import { Language } from '@/lib/i18n';

interface AppContextType {
  language: Language;
  setLanguage: (language: Language) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const [language, setLanguage] = useState<Language>('pl');

  return (
    <AppContext.Provider value={{ language, setLanguage }}>
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