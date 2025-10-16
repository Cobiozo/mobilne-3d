import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CookieSettings {
  is_enabled: boolean;
  cookie_text: string;
  accept_button_text: string;
  reject_button_text: string;
  privacy_policy_text: string | null;
  privacy_policy_url: string | null;
  cookie_duration_days: number;
  position: string;
  theme: string;
}

const COOKIE_CONSENT_KEY = 'cookie_consent';

export const CookieConsent = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [settings, setSettings] = useState<CookieSettings | null>(null);

  const fetchSettings = async () => {
    const { data, error } = await supabase
      .from('cookie_settings')
      .select('*')
      .single();

    if (!error && data) {
      setSettings(data);
      
      // Check if user has already made a choice
      const consent = localStorage.getItem(COOKIE_CONSENT_KEY);
      if (!consent && data.is_enabled) {
        setIsVisible(true);
      }
    }
  };

  useEffect(() => {
    fetchSettings();

    // Listen for settings updates
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
    
    localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify({
      accepted: true,
      timestamp: new Date().toISOString(),
      expires: expiryDate.toISOString()
    }));
    
    setIsVisible(false);
  };

  const handleReject = () => {
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + 30); // Store rejection for 30 days
    
    localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify({
      accepted: false,
      timestamp: new Date().toISOString(),
      expires: expiryDate.toISOString()
    }));
    
    setIsVisible(false);
  };

  if (!isVisible || !settings) {
    return null;
  }

  const positionClasses = {
    bottom: 'bottom-0 left-0 right-0',
    top: 'top-0 left-0 right-0',
    center: 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 max-w-lg'
  };

  const themeClasses = {
    light: 'bg-background border-border',
    dark: 'bg-card border-border',
    auto: 'bg-background border-border'
  };

  return (
    <>
      {/* Backdrop for center position */}
      {settings.position === 'center' && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50" />
      )}
      
      <Card
        className={cn(
          'fixed z-50 p-4 md:p-6 shadow-lg animate-in fade-in slide-in-from-bottom-5',
          positionClasses[settings.position as keyof typeof positionClasses] || positionClasses.bottom,
          themeClasses[settings.theme as keyof typeof themeClasses] || themeClasses.light,
          settings.position === 'center' ? 'w-[90%]' : 'mx-4 md:mx-6 mb-4 md:mb-6'
        )}
      >
        <div className="flex flex-col gap-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 space-y-2">
              <p className="text-sm leading-relaxed">
                {settings.cookie_text}
              </p>
              
              {settings.privacy_policy_text && (
                <div 
                  className="text-xs text-muted-foreground"
                  dangerouslySetInnerHTML={{ __html: settings.privacy_policy_text }}
                />
              )}
            </div>
            
            {settings.position === 'center' && (
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 shrink-0"
                onClick={handleReject}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <Button
              onClick={handleAccept}
              className="flex-1 sm:flex-none"
            >
              {settings.accept_button_text}
            </Button>
            <Button
              onClick={handleReject}
              variant="outline"
              className="flex-1 sm:flex-none"
            >
              {settings.reject_button_text}
            </Button>
            {settings.privacy_policy_url && (
              <Button
                variant="ghost"
                className="flex-1 sm:flex-none"
                onClick={() => window.location.href = settings.privacy_policy_url || '/terms'}
              >
                Dowiedz się więcej
              </Button>
            )}
          </div>
        </div>
      </Card>
    </>
  );
};
