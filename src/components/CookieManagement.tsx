import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Cookie, RefreshCw, Save } from 'lucide-react';

interface CookieSettings {
  id: string;
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

export const CookieManagement = () => {
  const [settings, setSettings] = useState<CookieSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const fetchSettings = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('cookie_settings')
      .select('*')
      .single();

    if (error) {
      console.error('Error fetching cookie settings:', error);
      toast.error('Błąd ładowania ustawień cookie');
    } else if (data) {
      setSettings(data);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSave = async () => {
    if (!settings) return;

    setIsSaving(true);
    const { error } = await supabase
      .from('cookie_settings')
      .update({
        is_enabled: settings.is_enabled,
        cookie_text: settings.cookie_text,
        accept_button_text: settings.accept_button_text,
        reject_button_text: settings.reject_button_text,
        privacy_policy_text: settings.privacy_policy_text,
        privacy_policy_url: settings.privacy_policy_url,
        cookie_duration_days: settings.cookie_duration_days,
        position: settings.position,
        theme: settings.theme,
        updated_at: new Date().toISOString()
      })
      .eq('id', settings.id);

    if (error) {
      console.error('Error saving cookie settings:', error);
      toast.error('Błąd zapisywania ustawień');
    } else {
      toast.success('Ustawienia zapisane pomyślnie');
      window.dispatchEvent(new Event('cookieSettingsUpdated'));
    }
    setIsSaving(false);
  };

  const handleInputChange = (field: keyof CookieSettings, value: any) => {
    if (!settings) return;
    setSettings({ ...settings, [field]: value });
  };

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (!settings) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-muted-foreground">Nie znaleziono ustawień cookie</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Cookie className="w-5 h-5" />
              Zarządzanie Cookie i Polityką Prywatności
            </CardTitle>
            <CardDescription>
              Skonfiguruj popup akceptacji cookie i politykę prywatności
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={fetchSettings}
              disabled={isLoading}
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleSave}
              disabled={isSaving}
            >
              <Save className="w-4 h-4 mr-2" />
              {isSaving ? 'Zapisywanie...' : 'Zapisz'}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Włącz/Wyłącz Cookie Banner */}
        <div className="flex items-center justify-between p-4 border rounded-lg">
          <div>
            <Label htmlFor="is_enabled" className="text-base font-medium">
              Wyświetlaj popup cookie
            </Label>
            <p className="text-sm text-muted-foreground">
              Włącz lub wyłącz wyświetlanie banneru cookie
            </p>
          </div>
          <Switch
            id="is_enabled"
            checked={settings.is_enabled}
            onCheckedChange={(checked) => handleInputChange('is_enabled', checked)}
          />
        </div>

        {/* Tekst Cookie */}
        <div className="space-y-2">
          <Label htmlFor="cookie_text">Tekst informacyjny cookie</Label>
          <Textarea
            id="cookie_text"
            value={settings.cookie_text}
            onChange={(e) => handleInputChange('cookie_text', e.target.value)}
            rows={3}
            placeholder="Wpisz tekst, który pojawi się w bannerze cookie"
          />
        </div>

        {/* Przyciski */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="accept_button_text">Tekst przycisku akceptacji</Label>
            <Input
              id="accept_button_text"
              value={settings.accept_button_text}
              onChange={(e) => handleInputChange('accept_button_text', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="reject_button_text">Tekst przycisku odrzucenia</Label>
            <Input
              id="reject_button_text"
              value={settings.reject_button_text}
              onChange={(e) => handleInputChange('reject_button_text', e.target.value)}
            />
          </div>
        </div>

        {/* Polityka prywatności */}
        <div className="space-y-2">
          <Label htmlFor="privacy_policy_text">Tekst polityki prywatności (HTML)</Label>
          <Textarea
            id="privacy_policy_text"
            value={settings.privacy_policy_text || ''}
            onChange={(e) => handleInputChange('privacy_policy_text', e.target.value)}
            rows={2}
            placeholder='Np. Więcej informacji w <a href="/terms">Polityce Prywatności</a>'
          />
          <p className="text-xs text-muted-foreground">
            Możesz użyć HTML, np. linków z tagiem &lt;a&gt;
          </p>
        </div>

        {/* URL polityki prywatności */}
        <div className="space-y-2">
          <Label htmlFor="privacy_policy_url">Link do polityki prywatności</Label>
          <Input
            id="privacy_policy_url"
            type="url"
            value={settings.privacy_policy_url || ''}
            onChange={(e) => handleInputChange('privacy_policy_url', e.target.value)}
            placeholder="/terms"
          />
        </div>

        {/* Czas trwania cookie */}
        <div className="space-y-2">
          <Label htmlFor="cookie_duration_days">Czas trwania cookie (dni)</Label>
          <Input
            id="cookie_duration_days"
            type="number"
            min="1"
            max="3650"
            value={settings.cookie_duration_days}
            onChange={(e) => handleInputChange('cookie_duration_days', parseInt(e.target.value))}
          />
          <p className="text-xs text-muted-foreground">
            Określa, jak długo zostanie zapamiętana decyzja użytkownika
          </p>
        </div>

        {/* Pozycja banneru */}
        <div className="space-y-2">
          <Label htmlFor="position">Pozycja banneru</Label>
          <Select
            value={settings.position}
            onValueChange={(value) => handleInputChange('position', value)}
          >
            <SelectTrigger id="position">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="bottom">Na dole</SelectItem>
              <SelectItem value="top">Na górze</SelectItem>
              <SelectItem value="bottom-left">Lewy dolny róg</SelectItem>
              <SelectItem value="bottom-right">Prawy dolny róg</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Motyw */}
        <div className="space-y-2">
          <Label htmlFor="theme">Motyw banneru</Label>
          <Select
            value={settings.theme}
            onValueChange={(value) => handleInputChange('theme', value)}
          >
            <SelectTrigger id="theme">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="light">Jasny</SelectItem>
              <SelectItem value="dark">Ciemny</SelectItem>
              <SelectItem value="auto">Automatyczny (system)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>
  );
};
