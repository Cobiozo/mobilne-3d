import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useApp } from '@/contexts/AppContext';
import { getText } from '@/lib/i18n';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Settings, Save, RefreshCw, Shield, Mail, Users, Database } from 'lucide-react';

export const SiteSettings = () => {
  const [settings, setSettings] = useState<Record<string, any>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();
  const { language } = useApp();

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('site_settings')
        .select('setting_key, setting_value, description');

      if (error) throw error;

      const settingsMap = data?.reduce((acc, setting) => {
        acc[setting.setting_key] = setting.setting_value;
        return acc;
      }, {} as Record<string, any>) || {};

      setSettings(settingsMap);
    } catch (error) {
      console.error('Error fetching settings:', error);
      toast({
        title: "Błąd",
        description: 'Nie udało się załadować ustawień strony',
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveAll = async () => {
    setIsSaving(true);
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError) {
        console.error('Auth error:', authError);
        throw new Error(`Authentication error: ${authError.message}`);
      }
      
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Filter out empty settings and prepare updates
      const updates = Object.entries(settings)
        .filter(([_, value]) => {
          if (value === null || value === undefined) return false;
          if (typeof value === 'string' && value.trim() === '') return false;
          return true;
        })
        .map(([key, value]) => ({
          setting_key: key,
          setting_value: value,
          updated_by: user.id
        }));

      if (updates.length === 0) {
        throw new Error('No settings to save');
      }

      const { error } = await supabase
        .from('site_settings')
        .upsert(updates, {
          onConflict: 'setting_key'
        });

      if (error) {
        console.error('Database error:', error);
        throw error;
      }

      toast({
        title: "Sukces",
        description: `Zapisano ${updates.length} ustawień pomyślnie`,
        variant: "default",
      });

      // Trigger a refresh of site settings in the app context
      window.dispatchEvent(new CustomEvent('settingsUpdated'));
    } catch (error) {
      console.error('Error saving settings:', error);
      toast({
        title: "Błąd",
        description: `Błąd podczas zapisywania ustawień: ${(error as Error).message}`,
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleInputChange = (key: string, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  if (isLoading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Settings className="w-6 h-6" />
            Ustawienia systemu
          </h2>
          <p className="text-muted-foreground">
            Konfiguracja podstawowych funkcji i zachowań systemu
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchSettings}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Odśwież
          </Button>
          <Button onClick={handleSaveAll} disabled={isSaving}>
            {isSaving ? (
              <LoadingSpinner />
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Zapisz ustawienia
              </>
            )}
          </Button>
        </div>
      </div>

      <div className="grid gap-6">
        {/* System Configuration */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="w-5 h-5" />
              Konfiguracja systemu
            </CardTitle>
            <CardDescription>
              Podstawowe ustawienia systemowe i limity
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Maksymalny rozmiar pliku (MB)</Label>
                <Input
                  type="number"
                  value={settings.max_file_size || 50}
                  onChange={(e) => handleInputChange('max_file_size', parseInt(e.target.value))}
                  placeholder="50"
                />
              </div>
              <div className="space-y-2">
                <Label>Domyślna waluta</Label>
                <Select
                  value={settings.default_currency || 'PLN'}
                  onValueChange={(value) => handleInputChange('default_currency', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Wybierz walutę" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PLN">PLN - Polski złoty</SelectItem>
                    <SelectItem value="EUR">EUR - Euro</SelectItem>
                    <SelectItem value="USD">USD - Dolar amerykański</SelectItem>
                    <SelectItem value="GBP">GBP - Funt brytyjski</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Limit modeli na użytkownika</Label>
                <Input
                  type="number"
                  value={settings.user_model_limit || 100}
                  onChange={(e) => handleInputChange('user_model_limit', parseInt(e.target.value))}
                  placeholder="100"
                />
              </div>
              <div className="space-y-2">
                <Label>Czas sesji (godziny)</Label>
                <Input
                  type="number"
                  value={settings.session_timeout || 24}
                  onChange={(e) => handleInputChange('session_timeout', parseInt(e.target.value))}
                  placeholder="24"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* User Management */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Zarządzanie użytkownikami
            </CardTitle>
            <CardDescription>
              Ustawienia dotyczące rejestracji i uprawnień użytkowników
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Rejestracja włączona</Label>
                <p className="text-xs text-muted-foreground">
                  Czy nowi użytkownicy mogą się rejestrować
                </p>
              </div>
              <Switch
                checked={settings.registration_enabled ?? true}
                onCheckedChange={(value) => handleInputChange('registration_enabled', value)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Wymagaj weryfikacji email</Label>
                <p className="text-xs text-muted-foreground">
                  Użytkownicy muszą potwierdzić swój adres email
                </p>
              </div>
              <Switch
                checked={settings.email_verification_required ?? true}
                onCheckedChange={(value) => handleInputChange('email_verification_required', value)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Automatyczna akceptacja kont</Label>
                <p className="text-xs text-muted-foreground">
                  Konta są automatycznie aktywowane po rejestracji
                </p>
              </div>
              <Switch
                checked={settings.auto_approve_accounts ?? true}
                onCheckedChange={(value) => handleInputChange('auto_approve_accounts', value)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Security Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Ustawienia bezpieczeństwa
            </CardTitle>
            <CardDescription>
              Konfiguracja zabezpieczeń i prywatności
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Dwuskładnikowe uwierzytelnianie</Label>
                <p className="text-xs text-muted-foreground">
                  Wymusza użycie 2FA dla wszystkich użytkowników
                </p>
              </div>
              <Switch
                checked={settings.require_2fa ?? false}
                onCheckedChange={(value) => handleInputChange('require_2fa', value)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Publiczne przeglądanie modeli</Label>
                <p className="text-xs text-muted-foreground">
                  Użytkownicy mogą przeglądać publiczne modele bez logowania
                </p>
              </div>
              <Switch
                checked={settings.public_model_viewing ?? true}
                onCheckedChange={(value) => handleInputChange('public_model_viewing', value)}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Minimalna długość hasła</Label>
                <Input
                  type="number"
                  value={settings.min_password_length || 8}
                  onChange={(e) => handleInputChange('min_password_length', parseInt(e.target.value))}
                  placeholder="8"
                />
              </div>
              <div className="space-y-2">
                <Label>Maksymalne próby logowania</Label>
                <Input
                  type="number"
                  value={settings.max_login_attempts || 5}
                  onChange={(e) => handleInputChange('max_login_attempts', parseInt(e.target.value))}
                  placeholder="5"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Notification Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="w-5 h-5" />
              Powiadomienia email
            </CardTitle>
            <CardDescription>
              Konfiguracja systemu powiadomień
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Powiadomienia email włączone</Label>
                <p className="text-xs text-muted-foreground">
                  System może wysyłać powiadomienia email
                </p>
              </div>
              <Switch
                checked={settings.email_notifications_enabled ?? true}
                onCheckedChange={(value) => handleInputChange('email_notifications_enabled', value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Email administratora</Label>
              <Input
                type="email"
                value={settings.admin_email || ''}
                onChange={(e) => handleInputChange('admin_email', e.target.value)}
                placeholder="admin@example.com"
              />
            </div>

            <div className="space-y-2">
              <Label>Nazwa nadawcy email</Label>
              <Input
                value={settings.email_sender_name || ''}
                onChange={(e) => handleInputChange('email_sender_name', e.target.value)}
                placeholder="3D Model Platform"
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};