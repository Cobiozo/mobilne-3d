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
import { Palette, Globe, Upload, Save, RefreshCw } from 'lucide-react';

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
      const updates = Object.entries(settings).map(([key, value]) => ({
        setting_key: key,
        setting_value: value,
        updated_by: null // Will be set by the trigger
      }));

      const { error } = await supabase
        .from('site_settings')
        .upsert(updates);

      if (error) throw error;

      toast({
        title: getText('success', language),
        description: 'Wszystkie ustawienia zostały zapisane',
      });
    } catch (error) {
      console.error('Error saving settings:', error);
      toast({
        title: getText('error', language),
        description: 'Failed to save settings',
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
          <h2 className="text-2xl font-bold">Personalizacja strony</h2>
          <p className="text-muted-foreground">
            Dostosuj wygląd i zawartość strony głównej
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
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="content">Treść</TabsTrigger>
          <TabsTrigger value="branding">Branding</TabsTrigger>
          <TabsTrigger value="features">Funkcje</TabsTrigger>
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