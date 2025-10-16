import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { X, Cookie } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

interface CookieSettings {
  is_enabled: boolean;
  cookie_text: string;
  accept_button_text: string;
  reject_button_text: string;
  privacy_policy_text: string | null;
  cookie_duration_days: number;
  position: string;
  theme: string;
}

export const CookieConsent = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [settings, setSettings] = useState<CookieSettings | null>(null);

  const fetchSettings = async () => {
    const { data, error } = await supabase
      .from('cookie_settings')
      .select('*')
      .single();

    if (data && !error) {
      setSettings(data);
      
      // Sprawdź czy użytkownik już zaakceptował/odrzucił cookie
      const consent = localStorage.getItem('cookie_consent');
      if (!consent && data.is_enabled) {
        setIsVisible(true);
      }
    }
  };

  useEffect(() => {
    fetchSettings();

    // Nasłuchuj na zmiany ustawień
    const handleSettingsUpdate = () => {
      fetchSettings();
    };

    window.addEventListener('cookieSettingsUpdated', handleSettingsUpdate);
    return () => {
      window.removeEventListener('cookieSettingsUpdated', handleSettingsUpdate);
    };
  }, []);

  const handleAccept = () => {
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + (settings?.cookie_duration_days || 365));
    
    localStorage.setItem('cookie_consent', JSON.stringify({
      accepted: true,
      timestamp: new Date().toISOString(),
      expiry: expiryDate.toISOString()
    }));
    
    setIsVisible(false);
  };

  const handleReject = () => {
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + (settings?.cookie_duration_days || 365));
    
    localStorage.setItem('cookie_consent', JSON.stringify({
      accepted: false,
      timestamp: new Date().toISOString(),
      expiry: expiryDate.toISOString()
    }));
    
    setIsVisible(false);
  };

  if (!isVisible || !settings) {
    return null;
  }

  const positionClasses = {
    'bottom': 'bottom-0 left-0 right-0',
    'top': 'top-0 left-0 right-0',
    'bottom-left': 'bottom-4 left-4 max-w-md',
    'bottom-right': 'bottom-4 right-4 max-w-md'
  };

  const themeClasses = settings.theme === 'dark' 
    ? 'bg-card text-card-foreground border-border'
    : settings.theme === 'light'
    ? 'bg-background text-foreground border-border'
    : 'bg-card text-card-foreground border-border'; // auto używa domyślnych CSS vars

  return (
    <div
      className={cn(
        'fixed z-50 p-4 animate-in fade-in slide-in-from-bottom-5',
        positionClasses[settings.position as keyof typeof positionClasses] || positionClasses.bottom
      )}
    >
      <Card className={cn('shadow-lg', themeClasses)}>
        <div className="p-6">
          <div className="flex items-start gap-4">
            <Cookie className="w-6 h-6 text-primary flex-shrink-0 mt-1" />
            <div className="flex-1 space-y-4">
              <div className="space-y-2">
                <p className="text-sm leading-relaxed">
                  {settings.cookie_text}
                </p>
                {settings.privacy_policy_text && (
                  <p 
                    className="text-xs text-muted-foreground"
                    dangerouslySetInnerHTML={{ __html: settings.privacy_policy_text }}
                  />
                )}
              </div>
              
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  onClick={handleAccept}
                  className="flex-1 sm:flex-none"
                >
                  {settings.accept_button_text}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleReject}
                  className="flex-1 sm:flex-none"
                >
                  {settings.reject_button_text}
                </Button>
              </div>
            </div>
            <Button
              size="icon"
              variant="ghost"
              onClick={handleReject}
              className="flex-shrink-0"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
};
