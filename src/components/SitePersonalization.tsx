import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useApp } from '@/contexts/AppContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Palette, Globe, Save, RefreshCw, Eye, Image } from 'lucide-react';

export const SitePersonalization = () => {
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
        description: 'Nie udało się załadować ustawień personalizacji',
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

      // Helper function to check if value is empty
      const isEmpty = (value: any): boolean => {
        if (value === null || value === undefined) return true;
        if (typeof value === 'string' && value.trim() === '') return true;
        if (typeof value === 'object' && !Array.isArray(value)) {
          // For objects like {pl: '', en: ''}, check if all values are empty
          return Object.values(value).every(v => 
            v === null || v === undefined || (typeof v === 'string' && v.trim() === '')
          );
        }
        return false;
      };

      // Prepare updates - don't filter out objects with nested values
      const updates = Object.entries(settings)
        .filter(([_, value]) => !isEmpty(value))
        .map(([key, value]) => {
          console.log(`Preparing to save ${key}:`, value);
          return {
            setting_key: key,
            setting_value: value,
            updated_by: user.id
          };
        });

      if (updates.length === 0) {
        toast({
          title: "Informacja",
          description: "Brak ustawień do zapisania",
          variant: "default",
        });
        return;
      }

      console.log('Saving updates:', updates);

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
        description: `Zapisano ${updates.length} ustawień personalizacji pomyślnie`,
        variant: "default",
      });

      // Trigger a refresh of site settings in the app context
      window.dispatchEvent(new CustomEvent('settingsUpdated'));
      
      // Refresh settings to confirm save
      await fetchSettings();
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
            <Palette className="w-6 h-6" />
            Personalizacja strony
          </h2>
          <p className="text-muted-foreground">
            Dostosuj wygląd i treści wyświetlane na stronie
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
                Zapisz personalizację
              </>
            )}
          </Button>
        </div>
      </div>

      <Tabs defaultValue="content" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="content">Treść</TabsTrigger>
          <TabsTrigger value="branding">Branding</TabsTrigger>
          <TabsTrigger value="appearance">Wygląd</TabsTrigger>
          <TabsTrigger value="media">Media</TabsTrigger>
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
                      <SelectItem value="Lato">Lato</SelectItem>
                      <SelectItem value="Montserrat">Montserrat</SelectItem>
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
                      <SelectItem value="Lato">Lato</SelectItem>
                      <SelectItem value="Source Sans Pro">Source Sans Pro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Rozmiar czcionki bazowej (px)</Label>
                <Input
                  type="number"
                  value={settings.base_font_size || 16}
                  onChange={(e) => handleInputChange('base_font_size', parseInt(e.target.value))}
                  placeholder="16"
                  min="12"
                  max="24"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="media" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Image className="w-5 h-5" />
                Grafiki i media
              </CardTitle>
              <CardDescription>
                Ustaw logo, obrazy tła i inne elementy graficzne
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Logo firmy</Label>
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      
                      try {
                        const fileExt = file.name.split('.').pop();
                        const fileName = `logo-${Date.now()}.${fileExt}`;
                        const { data, error } = await supabase.storage
                          .from('models')
                          .upload(`media/${fileName}`, file);
                        
                        if (error) throw error;
                        
                        const { data: { publicUrl } } = supabase.storage
                          .from('models')
                          .getPublicUrl(`media/${fileName}`);
                        
                        handleInputChange('company_logo', publicUrl);
                        toast({
                          title: "Sukces",
                          description: "Logo zostało wgrane",
                        });
                      } catch (error) {
                        console.error('Upload error:', error);
                        toast({
                          title: "Błąd",
                          description: "Nie udało się wgrać pliku",
                          variant: "destructive",
                        });
                      }
                    }}
                  />
                  <p className="text-xs text-muted-foreground">
                    lub podaj URL:
                  </p>
                  <Input
                    value={settings.company_logo || ''}
                    onChange={(e) => handleInputChange('company_logo', e.target.value)}
                    placeholder="https://example.com/logo.png"
                  />
                  {settings.company_logo && (
                    <img src={settings.company_logo} alt="Logo" className="h-16 object-contain" />
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Obraz tła strony głównej</Label>
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      
                      try {
                        const fileExt = file.name.split('.').pop();
                        const fileName = `hero-${Date.now()}.${fileExt}`;
                        const { data, error } = await supabase.storage
                          .from('models')
                          .upload(`media/${fileName}`, file);
                        
                        if (error) throw error;
                        
                        const { data: { publicUrl } } = supabase.storage
                          .from('models')
                          .getPublicUrl(`media/${fileName}`);
                        
                        handleInputChange('homepage_hero_image', publicUrl);
                        toast({
                          title: "Sukces",
                          description: "Obraz został wgrany",
                        });
                      } catch (error) {
                        console.error('Upload error:', error);
                        toast({
                          title: "Błąd",
                          description: "Nie udało się wgrać pliku",
                          variant: "destructive",
                        });
                      }
                    }}
                  />
                  <p className="text-xs text-muted-foreground">
                    lub podaj URL:
                  </p>
                  <Input
                    value={settings.homepage_hero_image || ''}
                    onChange={(e) => handleInputChange('homepage_hero_image', e.target.value)}
                    placeholder="https://example.com/hero-image.jpg"
                  />
                  {settings.homepage_hero_image && (
                    <img src={settings.homepage_hero_image} alt="Hero" className="h-32 object-cover rounded" />
                  )}
                  <p className="text-xs text-muted-foreground">
                    Pozostaw puste aby używać domyślnego gradientu
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Favicon</Label>
                  <Input
                    type="file"
                    accept="image/x-icon,image/png,image/svg+xml"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      
                      try {
                        const fileExt = file.name.split('.').pop();
                        const fileName = `favicon-${Date.now()}.${fileExt}`;
                        const { data, error } = await supabase.storage
                          .from('models')
                          .upload(`media/${fileName}`, file);
                        
                        if (error) throw error;
                        
                        const { data: { publicUrl } } = supabase.storage
                          .from('models')
                          .getPublicUrl(`media/${fileName}`);
                        
                        handleInputChange('favicon_url', publicUrl);
                        toast({
                          title: "Sukces",
                          description: "Favicon został wgrany",
                        });
                      } catch (error) {
                        console.error('Upload error:', error);
                        toast({
                          title: "Błąd",
                          description: "Nie udało się wgrać pliku",
                          variant: "destructive",
                        });
                      }
                    }}
                  />
                  <p className="text-xs text-muted-foreground">
                    lub podaj URL:
                  </p>
                  <Input
                    value={settings.favicon_url || ''}
                    onChange={(e) => handleInputChange('favicon_url', e.target.value)}
                    placeholder="https://example.com/favicon.ico"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Ogimage (dla social media)</Label>
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      
                      try {
                        const fileExt = file.name.split('.').pop();
                        const fileName = `og-${Date.now()}.${fileExt}`;
                        const { data, error } = await supabase.storage
                          .from('models')
                          .upload(`media/${fileName}`, file);
                        
                        if (error) throw error;
                        
                        const { data: { publicUrl } } = supabase.storage
                          .from('models')
                          .getPublicUrl(`media/${fileName}`);
                        
                        handleInputChange('og_image', publicUrl);
                        toast({
                          title: "Sukces",
                          description: "Obraz został wgrany",
                        });
                      } catch (error) {
                        console.error('Upload error:', error);
                        toast({
                          title: "Błąd",
                          description: "Nie udało się wgrać pliku",
                          variant: "destructive",
                        });
                      }
                    }}
                  />
                  <p className="text-xs text-muted-foreground">
                    lub podaj URL:
                  </p>
                  <Input
                    value={settings.og_image || ''}
                    onChange={(e) => handleInputChange('og_image', e.target.value)}
                    placeholder="https://example.com/og-image.jpg"
                  />
                  {settings.og_image && (
                    <img src={settings.og_image} alt="OG Image" className="h-32 object-cover rounded" />
                  )}
                  <p className="text-xs text-muted-foreground">
                    Obraz wyświetlany przy udostępnianiu na social media (1200x630px)
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};