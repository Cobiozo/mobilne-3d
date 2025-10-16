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
import { Cookie, Save, RefreshCw } from 'lucide-react';

interface CookieSettingsData {
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

export const CookieSettings = () => {
  const [settings, setSettings] = useState<CookieSettingsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const fetchSettings = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('cookie_settings')
      .select('*')
      .single();

    if (error) {
      toast.error('Błąd ładowania ustawień cookie');
      console.error(error);
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

    setIsSaving(false);

    if (error) {
      toast.error('Błąd zapisywania ustawień');
      console.error(error);
    } else {
      toast.success('Ustawienia cookie zostały zapisane');
      // Emit event for cookie banner to refresh
      window.dispatchEvent(new CustomEvent('cookieSettingsUpdated'));
    }
  };

  const handleInputChange = (field: keyof CookieSettingsData, value: any) => {
    if (settings) {
      setSettings({ ...settings, [field]: value });
    }
  };

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (!settings) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Ustawienia Cookie</CardTitle>
          <CardDescription>Nie znaleziono ustawień cookie</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Cookie className="w-6 h-6" />
            Ustawienia Cookie i Polityki Prywatności
          </h2>
          <p className="text-muted-foreground">
            Zarządzaj banerem cookie i zgodami użytkowników
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchSettings} disabled={isSaving}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Odśwież
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            <Save className="w-4 h-4 mr-2" />
            {isSaving ? 'Zapisywanie...' : 'Zapisz zmiany'}
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Ogólne ustawienia</CardTitle>
          <CardDescription>Podstawowa konfiguracja banera cookie</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Włącz banner cookie</Label>
              <p className="text-sm text-muted-foreground">
                Wyświetlaj banner cookie dla użytkowników
              </p>
            </div>
            <Switch
              checked={settings.is_enabled}
              onCheckedChange={(checked) => handleInputChange('is_enabled', checked)}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Pozycja banera</Label>
              <Select
                value={settings.position}
                onValueChange={(value) => handleInputChange('position', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bottom">Na dole</SelectItem>
                  <SelectItem value="top">Na górze</SelectItem>
                  <SelectItem value="center">Na środku</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Motyw</Label>
              <Select
                value={settings.theme}
                onValueChange={(value) => handleInputChange('theme', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="light">Jasny</SelectItem>
                  <SelectItem value="dark">Ciemny</SelectItem>
                  <SelectItem value="auto">Automatyczny</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="duration">Czas przechowywania zgody (dni)</Label>
              <Input
                id="duration"
                type="number"
                value={settings.cookie_duration_days}
                onChange={(e) => handleInputChange('cookie_duration_days', parseInt(e.target.value))}
                min={1}
                max={3650}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Treść banera</CardTitle>
          <CardDescription>Dostosuj teksty wyświetlane w banerze cookie</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="cookieText">Główny tekst informacyjny</Label>
            <Textarea
              id="cookieText"
              value={settings.cookie_text}
              onChange={(e) => handleInputChange('cookie_text', e.target.value)}
              rows={3}
              placeholder="Ta strona używa plików cookie..."
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="acceptBtn">Tekst przycisku akceptacji</Label>
              <Input
                id="acceptBtn"
                value={settings.accept_button_text}
                onChange={(e) => handleInputChange('accept_button_text', e.target.value)}
                placeholder="Akceptuję"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="rejectBtn">Tekst przycisku odrzucenia</Label>
              <Input
                id="rejectBtn"
                value={settings.reject_button_text}
                onChange={(e) => handleInputChange('reject_button_text', e.target.value)}
                placeholder="Odrzuć"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="privacyText">Dodatkowy tekst polityki prywatności</Label>
            <Textarea
              id="privacyText"
              value={settings.privacy_policy_text || ''}
              onChange={(e) => handleInputChange('privacy_policy_text', e.target.value)}
              rows={2}
              placeholder="Możesz użyć HTML, np: Więcej w <a href='/terms'>Polityce Prywatności</a>"
            />
            <p className="text-xs text-muted-foreground">
              Możesz używać podstawowych tagów HTML
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="privacyUrl">Link do polityki prywatności</Label>
            <Input
              id="privacyUrl"
              value={settings.privacy_policy_url || ''}
              onChange={(e) => handleInputChange('privacy_policy_url', e.target.value)}
              placeholder="/terms lub https://..."
            />
          </div>
        </CardContent>
      </Card>

      <Card className="border-primary/50 bg-primary/5">
        <CardHeader>
          <CardTitle className="text-sm">Podgląd</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="p-4 bg-background border rounded-lg">
            <p className="text-sm mb-3">{settings.cookie_text}</p>
            {settings.privacy_policy_text && (
              <div 
                className="text-xs text-muted-foreground mb-3"
                dangerouslySetInnerHTML={{ __html: settings.privacy_policy_text }}
              />
            )}
            <div className="flex gap-2">
              <Button size="sm">{settings.accept_button_text}</Button>
              <Button size="sm" variant="outline">{settings.reject_button_text}</Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
