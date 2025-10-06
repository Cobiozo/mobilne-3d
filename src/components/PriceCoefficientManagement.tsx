import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Calculator, Save, RefreshCw } from 'lucide-react';

interface PriceCoefficient {
  id: string;
  coefficient_name: string;
  coefficient_value: number;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export const PriceCoefficientManagement = () => {
  const [coefficients, setCoefficients] = useState<PriceCoefficient[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [editingCoefficient, setEditingCoefficient] = useState<PriceCoefficient | null>(null);

  useEffect(() => {
    fetchCoefficients();
  }, []);

  const fetchCoefficients = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('price_coefficients')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCoefficients(data || []);
      
      // Set the first active coefficient as editing by default
      const activeCoefficient = data?.find(c => c.is_active);
      if (activeCoefficient && !editingCoefficient) {
        setEditingCoefficient(activeCoefficient);
      }
    } catch (error) {
      console.error('Error fetching coefficients:', error);
      toast.error('Nie udało się pobrać współczynników cen');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!editingCoefficient) return;

    try {
      setIsSaving(true);
      const { error } = await supabase
        .from('price_coefficients')
        .update({
          coefficient_name: editingCoefficient.coefficient_name,
          coefficient_value: editingCoefficient.coefficient_value,
          description: editingCoefficient.description,
          is_active: editingCoefficient.is_active,
        })
        .eq('id', editingCoefficient.id);

      if (error) throw error;

      toast.success('Współczynnik ceny został zapisany');
      await fetchCoefficients();
    } catch (error) {
      console.error('Error saving coefficient:', error);
      toast.error('Nie udało się zapisać współczynnika');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="w-5 h-5" />
            Współczynnik cen
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }


  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="w-5 h-5" />
              Współczynnik ceny
            </CardTitle>
            <CardDescription>
              Zarządzaj współczynnikiem cenowym używanym do obliczania cen końcowych
            </CardDescription>
          </div>
          <Button onClick={fetchCoefficients} variant="outline" size="sm">
            <RefreshCw className="w-4 h-4 mr-2" />
            Odśwież
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {!editingCoefficient && coefficients.length === 0 ? (
          <div className="py-8 text-center">
            <Calculator className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">Brak współczynników cen w systemie</p>
          </div>
        ) : editingCoefficient ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="coefficient-name">Nazwa współczynnika</Label>
              <Input
                id="coefficient-name"
                value={editingCoefficient.coefficient_name}
                onChange={(e) =>
                  setEditingCoefficient({
                    ...editingCoefficient,
                    coefficient_name: e.target.value,
                  })
                }
                placeholder="np. Współczynnik ceny za cm³"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="coefficient-value">Wartość współczynnika (PLN za cm³)</Label>
              <Input
                id="coefficient-value"
                type="number"
                step="0.01"
                min="0"
                value={editingCoefficient.coefficient_value}
                onChange={(e) =>
                  setEditingCoefficient({
                    ...editingCoefficient,
                    coefficient_value: parseFloat(e.target.value) || 0,
                  })
                }
                placeholder="0.20"
              />
              <p className="text-xs text-muted-foreground">
                Aktualna wartość: {editingCoefficient.coefficient_value} PLN za cm³
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="coefficient-description">Opis</Label>
              <Textarea
                id="coefficient-description"
                value={editingCoefficient.description || ''}
                onChange={(e) =>
                  setEditingCoefficient({
                    ...editingCoefficient,
                    description: e.target.value,
                  })
                }
                placeholder="Dodaj opis współczynnika..."
                rows={3}
              />
            </div>

            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="space-y-0.5">
                <Label htmlFor="is-active">Aktywny współczynnik</Label>
                <p className="text-xs text-muted-foreground">
                  Ten współczynnik będzie używany do obliczeń cen
                </p>
              </div>
              <Switch
                id="is-active"
                checked={editingCoefficient.is_active}
                onCheckedChange={(checked) =>
                  setEditingCoefficient({
                    ...editingCoefficient,
                    is_active: checked,
                  })
                }
              />
            </div>

            <div className="flex gap-2 pt-4">
              <Button onClick={handleSave} disabled={isSaving} className="flex-1">
                <Save className="w-4 h-4 mr-2" />
                {isSaving ? 'Zapisywanie...' : 'Zapisz zmiany'}
              </Button>
            </div>

            <div className="mt-4 p-4 bg-muted/50 rounded-lg space-y-3">
              <h4 className="text-sm font-medium">Podgląd obliczeń</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Przykładowa objętość:</span>
                  <span className="font-medium">100 cm³</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Cena końcowa:</span>
                  <span className="font-medium">
                    {(100 * editingCoefficient.coefficient_value).toFixed(2)} PLN
                  </span>
                </div>
                <div className="flex justify-between pt-2 border-t">
                  <span className="text-muted-foreground">Przykładowa objętość:</span>
                  <span className="font-medium">500 cm³</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Cena końcowa:</span>
                  <span className="font-medium">
                    {(500 * editingCoefficient.coefficient_value).toFixed(2)} PLN
                  </span>
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
};
