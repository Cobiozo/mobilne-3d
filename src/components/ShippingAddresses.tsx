import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useApp } from '@/contexts/AppContext';
import { getText } from '@/lib/i18n';
import { MapPin, Plus, Edit, Trash2, Star } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SavedParcelLockers } from '@/components/SavedParcelLockers';
import { useVisibilityChange } from '@/hooks/useVisibilityChange';

interface ShippingAddress {
  id: string;
  label: string;
  recipient_name: string;
  phone: string;
  address: string;
  city: string;
  postal_code: string;
  country: string;
  is_default: boolean;
}

interface ShippingAddressesProps {
  onAddressSelect?: (address: ShippingAddress) => void;
}

export const ShippingAddresses = ({ onAddressSelect }: ShippingAddressesProps = {}) => {
  const [addresses, setAddresses] = useState<ShippingAddress[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [editingAddress, setEditingAddress] = useState<ShippingAddress | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();
  const { language } = useApp();

  const emptyAddress: Omit<ShippingAddress, 'id'> = {
    label: 'Dom',
    recipient_name: '',
    phone: '',
    address: '',
    city: '',
    postal_code: '',
    country: 'Polska',
    is_default: false
  };

  const fetchAddresses = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) return;

      const { data, error } = await supabase
        .from('shipping_addresses')
        .select('*')
        .eq('user_id', user.id)
        .order('is_default', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;

      setAddresses(data || []);
    } catch (error) {
      console.error('Error fetching addresses:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAddresses();
  }, [fetchAddresses]);

  // Use centralized visibility change hook
  useVisibilityChange(fetchAddresses);


  const saveAddress = async (address: Omit<ShippingAddress, 'id'> & { id?: string }) => {
    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) return;

      if (address.id) {
        // Update existing
        const { error } = await supabase
          .from('shipping_addresses')
          .update({
            label: address.label,
            recipient_name: address.recipient_name,
            phone: address.phone,
            address: address.address,
            city: address.city,
            postal_code: address.postal_code,
            country: address.country,
            is_default: address.is_default
          })
          .eq('id', address.id);

        if (error) throw error;
      } else {
        // Create new
        const { error } = await supabase
          .from('shipping_addresses')
          .insert({
            user_id: user.id,
            label: address.label,
            recipient_name: address.recipient_name,
            phone: address.phone,
            address: address.address,
            city: address.city,
            postal_code: address.postal_code,
            country: address.country,
            is_default: address.is_default
          });

        if (error) throw error;
      }

      toast({
        title: getText('success', language),
        description: 'Adres został zapisany',
      });

      fetchAddresses();
      setIsDialogOpen(false);
      setEditingAddress(null);
    } catch (error: any) {
      toast({
        title: getText('error', language),
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const deleteAddress = async (id: string) => {
    try {
      const { error } = await supabase
        .from('shipping_addresses')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: getText('success', language),
        description: 'Adres został usunięty',
      });

      fetchAddresses();
    } catch (error: any) {
      toast({
        title: getText('error', language),
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const setDefaultAddress = async (id: string) => {
    try {
      const { error } = await supabase
        .from('shipping_addresses')
        .update({ is_default: true })
        .eq('id', id);

      if (error) throw error;

      toast({
        title: getText('success', language),
        description: 'Adres domyślny został zmieniony',
      });

      await fetchAddresses();

      // Notify parent component of the selected address
      if (onAddressSelect) {
        const selectedAddress = addresses.find(addr => addr.id === id);
        if (selectedAddress) {
          onAddressSelect({ ...selectedAddress, is_default: true });
        }
      }
    } catch (error: any) {
      toast({
        title: getText('error', language),
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  if (isLoading) {
    return <LoadingSpinner />;
  }

  return (
    <Tabs defaultValue="addresses" className="w-full">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="addresses">Moje adresy</TabsTrigger>
        <TabsTrigger value="lockers">Moje paczkomaty</TabsTrigger>
      </TabsList>
      
      <TabsContent value="addresses">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="w-5 h-5" />
                  Adresy wysyłkowe
                </CardTitle>
                <CardDescription>
                  Zarządzaj swoimi adresami dostaw
                </CardDescription>
              </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => setEditingAddress(null)}>
                <Plus className="w-4 h-4 mr-2" />
                Dodaj adres
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingAddress ? 'Edytuj adres' : 'Dodaj nowy adres'}
                </DialogTitle>
                <DialogDescription>
                  Wprowadź dane adresu dostawy
                </DialogDescription>
              </DialogHeader>
              <AddressForm
                address={editingAddress || emptyAddress}
                onSave={saveAddress}
                onCancel={() => {
                  setIsDialogOpen(false);
                  setEditingAddress(null);
                }}
                isSaving={isSaving}
              />
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {addresses.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2">
            {addresses.map((address) => (
              <div
                key={address.id}
                className="p-4 border rounded-lg hover:bg-muted/50 transition-colors relative"
              >
                {address.is_default && (
                  <Badge className="absolute top-2 right-2" variant="default">
                    <Star className="w-3 h-3 mr-1" />
                    Domyślny
                  </Badge>
                )}
                <div className="space-y-2">
                  <p className="font-semibold text-lg">{address.label}</p>
                  <p className="font-medium">{address.recipient_name}</p>
                  <p className="text-sm text-muted-foreground">{address.phone}</p>
                  <p className="text-sm">{address.address}</p>
                  <p className="text-sm">
                    {address.postal_code} {address.city}
                  </p>
                  <p className="text-sm text-muted-foreground">{address.country}</p>
                </div>
                <div className="flex gap-2 mt-4">
                  {onAddressSelect && (
                    <Button
                      size="sm"
                      variant="default"
                      onClick={() => onAddressSelect(address)}
                    >
                      Wybierz
                    </Button>
                  )}
                  {!address.is_default && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setDefaultAddress(address.id)}
                    >
                      Ustaw jako domyślny
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setEditingAddress(address);
                      setIsDialogOpen(true);
                    }}
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => deleteAddress(address.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <MapPin className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Brak adresów</h3>
            <p className="text-muted-foreground mb-4">
              Dodaj swój pierwszy adres dostawy
            </p>
            <Button onClick={() => setIsDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Dodaj adres
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
      </TabsContent>
      
      <TabsContent value="lockers">
        <SavedParcelLockers />
      </TabsContent>
    </Tabs>
  );
};

interface AddressFormProps {
  address: Omit<ShippingAddress, 'id'> & { id?: string };
  onSave: (address: Omit<ShippingAddress, 'id'> & { id?: string }) => void;
  onCancel: () => void;
  isSaving: boolean;
}

const AddressForm = ({ address, onSave, onCancel, isSaving }: AddressFormProps) => {
  const [formData, setFormData] = useState(address);

  const handleChange = (field: keyof typeof formData, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="label">Etykieta adresu *</Label>
        <Input
          id="label"
          value={formData.label}
          onChange={(e) => handleChange('label', e.target.value)}
          placeholder="np. Dom, Praca"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="recipient_name">Imię i nazwisko odbiorcy *</Label>
        <Input
          id="recipient_name"
          value={formData.recipient_name}
          onChange={(e) => handleChange('recipient_name', e.target.value)}
          placeholder="Jan Kowalski"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="phone">Telefon *</Label>
        <Input
          id="phone"
          type="tel"
          value={formData.phone}
          onChange={(e) => handleChange('phone', e.target.value)}
          placeholder="123 456 789"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="address">Adres *</Label>
        <Input
          id="address"
          value={formData.address}
          onChange={(e) => handleChange('address', e.target.value)}
          placeholder="ul. Przykładowa 123"
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="postal_code">Kod pocztowy *</Label>
          <Input
            id="postal_code"
            value={formData.postal_code}
            onChange={(e) => handleChange('postal_code', e.target.value)}
            placeholder="00-000"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="city">Miasto *</Label>
          <Input
            id="city"
            value={formData.city}
            onChange={(e) => handleChange('city', e.target.value)}
            placeholder="Warszawa"
            required
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="country">Kraj *</Label>
        <Input
          id="country"
          value={formData.country}
          onChange={(e) => handleChange('country', e.target.value)}
          placeholder="Polska"
          required
        />
      </div>

      <div className="flex items-center space-x-2">
        <input
          type="checkbox"
          id="is_default"
          checked={formData.is_default}
          onChange={(e) => handleChange('is_default', e.target.checked)}
          className="w-4 h-4"
        />
        <Label htmlFor="is_default" className="cursor-pointer">
          Ustaw jako adres domyślny
        </Label>
      </div>

      <div className="flex gap-2 pt-4">
        <Button type="submit" disabled={isSaving}>
          {isSaving ? 'Zapisywanie...' : 'Zapisz'}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          Anuluj
        </Button>
      </div>
    </form>
  );
};
