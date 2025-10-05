import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { DollarSign, Edit, Plus, RefreshCw } from 'lucide-react';

interface PriceCoefficient {
  id: string;
  coefficient_name: string;
  coefficient_value: number;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export const PriceCoefficientsManagement = () => {
  const [coefficients, setCoefficients] = useState<PriceCoefficient[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingCoefficient, setEditingCoefficient] = useState<PriceCoefficient | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    coefficient_name: '',
    coefficient_value: 0.10,
    description: '',
    is_active: true,
  });

  useEffect(() => {
    fetchCoefficients();
  }, []);

  const fetchCoefficients = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('price_coefficients')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCoefficients(data || []);
    } catch (error) {
      console.error('Error fetching coefficients:', error);
      toast.error('Nie udało się pobrać współczynników cen');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (coefficient: PriceCoefficient) => {
    setEditingCoefficient(coefficient);
    setFormData({
      coefficient_name: coefficient.coefficient_name,
      coefficient_value: coefficient.coefficient_value,
      description: coefficient.description || '',
      is_active: coefficient.is_active,
    });
    setIsDialogOpen(true);
  };

  const handleCreate = () => {
    setEditingCoefficient(null);
    setFormData({
      coefficient_name: '',
      coefficient_value: 0.10,
      description: '',
      is_active: true,
    });
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    try {
      if (editingCoefficient) {
        // Update existing
        const { error } = await supabase
          .from('price_coefficients')
          .update({
            coefficient_name: formData.coefficient_name,
            coefficient_value: formData.coefficient_value,
            description: formData.description,
            is_active: formData.is_active,
          })
          .eq('id', editingCoefficient.id);

        if (error) throw error;
        toast.success('Współczynnik został zaktualizowany');
      } else {
        // Create new
        const { error } = await supabase
          .from('price_coefficients')
          .insert({
            coefficient_name: formData.coefficient_name,
            coefficient_value: formData.coefficient_value,
            description: formData.description,
            is_active: formData.is_active,
          });

        if (error) throw error;
        toast.success('Współczynnik został dodany');
      }

      setIsDialogOpen(false);
      fetchCoefficients();
    } catch (error) {
      console.error('Error saving coefficient:', error);
      toast.error('Nie udało się zapisać współczynnika');
    }
  };

  const toggleActive = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('price_coefficients')
        .update({ is_active: !currentStatus })
        .eq('id', id);

      if (error) throw error;
      toast.success(currentStatus ? 'Współczynnik został dezaktywowany' : 'Współczynnik został aktywowany');
      fetchCoefficients();
    } catch (error) {
      console.error('Error toggling coefficient:', error);
      toast.error('Nie udało się zmienić statusu współczynnika');
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5" />
            Współczynniki cen
          </CardTitle>
          <CardDescription>Ładowanie...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="w-5 h-5" />
              Współczynniki cen
            </CardTitle>
            <CardDescription>
              Zarządzaj współczynnikami wykorzystywanymi do obliczania cen końcowych
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button onClick={fetchCoefficients} variant="outline" size="sm">
              <RefreshCw className="w-4 h-4 mr-2" />
              Odśwież
            </Button>
            <Button onClick={handleCreate} size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Dodaj współczynnik
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {coefficients.map((coefficient) => (
            <div
              key={coefficient.id}
              className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
            >
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="font-semibold text-lg">{coefficient.coefficient_name}</h3>
                  <Badge variant={coefficient.is_active ? 'default' : 'secondary'}>
                    {coefficient.is_active ? 'Aktywny' : 'Nieaktywny'}
                  </Badge>
                </div>
                {coefficient.description && (
                  <p className="text-sm text-muted-foreground mb-2">{coefficient.description}</p>
                )}
                <div className="flex items-center gap-4 text-sm">
                  <span className="font-mono font-bold text-primary text-lg">
                    {coefficient.coefficient_value.toFixed(2)} PLN/cm³
                  </span>
                  <span className="text-muted-foreground">
                    Ostatnia aktualizacja: {new Date(coefficient.updated_at).toLocaleString('pl-PL')}
                  </span>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => toggleActive(coefficient.id, coefficient.is_active)}
                >
                  <Switch checked={coefficient.is_active} className="pointer-events-none" />
                </Button>
                <Button variant="outline" size="sm" onClick={() => handleEdit(coefficient)}>
                  <Edit className="w-4 h-4 mr-2" />
                  Edytuj
                </Button>
              </div>
            </div>
          ))}

          {coefficients.length === 0 && (
            <div className="py-12 text-center">
              <DollarSign className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground mb-4">Brak współczynników cen</p>
              <Button onClick={handleCreate}>
                <Plus className="w-4 h-4 mr-2" />
                Dodaj pierwszy współczynnik
              </Button>
            </div>
          )}
        </div>
      </CardContent>

      {/* Edit/Create Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingCoefficient ? 'Edytuj współczynnik' : 'Dodaj nowy współczynnik'}
            </DialogTitle>
            <DialogDescription>
              Wprowadź dane współczynnika ceny używanego do obliczania ceny końcowej
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="coefficient_name">Nazwa współczynnika</Label>
              <Input
                id="coefficient_name"
                value={formData.coefficient_name}
                onChange={(e) => setFormData({ ...formData, coefficient_name: e.target.value })}
                placeholder="np. Współczynnik ceny za cm³"
              />
            </div>

            <div>
              <Label htmlFor="coefficient_value">Wartość współczynnika (PLN/cm³)</Label>
              <Input
                id="coefficient_value"
                type="number"
                step="0.01"
                min="0"
                value={formData.coefficient_value}
                onChange={(e) => setFormData({ ...formData, coefficient_value: parseFloat(e.target.value) || 0 })}
                placeholder="0.10"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Cena za jeden centymetr sześcienny objętości
              </p>
            </div>

            <div>
              <Label htmlFor="description">Opis</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Opcjonalny opis współczynnika..."
                rows={3}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="is_active">Aktywny</Label>
              <Switch
                id="is_active"
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 mt-6">
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Anuluj
            </Button>
            <Button onClick={handleSave}>
              Zapisz
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
};
