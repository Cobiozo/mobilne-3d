import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Coins, DollarSign, TrendingUp, Users, Settings } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface MonetizationSettings {
  coins_to_pln_rate: number;
  base_print_price: number;
}

interface Material {
  id: string;
  material_name: string;
  material_key: string;
  multiplier: number;
  is_active: boolean;
  sort_order: number;
}

interface UserWallet {
  user_id: string;
  balance: number;
  virtual_currency: number;
  display_name: string;
}

interface Transaction {
  id: string;
  user_id: string;
  amount: number;
  transaction_type: string;
  description: string;
  created_at: string;
  display_name: string;
}

export function MonetizationManagement() {
  const [settings, setSettings] = useState<MonetizationSettings>({
    coins_to_pln_rate: 100,
    base_print_price: 50
  });
  const [materials, setMaterials] = useState<Material[]>([]);
  const [wallets, setWallets] = useState<UserWallet[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [selectedUser, setSelectedUser] = useState<string>("");
  const [amount, setAmount] = useState<string>("");
  const [amountType, setAmountType] = useState<"coins" | "virtual">("coins");
  const [loading, setLoading] = useState(false);
  const [newMaterial, setNewMaterial] = useState({ name: '', key: '', multiplier: 1.0 });

  useEffect(() => {
    fetchSettings();
    fetchMaterials();
    fetchWallets();
    fetchTransactions();
  }, []);

  const fetchSettings = async () => {
    const { data, error } = await supabase
      .from('site_settings')
      .select('*')
      .eq('setting_key', 'monetization')
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching settings:', error);
      return;
    }

    if (data && data.setting_value) {
      setSettings(data.setting_value as unknown as MonetizationSettings);
    }
  };

  const fetchMaterials = async () => {
    const { data, error } = await supabase
      .from('available_materials')
      .select('*')
      .order('sort_order');

    if (error) {
      console.error('Error fetching materials:', error);
      return;
    }

    setMaterials(data || []);
  };

  const saveSettings = async () => {
    setLoading(true);
    
    const { data: existing } = await supabase
      .from('site_settings')
      .select('id')
      .eq('setting_key', 'monetization')
      .single();

    const settingData = {
      setting_key: 'monetization',
      setting_value: settings as any,
      description: 'Ustawienia monetyzacji'
    };

    let error;
    if (existing) {
      const result = await supabase
        .from('site_settings')
        .update(settingData)
        .eq('setting_key', 'monetization');
      error = result.error;
    } else {
      const result = await supabase
        .from('site_settings')
        .insert(settingData);
      error = result.error;
    }

    if (error) {
      toast({ title: "Błąd", description: "Nie udało się zapisać ustawień", variant: "destructive" });
    } else {
      toast({ title: "Sukces", description: "Ustawienia zapisane" });
    }
    setLoading(false);
  };

  const addMaterial = async () => {
    if (!newMaterial.name || !newMaterial.key) {
      toast({ title: "Błąd", description: "Wypełnij nazwę i klucz materiału", variant: "destructive" });
      return;
    }

    setLoading(true);
    const { error } = await supabase
      .from('available_materials')
      .insert({
        material_name: newMaterial.name,
        material_key: newMaterial.key,
        multiplier: newMaterial.multiplier,
        sort_order: materials.length + 1
      });

    if (error) {
      toast({ title: "Błąd", description: "Nie udało się dodać materiału", variant: "destructive" });
    } else {
      toast({ title: "Sukces", description: "Materiał dodany" });
      setNewMaterial({ name: '', key: '', multiplier: 1.0 });
      fetchMaterials();
    }
    setLoading(false);
  };

  const updateMaterial = async (id: string, updates: Partial<Material>) => {
    const { error } = await supabase
      .from('available_materials')
      .update(updates)
      .eq('id', id);

    if (error) {
      toast({ title: "Błąd", description: "Nie udało się zaktualizować materiału", variant: "destructive" });
    } else {
      toast({ title: "Sukces", description: "Materiał zaktualizowany" });
      fetchMaterials();
    }
  };

  const deleteMaterial = async (id: string) => {
    const { error } = await supabase
      .from('available_materials')
      .delete()
      .eq('id', id);

    if (error) {
      toast({ title: "Błąd", description: "Nie udało się usunąć materiału", variant: "destructive" });
    } else {
      toast({ title: "Sukces", description: "Materiał usunięty" });
      fetchMaterials();
    }
  };

  const fetchWallets = async () => {
    const { data: walletsData, error } = await supabase
      .from('user_wallets')
      .select('user_id, balance, virtual_currency');

    if (error) {
      console.error('Error fetching wallets:', error);
      return;
    }

    // Fetch profiles separately
    const userIds = walletsData?.map(w => w.user_id) || [];
    const { data: profilesData } = await supabase
      .from('profiles')
      .select('user_id, display_name')
      .in('user_id', userIds);

    const formatted = walletsData?.map(w => {
      const profile = profilesData?.find(p => p.user_id === w.user_id);
      return {
        user_id: w.user_id,
        balance: w.balance,
        virtual_currency: w.virtual_currency,
        display_name: profile?.display_name || 'Nieznany użytkownik'
      };
    }) || [];

    setWallets(formatted);
  };

  const fetchTransactions = async () => {
    const { data: transactionsData, error } = await supabase
      .from('wallet_transactions')
      .select('id, user_id, amount, transaction_type, description, created_at')
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      console.error('Error fetching transactions:', error);
      return;
    }

    // Fetch profiles separately
    const userIds = [...new Set(transactionsData?.map(t => t.user_id) || [])];
    const { data: profilesData } = await supabase
      .from('profiles')
      .select('user_id, display_name')
      .in('user_id', userIds);

    const formatted = transactionsData?.map(t => {
      const profile = profilesData?.find(p => p.user_id === t.user_id);
      return {
        ...t,
        display_name: profile?.display_name || 'Nieznany użytkownik'
      };
    }) || [];

    setTransactions(formatted);
  };

  const addFunds = async () => {
    if (!selectedUser || !amount) {
      toast({ title: "Błąd", description: "Wybierz użytkownika i wpisz kwotę", variant: "destructive" });
      return;
    }

    setLoading(true);
    const numAmount = parseFloat(amount);

    if (amountType === "coins") {
      // Fetch current balance
      const { data: wallet } = await supabase
        .from('user_wallets')
        .select('balance')
        .eq('user_id', selectedUser)
        .single();

      if (wallet) {
        const { error } = await supabase
          .from('user_wallets')
          .update({ balance: wallet.balance + numAmount })
          .eq('user_id', selectedUser);

        if (!error) {
          await supabase.from('wallet_transactions').insert({
            user_id: selectedUser,
            amount: numAmount,
            transaction_type: 'admin_grant',
            description: 'Monety przyznane przez administratora'
          });
          toast({ title: "Sukces", description: `Przyznano ${numAmount} monet` });
        }
      }
    } else {
      // Fetch current virtual currency
      const { data: wallet } = await supabase
        .from('user_wallets')
        .select('virtual_currency')
        .eq('user_id', selectedUser)
        .single();

      if (wallet) {
        const { error } = await supabase
          .from('user_wallets')
          .update({ virtual_currency: wallet.virtual_currency + numAmount })
          .eq('user_id', selectedUser);

        if (!error) {
          await supabase.from('wallet_transactions').insert({
            user_id: selectedUser,
            amount: numAmount,
            transaction_type: 'admin_grant',
            description: 'Wirtualna waluta przyznana przez administratora'
          });
          toast({ title: "Sukces", description: `Przyznano ${numAmount} zł wirtualnej waluty` });
        }
      }
    }

    setLoading(false);
    fetchWallets();
    fetchTransactions();
    setAmount("");
  };

  const totalCoins = wallets.reduce((sum, w) => sum + w.balance, 0);
  const totalVirtual = wallets.reduce((sum, w) => sum + w.virtual_currency, 0);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Łączne monety</CardTitle>
            <Coins className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCoins.toFixed(0)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Wirtualna waluta</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalVirtual.toFixed(2)} zł</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Użytkownicy z portfelami</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{wallets.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Kurs wymiany</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{settings.coins_to_pln_rate} : 1</div>
            <p className="text-xs text-muted-foreground">monet na 1 zł</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="settings" className="w-full">
        <TabsList>
          <TabsTrigger value="settings">Ustawienia</TabsTrigger>
          <TabsTrigger value="materials">Materiały</TabsTrigger>
          <TabsTrigger value="wallets">Portfele użytkowników</TabsTrigger>
          <TabsTrigger value="transactions">Transakcje</TabsTrigger>
        </TabsList>

        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Ustawienia monetyzacji
              </CardTitle>
              <CardDescription>
                Zarządzaj kursem wymiany i cenami usług
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="exchange-rate">Kurs wymiany (monet na 1 zł)</Label>
                <Input
                  id="exchange-rate"
                  type="number"
                  value={settings.coins_to_pln_rate}
                  onChange={(e) => setSettings({ ...settings, coins_to_pln_rate: parseFloat(e.target.value) })}
                />
                <p className="text-xs text-muted-foreground">
                  Ile monet użytkownik otrzyma za 1 zł wirtualnej waluty
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="base-price">Bazowa cena druku (zł)</Label>
                <Input
                  id="base-price"
                  type="number"
                  step="0.01"
                  value={settings.base_print_price}
                  onChange={(e) => setSettings({ ...settings, base_print_price: parseFloat(e.target.value) })}
                />
              </div>


              <Button onClick={saveSettings} disabled={loading}>
                Zapisz ustawienia
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Przyznaj środki użytkownikowi</CardTitle>
              <CardDescription>
                Dodaj monety lub wirtualną walutę do portfela użytkownika
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="user">Użytkownik</Label>
                <Select value={selectedUser} onValueChange={setSelectedUser}>
                  <SelectTrigger>
                    <SelectValue placeholder="Wybierz użytkownika" />
                  </SelectTrigger>
                  <SelectContent>
                    {wallets.map(w => (
                      <SelectItem key={w.user_id} value={w.user_id}>
                        {w.display_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="amount-type">Typ</Label>
                <Select value={amountType} onValueChange={(v) => setAmountType(v as "coins" | "virtual")}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="coins">Monety</SelectItem>
                    <SelectItem value="virtual">Wirtualna waluta (PLN)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="amount">Kwota</Label>
                <Input
                  id="amount"
                  type="number"
                  step={amountType === "coins" ? "1" : "0.01"}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder={amountType === "coins" ? "Liczba monet" : "Kwota w PLN"}
                />
              </div>

              <Button onClick={addFunds} disabled={loading}>
                Przyznaj środki
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="materials" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Zarządzaj materiałami</CardTitle>
              <CardDescription>Dodaj nowe materiały druku i ustaw ich mnożniki ceny</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2 md:grid-cols-4">
                <div className="space-y-2">
                  <Label htmlFor="new-material-name">Nazwa materiału</Label>
                  <Input
                    id="new-material-name"
                    value={newMaterial.name}
                    onChange={(e) => setNewMaterial({ ...newMaterial, name: e.target.value })}
                    placeholder="np. ASA"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new-material-key">Klucz (lowercase)</Label>
                  <Input
                    id="new-material-key"
                    value={newMaterial.key}
                    onChange={(e) => setNewMaterial({ ...newMaterial, key: e.target.value.toLowerCase() })}
                    placeholder="np. asa"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new-material-multiplier">Mnożnik</Label>
                  <Input
                    id="new-material-multiplier"
                    type="number"
                    step="0.1"
                    value={newMaterial.multiplier}
                    onChange={(e) => setNewMaterial({ ...newMaterial, multiplier: parseFloat(e.target.value) })}
                  />
                </div>
                <div className="flex items-end">
                  <Button onClick={addMaterial} disabled={loading}>Dodaj</Button>
                </div>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Kolejność</TableHead>
                    <TableHead>Nazwa</TableHead>
                    <TableHead>Klucz</TableHead>
                    <TableHead>Mnożnik</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Akcje</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {materials.map((material) => (
                    <TableRow key={material.id}>
                      <TableCell>
                        <Input
                          type="number"
                          value={material.sort_order}
                          onChange={(e) => updateMaterial(material.id, { sort_order: parseInt(e.target.value) })}
                          className="w-20"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          value={material.material_name}
                          onChange={(e) => updateMaterial(material.id, { material_name: e.target.value })}
                        />
                      </TableCell>
                      <TableCell>{material.material_key}</TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          step="0.1"
                          value={material.multiplier}
                          onChange={(e) => updateMaterial(material.id, { multiplier: parseFloat(e.target.value) })}
                          className="w-24"
                        />
                      </TableCell>
                      <TableCell>
                        <Badge variant={material.is_active ? "default" : "secondary"}>
                          {material.is_active ? 'Aktywny' : 'Nieaktywny'}
                        </Badge>
                      </TableCell>
                      <TableCell className="space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => updateMaterial(material.id, { is_active: !material.is_active })}
                        >
                          {material.is_active ? 'Dezaktywuj' : 'Aktywuj'}
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => deleteMaterial(material.id)}
                        >
                          Usuń
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="wallets">
          <Card>
            <CardHeader>
              <CardTitle>Portfele użytkowników</CardTitle>
              <CardDescription>Przegląd sald wszystkich użytkowników</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Użytkownik</TableHead>
                    <TableHead className="text-right">Monety</TableHead>
                    <TableHead className="text-right">Wirtualna waluta</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {wallets.map(w => (
                    <TableRow key={w.user_id}>
                      <TableCell>{w.display_name}</TableCell>
                      <TableCell className="text-right">{w.balance.toFixed(0)}</TableCell>
                      <TableCell className="text-right">{w.virtual_currency.toFixed(2)} zł</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="transactions">
          <Card>
            <CardHeader>
              <CardTitle>Historia transakcji</CardTitle>
              <CardDescription>Ostatnie 50 transakcji w systemie</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Użytkownik</TableHead>
                    <TableHead>Typ</TableHead>
                    <TableHead>Opis</TableHead>
                    <TableHead className="text-right">Kwota</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map(t => (
                    <TableRow key={t.id}>
                      <TableCell>{new Date(t.created_at).toLocaleString('pl-PL')}</TableCell>
                      <TableCell>{t.display_name}</TableCell>
                      <TableCell>
                        <Badge variant={t.amount > 0 ? "default" : "secondary"}>
                          {t.transaction_type}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-xs truncate">{t.description}</TableCell>
                      <TableCell className="text-right">
                        <span className={t.amount > 0 ? "text-green-600" : "text-red-600"}>
                          {t.amount > 0 ? '+' : ''}{t.amount.toFixed(2)} zł
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
