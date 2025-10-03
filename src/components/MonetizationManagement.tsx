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
  material_multipliers: {
    pla: number;
    abs: number;
    petg: number;
  };
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
    base_print_price: 50,
    material_multipliers: { pla: 1.0, abs: 1.2, petg: 1.3 }
  });
  const [wallets, setWallets] = useState<UserWallet[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [selectedUser, setSelectedUser] = useState<string>("");
  const [amount, setAmount] = useState<string>("");
  const [amountType, setAmountType] = useState<"coins" | "virtual">("coins");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchSettings();
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

  const fetchWallets = async () => {
    const { data, error } = await supabase
      .from('user_wallets')
      .select(`
        user_id,
        balance,
        virtual_currency,
        profiles!inner(display_name)
      `);

    if (error) {
      console.error('Error fetching wallets:', error);
      return;
    }

    const formatted = data?.map(w => ({
      user_id: w.user_id,
      balance: w.balance,
      virtual_currency: w.virtual_currency,
      display_name: (w.profiles as any)?.display_name || 'Nieznany użytkownik'
    })) || [];

    setWallets(formatted);
  };

  const fetchTransactions = async () => {
    const { data, error } = await supabase
      .from('wallet_transactions')
      .select(`
        id,
        user_id,
        amount,
        transaction_type,
        description,
        created_at,
        profiles!inner(display_name)
      `)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      console.error('Error fetching transactions:', error);
      return;
    }

    const formatted = data?.map(t => ({
      ...t,
      display_name: (t.profiles as any)?.display_name || 'Nieznany użytkownik'
    })) || [];

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

              <div className="space-y-2">
                <Label>Mnożniki materiałów</Label>
                <div className="grid gap-2">
                  <div className="grid grid-cols-2 gap-2">
                    <Label htmlFor="pla" className="text-sm">PLA</Label>
                    <Input
                      id="pla"
                      type="number"
                      step="0.1"
                      value={settings.material_multipliers.pla}
                      onChange={(e) => setSettings({
                        ...settings,
                        material_multipliers: { ...settings.material_multipliers, pla: parseFloat(e.target.value) }
                      })}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Label htmlFor="abs" className="text-sm">ABS</Label>
                    <Input
                      id="abs"
                      type="number"
                      step="0.1"
                      value={settings.material_multipliers.abs}
                      onChange={(e) => setSettings({
                        ...settings,
                        material_multipliers: { ...settings.material_multipliers, abs: parseFloat(e.target.value) }
                      })}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Label htmlFor="petg" className="text-sm">PETG</Label>
                    <Input
                      id="petg"
                      type="number"
                      step="0.1"
                      value={settings.material_multipliers.petg}
                      onChange={(e) => setSettings({
                        ...settings,
                        material_multipliers: { ...settings.material_multipliers, petg: parseFloat(e.target.value) }
                      })}
                    />
                  </div>
                </div>
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
