import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { CreditCard, MoreVertical, Settings } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

interface PaymentMethod {
  id: string;
  method_key: string;
  name: string;
  description: string | null;
  icon_url: string | null;
  is_active: boolean;
  sort_order: number;
  config: any;
  created_at: string;
  updated_at: string;
}

const PaymentMethodsManagement = () => {
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null);
  const [configDialogOpen, setConfigDialogOpen] = useState(false);

  useEffect(() => {
    fetchPaymentMethods();
  }, []);

  const fetchPaymentMethods = async () => {
    try {
      const { data, error } = await supabase
        .from('payment_methods')
        .select('*')
        .order('sort_order');

      if (error) throw error;
      setMethods(data || []);
    } catch (error) {
      console.error('Error fetching payment methods:', error);
      toast.error('Błąd podczas ładowania metod płatności');
    } finally {
      setLoading(false);
    }
  };

  const toggleMethodStatus = async (method: PaymentMethod) => {
    try {
      const { error } = await supabase
        .from('payment_methods')
        .update({ is_active: !method.is_active })
        .eq('id', method.id);

      if (error) throw error;

      setMethods(methods.map(m => 
        m.id === method.id ? { ...m, is_active: !m.is_active } : m
      ));

      toast.success(
        method.is_active 
          ? 'Metoda płatności wyłączona' 
          : 'Metoda płatności włączona'
      );
    } catch (error) {
      console.error('Error toggling method:', error);
      toast.error('Błąd podczas zmiany statusu');
    }
  };

  const handleSaveConfig = async (methodId: string, config: any) => {
    try {
      const { error } = await supabase
        .from('payment_methods')
        .update({ config })
        .eq('id', methodId);

      if (error) throw error;

      setMethods(methods.map(m => 
        m.id === methodId ? { ...m, config } : m
      ));

      toast.success('Konfiguracja zapisana');
      setConfigDialogOpen(false);
    } catch (error) {
      console.error('Error saving config:', error);
      toast.error('Błąd podczas zapisywania konfiguracji');
    }
  };

  const getMethodIcon = (methodKey: string) => {
    // Return appropriate icon based on method key
    // For simplicity, using generic CreditCard icon
    return <CreditCard className="h-6 w-6" />;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Metody płatności</h2>
        <p className="text-muted-foreground mt-1">
          Zarządzaj dostępnymi metodami płatności w sklepie
        </p>
      </div>

      <div className="space-y-3">
        {methods.map((method) => (
          <Card key={method.id} className="transition-all hover:shadow-md">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4 flex-1">
                  <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-muted">
                    {method.icon_url ? (
                      <img src={method.icon_url} alt={method.name} className="w-8 h-8 object-contain" />
                    ) : (
                      getMethodIcon(method.method_key)
                    )}
                  </div>

                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold">{method.name}</h3>
                      <Badge variant={method.is_active ? "default" : "secondary"}>
                        {method.is_active ? "Włączone" : "Nieaktywne"}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {method.description || "Metoda płatności"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Switch
                    checked={method.is_active}
                    onCheckedChange={() => toggleMethodStatus(method)}
                  />

                  <Dialog open={configDialogOpen && selectedMethod?.id === method.id} onOpenChange={(open) => {
                    setConfigDialogOpen(open);
                    if (!open) setSelectedMethod(null);
                  }}>
                    <DialogTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedMethod(method)}
                      >
                        <Settings className="h-4 w-4 mr-1" />
                        Zarządzaj
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Konfiguracja: {method.name}</DialogTitle>
                        <DialogDescription>
                          Skonfiguruj szczegóły metody płatności
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label>Nazwa</Label>
                          <Input
                            value={method.name}
                            onChange={(e) => {
                              setMethods(methods.map(m =>
                                m.id === method.id ? { ...m, name: e.target.value } : m
                              ));
                            }}
                          />
                        </div>
                        <div>
                          <Label>Opis</Label>
                          <Textarea
                            value={method.description || ''}
                            onChange={(e) => {
                              setMethods(methods.map(m =>
                                m.id === method.id ? { ...m, description: e.target.value } : m
                              ));
                            }}
                            rows={3}
                          />
                        </div>
                        <div>
                          <Label>Kolejność wyświetlania</Label>
                          <Input
                            type="number"
                            value={method.sort_order}
                            onChange={(e) => {
                              setMethods(methods.map(m =>
                                m.id === method.id ? { ...m, sort_order: parseInt(e.target.value) } : m
                              ));
                            }}
                          />
                        </div>
                        <Button
                          onClick={() => handleSaveConfig(method.id, method.config)}
                          className="w-full"
                        >
                          Zapisz
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => {
                          setSelectedMethod(method);
                          setConfigDialogOpen(true);
                        }}
                      >
                        <Settings className="h-4 w-4 mr-2" />
                        Konfiguruj
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default PaymentMethodsManagement;
