import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Loader2, TestTube } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export const EmailSettings = () => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [settings, setSettings] = useState({
    id: "",
    smtp_host: "",
    smtp_port: 587,
    smtp_secure: false,
    smtp_user: "",
    from_email: "",
    from_name: "",
    is_active: true,
    last_test_status: "",
    last_test_at: "",
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("smtp_settings")
        .select("*")
        .maybeSingle();

      if (error) throw error;
      if (data) {
        setSettings(data);
      }
    } catch (error) {
      console.error("Error fetching SMTP settings:", error);
      toast({
        title: "Błąd",
        description: "Nie udało się pobrać ustawień SMTP",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    setIsLoading(true);
    try {
      // Prepare data without id for insert
      const { id, last_test_status, last_test_at, ...dataToSave } = settings;
      
      const { error } = id
        ? await supabase
            .from("smtp_settings")
            .update(dataToSave)
            .eq("id", id)
        : await supabase
            .from("smtp_settings")
            .insert([dataToSave]);

      if (error) throw error;

      toast({
        title: "Sukces",
        description: "Ustawienia SMTP zostały zapisane",
      });
      
      await fetchSettings();
    } catch (error) {
      console.error("Error saving SMTP settings:", error);
      toast({
        title: "Błąd",
        description: "Nie udało się zapisać ustawień SMTP",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleTestConnection = async () => {
    if (!settings.from_email) {
      toast({
        title: "Błąd",
        description: "Najpierw zapisz ustawienia SMTP",
        variant: "destructive",
      });
      return;
    }

    setIsTesting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const { error } = await supabase.functions.invoke('send-notification', {
        body: {
          to: settings.from_email,
          subject: 'Test połączenia SMTP',
          html: '<h1>Test połączenia</h1><p>Twój serwer SMTP działa poprawnie!</p>',
          text: 'Test połączenia - Twój serwer SMTP działa poprawnie!',
        },
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
        },
      });

      if (error) throw error;

      // Update test status
      await supabase
        .from("smtp_settings")
        .update({
          last_test_status: "success",
          last_test_at: new Date().toISOString(),
        })
        .eq("id", settings.id);

      toast({
        title: "Sukces",
        description: "Test połączenia zakończony pomyślnie. Sprawdź swoją skrzynkę pocztową.",
      });
      
      await fetchSettings();
    } catch (error) {
      console.error("Error testing SMTP:", error);
      
      await supabase
        .from("smtp_settings")
        .update({
          last_test_status: "failed",
          last_test_at: new Date().toISOString(),
        })
        .eq("id", settings.id);

      toast({
        title: "Błąd",
        description: error instanceof Error ? error.message : "Test połączenia nie powiódł się",
        variant: "destructive",
      });
      
      await fetchSettings();
    } finally {
      setIsTesting(false);
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setSettings(prev => ({ ...prev, [field]: value }));
  };

  if (isLoading && !settings.id) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Ustawienia SMTP</CardTitle>
          <CardDescription>
            Skonfiguruj serwer SMTP do wysyłania emaili z aplikacji
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {settings.last_test_at && (
            <Alert variant={settings.last_test_status === "success" ? "default" : "destructive"}>
              <AlertDescription>
                Ostatni test: {new Date(settings.last_test_at).toLocaleString()} - {settings.last_test_status === "success" ? "Sukces" : "Błąd"}
              </AlertDescription>
            </Alert>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="smtp_host">Host SMTP</Label>
              <Input
                id="smtp_host"
                value={settings.smtp_host}
                onChange={(e) => handleInputChange("smtp_host", e.target.value)}
                placeholder="smtp.example.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="smtp_port">Port SMTP</Label>
              <Input
                id="smtp_port"
                type="number"
                value={settings.smtp_port}
                onChange={(e) => handleInputChange("smtp_port", parseInt(e.target.value))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="smtp_user">Użytkownik SMTP</Label>
              <Input
                id="smtp_user"
                value={settings.smtp_user}
                onChange={(e) => handleInputChange("smtp_user", e.target.value)}
                placeholder="user@example.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="from_email">Email nadawcy</Label>
              <Input
                id="from_email"
                type="email"
                value={settings.from_email}
                onChange={(e) => handleInputChange("from_email", e.target.value)}
                placeholder="noreply@example.com"
              />
            </div>

            <div className="space-y-2 col-span-2">
              <Label htmlFor="from_name">Nazwa nadawcy</Label>
              <Input
                id="from_name"
                value={settings.from_name}
                onChange={(e) => handleInputChange("from_name", e.target.value)}
                placeholder="Moja Firma"
              />
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="smtp_secure"
                checked={settings.smtp_secure}
                onCheckedChange={(checked) => handleInputChange("smtp_secure", checked)}
              />
              <Label htmlFor="smtp_secure">Użyj SSL/TLS</Label>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="is_active"
                checked={settings.is_active}
                onCheckedChange={(checked) => handleInputChange("is_active", checked)}
              />
              <Label htmlFor="is_active">Aktywne</Label>
            </div>
          </div>

          <Alert>
            <AlertDescription className="flex items-center justify-between">
              <span>Hasło SMTP jest przechowywane bezpiecznie w sekretach Supabase jako SMTP_PASSWORD</span>
              <Button
                variant="link"
                size="sm"
                onClick={() => window.open('https://supabase.com/dashboard/project/rzupsyhyoztaekcwmels/settings/functions', '_blank')}
              >
                Zaktualizuj hasło
              </Button>
            </AlertDescription>
          </Alert>

          <div className="flex gap-2">
            <Button onClick={handleSave} disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Zapisz ustawienia
            </Button>
            
            <Button
              onClick={handleTestConnection}
              disabled={isTesting || !settings.id}
              variant="outline"
            >
              {isTesting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <TestTube className="mr-2 h-4 w-4" />
              )}
              Testuj połączenie
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};