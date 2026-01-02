import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { GripVertical } from "lucide-react";

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
  const [isConfigDialogOpen, setIsConfigDialogOpen] = useState(false);
  const [draggedItem, setDraggedItem] = useState<PaymentMethod | null>(null);

  useEffect(() => {
    fetchMethods();
  }, []);

  const fetchMethods = async () => {
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

  const toggleMethod = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('payment_methods')
        .update({ is_active: !currentStatus })
        .eq('id', id);

      if (error) throw error;

      setMethods(methods.map(m => 
        m.id === id ? { ...m, is_active: !currentStatus } : m
      ));

      toast.success(
        !currentStatus ? 'Metoda płatności włączona' : 'Metoda płatności wyłączona'
      );
    } catch (error) {
      console.error('Error toggling payment method:', error);
      toast.error('Błąd podczas zmiany statusu');
    }
  };

  const updateMethod = async (id: string, updates: Partial<PaymentMethod>) => {
    try {
      const { error } = await supabase
        .from('payment_methods')
        .update(updates)
        .eq('id', id);

      if (error) throw error;

      await fetchMethods();
      toast.success('Metoda płatności zaktualizowana');
      setIsConfigDialogOpen(false);
    } catch (error) {
      console.error('Error updating payment method:', error);
      toast.error('Błąd podczas aktualizacji');
    }
  };

  const handleDragStart = (method: PaymentMethod) => {
    setDraggedItem(method);
  };

  const handleDragOver = (e: React.DragEvent, targetMethod: PaymentMethod) => {
    e.preventDefault();
    
    if (!draggedItem || draggedItem.id === targetMethod.id) return;

    const draggedIndex = methods.findIndex(m => m.id === draggedItem.id);
    const targetIndex = methods.findIndex(m => m.id === targetMethod.id);

    if (draggedIndex === -1 || targetIndex === -1) return;

    const newMethods = [...methods];
    newMethods.splice(draggedIndex, 1);
    newMethods.splice(targetIndex, 0, draggedItem);

    // Update sort_order based on new positions
    const updatedMethods = newMethods.map((m, index) => ({
      ...m,
      sort_order: index
    }));

    setMethods(updatedMethods);
  };

  const handleDragEnd = async () => {
    if (!draggedItem) return;

    try {
      // Update all methods with their new sort_order
      const updates = methods.map((method, index) => ({
        id: method.id,
        sort_order: index
      }));

      for (const update of updates) {
        await supabase
          .from('payment_methods')
          .update({ sort_order: update.sort_order })
          .eq('id', update.id);
      }

      toast.success('Kolejność metod płatności zaktualizowana');
    } catch (error) {
      console.error('Error updating sort order:', error);
      toast.error('Błąd podczas zmiany kolejności');
      fetchMethods(); // Reload on error
    } finally {
      setDraggedItem(null);
    }
  };

  const getMethodIcon = (methodKey: string) => {
    const iconMap: Record<string, string> = {
      traditional: '🏦',
      payu_standard: 'PayU',
      payu_card: '💳',
      payu_blik: 'BLIK',
      payu_bank_list: 'PayU',
      payu_installments: 'PayU',
      payu_klarna: 'Klarna',
      payu_paypo: 'PayPo',
      payu_twisto: 'Twisto',
      payu_twisto_3: 'Twisto',
      payu_secure_form: 'PayU',
    };
    return iconMap[methodKey] || 'PayU';
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Metody płatności</h2>
          <p className="text-muted-foreground">
            Zarządzaj dostępnymi metodami płatności w sklepie
          </p>
        </div>
      </div>

      <div className="space-y-2">
        {methods.map((method) => (
          <Card 
            key={method.id} 
            className="hover:shadow-md transition-shadow cursor-move"
            draggable
            onDragStart={() => handleDragStart(method)}
            onDragOver={(e) => handleDragOver(e, method)}
            onDragEnd={handleDragEnd}
          >
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <div className="cursor-grab active:cursor-grabbing">
                  <GripVertical className="h-5 w-5 text-muted-foreground" />
                </div>
                <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-muted">
                  <span className="text-lg font-bold">
                    {getMethodIcon(method.method_key)}
                  </span>
                </div>

                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold">{method.name}</h3>
                    <Badge variant={method.is_active ? "default" : "secondary"}>
                      {method.is_active ? "Włączone" : "Nieaktywne"}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {method.description || 'Brak opisu'}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant={method.is_active ? "outline" : "default"}
                    size="sm"
                    onClick={() => toggleMethod(method.id, method.is_active)}
                  >
                    {method.is_active ? "Wyłącz" : "Włącz"}
                  </Button>

                  <Dialog 
                    open={isConfigDialogOpen && selectedMethod?.id === method.id}
                    onOpenChange={(open) => {
                      setIsConfigDialogOpen(open);
                      if (open) setSelectedMethod(method);
                    }}
                  >
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm">
                        Zarządzaj
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl">
                      <DialogHeader>
                        <DialogTitle>Konfiguracja: {method.name}</DialogTitle>
                        <DialogDescription>
                          Edytuj ustawienia metody płatności
                        </DialogDescription>
                      </DialogHeader>

                      <div className="space-y-4 py-4">
                        <div>
                          <Label htmlFor="name">Nazwa</Label>
                          <Input
                            id="name"
                            defaultValue={method.name}
                            onChange={(e) => {
                              if (selectedMethod) {
                                setSelectedMethod({
                                  ...selectedMethod,
                                  name: e.target.value
                                });
                              }
                            }}
                          />
                        </div>

                        <div>
                          <Label htmlFor="description">Opis</Label>
                          <Textarea
                            id="description"
                            defaultValue={method.description || ''}
                            onChange={(e) => {
                              if (selectedMethod) {
                                setSelectedMethod({
                                  ...selectedMethod,
                                  description: e.target.value
                                });
                              }
                            }}
                          />
                        </div>

                        {method.method_key === 'traditional' && (
                          <>
                            <div>
                              <Label htmlFor="account_number">Numer konta bankowego</Label>
                              <Input
                                id="account_number"
                                defaultValue={method.config?.account_number || ''}
                                placeholder="PL00 0000 0000 0000 0000 0000 0000"
                                onChange={(e) => {
                                  if (selectedMethod) {
                                    setSelectedMethod({
                                      ...selectedMethod,
                                      config: {
                                        ...selectedMethod.config,
                                        account_number: e.target.value
                                      }
                                    });
                                  }
                                }}
                              />
                            </div>
                            <div>
                              <Label htmlFor="account_holder">Nazwa odbiorcy</Label>
                              <Input
                                id="account_holder"
                                defaultValue={method.config?.account_holder || ''}
                                placeholder="Nazwa firmy / osoby"
                                onChange={(e) => {
                                  if (selectedMethod) {
                                    setSelectedMethod({
                                      ...selectedMethod,
                                      config: {
                                        ...selectedMethod.config,
                                        account_holder: e.target.value
                                      }
                                    });
                                  }
                                }}
                              />
                            </div>
                            <div>
                              <Label htmlFor="transfer_title">Tytuł przelewu (szablon)</Label>
                              <Input
                                id="transfer_title"
                                defaultValue={method.config?.transfer_title || ''}
                                placeholder="Zamówienie {order_number}"
                                onChange={(e) => {
                                  if (selectedMethod) {
                                    setSelectedMethod({
                                      ...selectedMethod,
                                      config: {
                                        ...selectedMethod.config,
                                        transfer_title: e.target.value
                                      }
                                    });
                                  }
                                }}
                              />
                              <p className="text-xs text-muted-foreground mt-1">
                                Użyj {'{order_number}'} dla numeru zamówienia
                              </p>
                            </div>
                          </>
                        )}

                        <div>
                          <Label htmlFor="sort_order">Kolejność sortowania</Label>
                          <Input
                            id="sort_order"
                            type="number"
                            defaultValue={method.sort_order}
                            onChange={(e) => {
                              if (selectedMethod) {
                                setSelectedMethod({
                                  ...selectedMethod,
                                  sort_order: parseInt(e.target.value)
                                });
                              }
                            }}
                          />
                        </div>

                        <div className="flex items-center gap-2">
                          <Switch
                            id="is_active"
                            checked={selectedMethod?.is_active}
                            onCheckedChange={(checked) => {
                              if (selectedMethod) {
                                setSelectedMethod({
                                  ...selectedMethod,
                                  is_active: checked
                                });
                              }
                            }}
                          />
                          <Label htmlFor="is_active">Aktywna</Label>
                        </div>
                      </div>

                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          onClick={() => setIsConfigDialogOpen(false)}
                        >
                          Anuluj
                        </Button>
                        <Button
                          onClick={() => {
                            if (selectedMethod) {
                              updateMethod(selectedMethod.id, {
                                name: selectedMethod.name,
                                description: selectedMethod.description,
                                sort_order: selectedMethod.sort_order,
                                is_active: selectedMethod.is_active,
                                config: selectedMethod.config
                              });
                            }
                          }}
                        >
                          Zapisz zmiany
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
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
