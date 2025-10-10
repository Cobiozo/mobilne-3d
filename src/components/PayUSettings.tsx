import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const PayUSettings = () => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [settings, setSettings] = useState({
    id: "",
    pos_id: "",
    client_id: "",
    environment: "sandbox",
    is_active: true,
  });
  const [md5Key, setMd5Key] = useState("");
  const [clientSecret, setClientSecret] = useState("");

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("payu_settings")
        .select("*")
        .maybeSingle();

      if (error) throw error;
      if (data) {
        setSettings({
          id: data.id,
          pos_id: data.pos_id,
          client_id: data.client_id,
          environment: data.environment,
          is_active: data.is_active,
        });
      }
    } catch (error) {
      console.error("Error fetching PayU settings:", error);
      toast({
        title: "Błąd",
        description: "Nie udało się pobrać ustawień PayU",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    // Walidacja wymaganych pól
    if (!settings.pos_id?.trim() || !settings.client_id?.trim()) {
      toast({
        title: "Błąd walidacji",
        description: "POS ID i Client ID są wymagane",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const updateData: any = {
        pos_id: settings.pos_id.trim(),
        client_id: settings.client_id.trim(),
        environment: settings.environment,
        is_active: settings.is_active,
      };

      // Encrypt MD5 if provided
      if (md5Key.trim()) {
        const { data: encryptedMd5, error: encryptError } = await supabase
          .rpc('encrypt_payu_credential', { credential: md5Key });
        
        if (encryptError) throw encryptError;
        updateData.md5_encrypted = encryptedMd5;
      }

      // Encrypt Client Secret if provided
      if (clientSecret.trim()) {
        const { data: encryptedSecret, error: encryptError } = await supabase
          .rpc('encrypt_payu_credential', { credential: clientSecret });
        
        if (encryptError) throw encryptError;
        updateData.client_secret_encrypted = encryptedSecret;
      }

      let error;
      if (settings.id) {
        ({ error } = await supabase
          .from("payu_settings")
          .update(updateData)
          .eq("id", settings.id));
      } else {
        ({ error } = await supabase
          .from("payu_settings")
          .insert([updateData]));
      }

      if (error) throw error;

      if (md5Key.trim() || clientSecret.trim()) {
        setMd5Key("");
        setClientSecret("");
      }

      toast({
        title: "Sukces",
        description: "Ustawienia PayU zostały zapisane",
      });
      
      await fetchSettings();
    } catch (error) {
      console.error("Error saving PayU settings:", error);
      toast({
        title: "Błąd",
        description: "Nie udało się zapisać ustawień PayU",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
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
          <CardTitle>Ustawienia PayU</CardTitle>
          <CardDescription>
            Skonfiguruj integrację z systemem płatności PayU
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="pos_id">POS ID</Label>
              <Input
                id="pos_id"
                value={settings.pos_id}
                onChange={(e) => handleInputChange("pos_id", e.target.value)}
                placeholder="4409475"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="client_id">Client ID</Label>
              <Input
                id="client_id"
                value={settings.client_id}
                onChange={(e) => handleInputChange("client_id", e.target.value)}
                placeholder="4409475"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="md5_key">Klucz MD5</Label>
              <Input
                id="md5_key"
                type="password"
                value={md5Key}
                onChange={(e) => setMd5Key(e.target.value)}
                placeholder="Wpisz nowy klucz aby go zmienić"
              />
              <p className="text-xs text-muted-foreground">
                Klucz będzie zaszyfrowany w bazie
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="client_secret">Client Secret</Label>
              <Input
                id="client_secret"
                type="password"
                value={clientSecret}
                onChange={(e) => setClientSecret(e.target.value)}
                placeholder="Wpisz nowy secret aby go zmienić"
              />
              <p className="text-xs text-muted-foreground">
                Secret będzie zaszyfrowany w bazie
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="environment">Środowisko</Label>
              <Select
                value={settings.environment}
                onValueChange={(value) => handleInputChange("environment", value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sandbox">Sandbox (Testowe)</SelectItem>
                  <SelectItem value="production">Production (Produkcyjne)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center space-x-2 pt-8">
              <Switch
                id="is_active"
                checked={settings.is_active}
                onCheckedChange={(checked) => handleInputChange("is_active", checked)}
              />
              <Label htmlFor="is_active">Aktywne</Label>
            </div>
          </div>

          <Button onClick={handleSave} disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Zapisz ustawienia
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};
