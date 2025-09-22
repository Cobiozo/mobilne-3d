import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useApp } from '@/contexts/AppContext';
import { getText } from '@/lib/i18n';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Palette, Globe, Upload, Save, RefreshCw, Settings, Eye, Shield, Mail } from 'lucide-react';

interface SiteSetting {
  setting_key: string;
  setting_value: any;
  description: string;
}

export const SiteCustomization = () => {
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
        title: getText('error', language),
        description: 'Failed to load site settings',
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const updateSetting = async (key: string, value: any) => {
    try {
      const { error } = await supabase
        .from('site_settings')
        .upsert({
          setting_key: key,
          setting_value: value,
          updated_by: (await supabase.auth.getUser()).data.user?.id
        });

      if (error) throw error;

      setSettings(prev => ({ ...prev, [key]: value }));
    } catch (error) {
      console.error('Error updating setting:', error);
      throw error;
    }
  };

  const handleSaveAll = async () => {
    setIsSaving(true);
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError) {
        throw new Error(`Authentication error: ${authError.message}`);
      }
      
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Filter out empty settings and prepare updates
      const updates = Object.entries(settings)
        .filter(([_, value]) => value !== '' && value !== null && value !== undefined)
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

      if (error) throw error;

      toast({
        title: getText('success', language),
        description: 'Wszystkie ustawienia zostały zapisane',
      });
    } catch (error) {
      console.error('Error saving settings:', error);
      toast({
        title: getText('error', language),
        description: 'Błąd podczas zapisywania ustawień: ' + (error as Error).message,
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
          <h2 className="text-2xl font-bold">{getText('siteCustomization', language)}</h2>
          <p className="text-muted-foreground">
            {getText('customizePageAppearance', language)}
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
                Zapisz wszystko
              </>
            )}
          </Button>
        </div>
      </div>

      <Tabs defaultValue="content" className="w-full">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="content">Treść</TabsTrigger>
          <TabsTrigger value="branding">Branding</TabsTrigger>
          <TabsTrigger value="appearance">Wygląd</TabsTrigger>
          <TabsTrigger value="features">Funkcje</TabsTrigger>
          <TabsTrigger value="security">Bezpieczeństwo</TabsTrigger>
          <TabsTrigger value="advanced">Zaawansowane</TabsTrigger>
        </TabsList>

        <TabsContent value="content" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="w-5 h-5" />
                Treść strony głównej
              </CardTitle>
              <CardDescription>
                Dostosuj tytuły i opisy wyświetlane na stronie głównej
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Tytuł (Polski)</Label>
                  <Input
                    value={settings.homepage_title?.pl || ''}
                    onChange={(e) => handleInputChange('homepage_title', {
                      ...settings.homepage_title,
                      pl: e.target.value
                    })}
                    placeholder="3D Model Viewer"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Tytuł (Angielski)</Label>
                  <Input
                    value={settings.homepage_title?.en || ''}
                    onChange={(e) => handleInputChange('homepage_title', {
                      ...settings.homepage_title,
                      en: e.target.value
                    })}
                    placeholder="3D Model Viewer"
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Podtytuł (Polski)</Label>
                  <Textarea
                    value={settings.homepage_subtitle?.pl || ''}
                    onChange={(e) => handleInputChange('homepage_subtitle', {
                      ...settings.homepage_subtitle,
                      pl: e.target.value
                    })}
                    placeholder="Profesjonalne przeglądanie i drukowanie modeli 3D"
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Podtytuł (Angielski)</Label>
                  <Textarea
                    value={settings.homepage_subtitle?.en || ''}
                    onChange={(e) => handleInputChange('homepage_subtitle', {
                      ...settings.homepage_subtitle,
                      en: e.target.value
                    })}
                    placeholder="Professional 3D model viewing and printing"
                    rows={3}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>URL obrazu tła</Label>
                <Input
                  value={settings.homepage_hero_image || ''}
                  onChange={(e) => handleInputChange('homepage_hero_image', e.target.value)}
                  placeholder="https://example.com/hero-image.jpg"
                />
                <p className="text-xs text-muted-foreground">
                  Pozostaw puste aby używać domyślnego gradientu
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Meta opis (Polski)</Label>
                  <Textarea
                    value={settings.meta_description?.pl || ''}
                    onChange={(e) => handleInputChange('meta_description', {
                      ...settings.meta_description,
                      pl: e.target.value
                    })}
                    placeholder="Profesjonalna platforma do przeglądania i drukowania modeli 3D"
                    rows={2}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Meta opis (Angielski)</Label>
                  <Textarea
                    value={settings.meta_description?.en || ''}
                    onChange={(e) => handleInputChange('meta_description', {
                      ...settings.meta_description,
                      en: e.target.value
                    })}
                    placeholder="Professional platform for viewing and printing 3D models"
                    rows={2}
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Słowa kluczowe (Polski)</Label>
                  <Input
                    value={settings.meta_keywords?.pl || ''}
                    onChange={(e) => handleInputChange('meta_keywords', {
                      ...settings.meta_keywords,
                      pl: e.target.value
                    })}
                    placeholder="3D, drukowanie, modele, viewer"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Słowa kluczowe (Angielski)</Label>
                  <Input
                    value={settings.meta_keywords?.en || ''}
                    onChange={(e) => handleInputChange('meta_keywords', {
                      ...settings.meta_keywords,
                      en: e.target.value
                    })}
                    placeholder="3D, printing, models, viewer"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="branding" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="w-5 h-5" />
                Branding i identyfikacja
              </CardTitle>
              <CardDescription>
                Ustaw nazwę firmy i informacje kontaktowe
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Nazwa firmy</Label>
                <Input
                  value={settings.company_name || ''}
                  onChange={(e) => handleInputChange('company_name', e.target.value)}
                  placeholder="Mobilne 3D"
                />
              </div>

              <div className="space-y-2">
                <Label>Email kontaktowy</Label>
                <Input
                  type="email"
                  value={settings.contact_email || ''}
                  onChange={(e) => handleInputChange('contact_email', e.target.value)}
                  placeholder="info@example.com"
                />
              </div>

              <div className="space-y-2">
                <Label>Telefon kontaktowy</Label>
                <Input
                  value={settings.contact_phone || ''}
                  onChange={(e) => handleInputChange('contact_phone', e.target.value)}
                  placeholder="+48 123 456 789"
                />
              </div>

              <div className="space-y-2">
                <Label>Adres firmy</Label>
                <Textarea
                  value={settings.company_address || ''}
                  onChange={(e) => handleInputChange('company_address', e.target.value)}
                  placeholder="ul. Przykładowa 123, 00-000 Warszawa"
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label>URL logo firmy</Label>
                <Input
                  value={settings.company_logo || ''}
                  onChange={(e) => handleInputChange('company_logo', e.target.value)}
                  placeholder="https://example.com/logo.png"
                />
              </div>

              <div className="space-y-2">
                <Label>Strona internetowa firmy</Label>
                <Input
                  value={settings.company_website || ''}
                  onChange={(e) => handleInputChange('company_website', e.target.value)}
                  placeholder="https://www.example.com"
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Godziny pracy</Label>
                  <Textarea
                    value={settings.business_hours || ''}
                    onChange={(e) => handleInputChange('business_hours', e.target.value)}
                    placeholder="Pon-Pt: 9:00-17:00"
                    rows={2}
                  />
                </div>
                <div className="space-y-2">
                  <Label>NIP</Label>
                  <Input
                    value={settings.company_nip || ''}
                    onChange={(e) => handleInputChange('company_nip', e.target.value)}
                    placeholder="1234567890"
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>REGON</Label>
                  <Input
                    value={settings.company_regon || ''}
                    onChange={(e) => handleInputChange('company_regon', e.target.value)}
                    placeholder="123456789"
                  />
                </div>
                <div className="space-y-2">
                  <Label>KRS</Label>
                  <Input
                    value={settings.company_krs || ''}
                    onChange={(e) => handleInputChange('company_krs', e.target.value)}
                    placeholder="0000123456"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="appearance" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="w-5 h-5" />
                Wygląd i motyw
              </CardTitle>
              <CardDescription>
                Dostosuj kolory, fonty i ogólny wygląd strony
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Główny kolor motywu</Label>
                  <Input
                    type="color"
                    value={settings.primary_color || '#3b82f6'}
                    onChange={(e) => handleInputChange('primary_color', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Kolor dodatkowy</Label>
                  <Input
                    type="color"
                    value={settings.secondary_color || '#64748b'}
                    onChange={(e) => handleInputChange('secondary_color', e.target.value)}
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Font nagłówków</Label>
                  <Select
                    value={settings.heading_font || 'Inter'}
                    onValueChange={(value) => handleInputChange('heading_font', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Wybierz font" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Inter">Inter</SelectItem>
                      <SelectItem value="Roboto">Roboto</SelectItem>
                      <SelectItem value="Open Sans">Open Sans</SelectItem>
                      <SelectItem value="Montserrat">Montserrat</SelectItem>
                      <SelectItem value="Poppins">Poppins</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Font tekstu</Label>
                  <Select
                    value={settings.body_font || 'Inter'}
                    onValueChange={(value) => handleInputChange('body_font', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Wybierz font" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Inter">Inter</SelectItem>
                      <SelectItem value="Roboto">Roboto</SelectItem>
                      <SelectItem value="Open Sans">Open Sans</SelectItem>
                      <SelectItem value="Source Sans Pro">Source Sans Pro</SelectItem>
                      <SelectItem value="Lato">Lato</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label>Tryb ciemny domyślnie</Label>
                  <p className="text-sm text-muted-foreground">
                    Strona będzie domyślnie uruchamiać się w trybie ciemnym
                  </p>
                </div>
                <Switch
                  checked={settings.default_dark_mode || false}
                  onCheckedChange={(checked) => handleInputChange('default_dark_mode', checked)}
                />
              </div>

              <div className="space-y-2">
                <Label>Niestandardowy CSS</Label>
                <Textarea
                  value={settings.custom_css || ''}
                  onChange={(e) => handleInputChange('custom_css', e.target.value)}
                  placeholder="/* Dodaj swój niestandardowy CSS */"
                  rows={6}
                />
                <p className="text-xs text-muted-foreground">
                  Ostrożnie! Niestandardowy CSS może wpłynąć na wygląd całej strony
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="features" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Funkcje platformy</CardTitle>
              <CardDescription>
                Włącz lub wyłącz różne funkcje platformy
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label>Włącz system płatności</Label>
                  <p className="text-sm text-muted-foreground">
                    Pozwala klientom składać zamówienia z cenami
                  </p>
                </div>
                <Switch
                  checked={settings.pricing_enabled || false}
                  onCheckedChange={(checked) => handleInputChange('pricing_enabled', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label>Tryb konserwacji</Label>
                  <p className="text-sm text-muted-foreground">
                    Wyświetla stronę konserwacji dla wszystkich użytkowników
                  </p>
                </div>
                <Switch
                  checked={settings.maintenance_mode || false}
                  onCheckedChange={(checked) => handleInputChange('maintenance_mode', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label>Rejestracja nowych użytkowników</Label>
                  <p className="text-sm text-muted-foreground">
                    Pozwala nowym użytkownikom na tworzenie kont
                  </p>
                </div>
                <Switch
                  checked={settings.registration_enabled !== false}
                  onCheckedChange={(checked) => handleInputChange('registration_enabled', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label>Powiadomienia email</Label>
                  <p className="text-sm text-muted-foreground">
                    Wysyła emaile o statusie zamówień i ważnych wydarzeniach
                  </p>
                </div>
                <Switch
                  checked={settings.email_notifications || false}
                  onCheckedChange={(checked) => handleInputChange('email_notifications', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label>Publiczny podgląd modeli</Label>
                  <p className="text-sm text-muted-foreground">
                    Pozwala niezalogowanym użytkownikom przeglądać publiczne modele
                  </p>
                </div>
                <Switch
                  checked={settings.public_model_viewing !== false}
                  onCheckedChange={(checked) => handleInputChange('public_model_viewing', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label>Komentarze użytkowników</Label>
                  <p className="text-sm text-muted-foreground">
                    Pozwala użytkownikom komentować modele
                  </p>
                </div>
                <Switch
                  checked={settings.comments_enabled || false}
                  onCheckedChange={(checked) => handleInputChange('comments_enabled', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label>Oceny modeli</Label>
                  <p className="text-sm text-muted-foreground">
                    Pozwala użytkownikom oceniać modele gwiazdkami
                  </p>
                </div>
                <Switch
                  checked={settings.ratings_enabled || false}
                  onCheckedChange={(checked) => handleInputChange('ratings_enabled', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label>Udostępnianie społecznościowe</Label>
                  <p className="text-sm text-muted-foreground">
                    Przyciski udostępniania w mediach społecznościowych
                  </p>
                </div>
                <Switch
                  checked={settings.social_sharing || false}
                  onCheckedChange={(checked) => handleInputChange('social_sharing', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label>Analityka Google</Label>
                  <p className="text-sm text-muted-foreground">
                    Włącz śledzenie Google Analytics
                  </p>
                </div>
                <Switch
                  checked={settings.google_analytics_enabled || false}
                  onCheckedChange={(checked) => handleInputChange('google_analytics_enabled', checked)}
                />
              </div>

              {settings.google_analytics_enabled && (
                <div className="space-y-2">
                  <Label>ID Google Analytics</Label>
                  <Input
                    value={settings.google_analytics_id || ''}
                    onChange={(e) => handleInputChange('google_analytics_id', e.target.value)}
                    placeholder="G-XXXXXXXXXX"
                  />
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Bezpieczeństwo i prywatność
              </CardTitle>
              <CardDescription>
                Ustawienia związane z bezpieczeństwem i prywatnością
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label>Dwuetapowa weryfikacja</Label>
                  <p className="text-sm text-muted-foreground">
                    Wymagaj 2FA dla nowych kont administratorów
                  </p>
                </div>
                <Switch
                  checked={settings.require_2fa_admin || false}
                  onCheckedChange={(checked) => handleInputChange('require_2fa_admin', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label>Automatyczne wylogowanie</Label>
                  <p className="text-sm text-muted-foreground">
                    Automatycznie wyloguj nieaktywnych użytkowników po 24h
                  </p>
                </div>
                <Switch
                  checked={settings.auto_logout || false}
                  onCheckedChange={(checked) => handleInputChange('auto_logout', checked)}
                />
              </div>

              <div className="space-y-2">
                <Label>Czas sesji (godziny)</Label>
                <Input
                  type="number"
                  min="1"
                  max="168"
                  value={settings.session_timeout || 24}
                  onChange={(e) => handleInputChange('session_timeout', parseInt(e.target.value))}
                  placeholder="24"
                />
                <p className="text-xs text-muted-foreground">
                  Po jakim czasie nieaktywności użytkownik zostanie wylogowany
                </p>
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label>Captcha na formularzu kontaktowym</Label>
                  <p className="text-sm text-muted-foreground">
                    Zabezpiecz formularz kontaktowy przed spamem
                  </p>
                </div>
                <Switch
                  checked={settings.captcha_enabled || false}
                  onCheckedChange={(checked) => handleInputChange('captcha_enabled', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label>Logowanie nieudanych prób</Label>
                  <p className="text-sm text-muted-foreground">
                    Zapisuj nieudane próby logowania w celach bezpieczeństwa
                  </p>
                </div>
                <Switch
                  checked={settings.log_failed_attempts || false}
                  onCheckedChange={(checked) => handleInputChange('log_failed_attempts', checked)}
                />
              </div>

              <div className="space-y-2">
                <Label>Dozwolone domeny email</Label>
                <Textarea
                  value={settings.allowed_email_domains || ''}
                  onChange={(e) => handleInputChange('allowed_email_domains', e.target.value)}
                  placeholder="gmail.com, company.com (jedna domena na linię)"
                  rows={3}
                />
                <p className="text-xs text-muted-foreground">
                  Pozostaw puste aby pozwolić wszystkie domeny. Jedna domena na linię.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="advanced" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Zaawansowane ustawienia</CardTitle>
              <CardDescription>
                Konfiguracja dla zaawansowanych użytkowników
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Polecane modele (ID oddzielone przecinkami)</Label>
                <Input
                  value={Array.isArray(settings.featured_models) ? settings.featured_models.join(', ') : ''}
                  onChange={(e) => {
                    const ids = e.target.value.split(',').map(id => id.trim()).filter(Boolean);
                    handleInputChange('featured_models', ids);
                  }}
                  placeholder="abc123, def456, ghi789"
                />
                <p className="text-xs text-muted-foreground">
                  Wprowadź ID modeli które mają być wyróżnione na stronie głównej
                </p>
              </div>

              <div className="space-y-2">
                <Label>Maksymalny rozmiar pliku (MB)</Label>
                <Input
                  type="number"
                  min="1"
                  max="100"
                  value={settings.max_file_size || 10}
                  onChange={(e) => handleInputChange('max_file_size', parseInt(e.target.value))}
                  placeholder="10"
                />
                <p className="text-xs text-muted-foreground">
                  Maksymalny rozmiar przesyłanych plików modeli 3D
                </p>
              </div>

              <div className="space-y-2">
                <Label>Domyślna waluta</Label>
                <Input
                  value={settings.default_currency || 'PLN'}
                  onChange={(e) => handleInputChange('default_currency', e.target.value)}
                  placeholder="PLN"
                />
              </div>

              <div className="space-y-2">
                <Label>Limit modeli na użytkownika</Label>
                <Input
                  type="number"
                  min="1"
                  value={settings.user_model_limit || 50}
                  onChange={(e) => handleInputChange('user_model_limit', parseInt(e.target.value))}
                  placeholder="50"
                />
                <p className="text-xs text-muted-foreground">
                  Maksymalna liczba modeli jaką może przesłać jeden użytkownik
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Domyślny język</Label>
                  <Select
                    value={settings.default_language || 'pl'}
                    onValueChange={(value) => handleInputChange('default_language', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Wybierz język" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pl">Polski</SelectItem>
                      <SelectItem value="en">English</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Strefa czasowa</Label>
                  <Select
                    value={settings.timezone || 'Europe/Warsaw'}
                    onValueChange={(value) => handleInputChange('timezone', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Wybierz strefę" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Europe/Warsaw">Europa/Warszawa</SelectItem>
                      <SelectItem value="Europe/London">Europa/Londyn</SelectItem>
                      <SelectItem value="America/New_York">Ameryka/Nowy Jork</SelectItem>
                      <SelectItem value="Asia/Tokyo">Azja/Tokio</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Niestandardowy JavaScript</Label>
                <Textarea
                  value={settings.custom_javascript || ''}
                  onChange={(e) => handleInputChange('custom_javascript', e.target.value)}
                  placeholder="// Dodaj swój niestandardowy JavaScript"
                  rows={6}
                />
                <p className="text-xs text-muted-foreground">
                  Ostrożnie! Niestandardowy kod JavaScript może wpłynąć na działanie strony
                </p>
              </div>

              <div className="space-y-2">
                <Label>Backup frequency (dni)</Label>
                <Input
                  type="number"
                  min="1"
                  max="30"
                  value={settings.backup_frequency || 7}
                  onChange={(e) => handleInputChange('backup_frequency', parseInt(e.target.value))}
                  placeholder="7"
                />
                <p className="text-xs text-muted-foreground">
                  Jak często system ma automatycznie tworzyć kopie zapasowe
                </p>
              </div>

              <div className="space-y-2">
                <Label>Debug mode</Label>
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={settings.debug_mode || false}
                    onCheckedChange={(checked) => handleInputChange('debug_mode', checked)}
                  />
                  <Label className="text-sm text-muted-foreground">
                    Włącz szczegółowe logowanie (tylko dla deweloperów)
                  </Label>
                </div>
              </div>

              <div className="p-4 bg-muted rounded-lg">
                <h4 className="font-medium mb-2">Podgląd ustawień JSON</h4>
                <pre className="text-xs bg-background p-2 rounded border overflow-auto max-h-32">
                  {JSON.stringify(settings, null, 2)}
                </pre>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};