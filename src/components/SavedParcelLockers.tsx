import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useApp } from '@/contexts/AppContext';
import { getText } from '@/lib/i18n';
import { Package, Star, Trash2 } from 'lucide-react';

interface SavedParcelLocker {
  id: string;
  locker_code: string;
  locker_name: string;
  locker_address: string;
  locker_city: string | null;
  locker_postal_code: string | null;
  is_favorite: boolean;
}

export const SavedParcelLockers = () => {
  const [lockers, setLockers] = useState<SavedParcelLocker[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const { language } = useApp();

  useEffect(() => {
    fetchLockers();
  }, []);

  const fetchLockers = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) return;

      const { data, error } = await supabase
        .from('saved_parcel_lockers')
        .select('*')
        .eq('user_id', user.id)
        .order('is_favorite', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;

      setLockers(data || []);
    } catch (error) {
      console.error('Error fetching lockers:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleFavorite = async (id: string, currentFavorite: boolean) => {
    try {
      const { error } = await supabase
        .from('saved_parcel_lockers')
        .update({ is_favorite: !currentFavorite })
        .eq('id', id);

      if (error) throw error;

      toast({
        title: getText('success', language),
        description: !currentFavorite ? 'Dodano do ulubionych' : 'Usunięto z ulubionych',
      });

      fetchLockers();
    } catch (error: any) {
      toast({
        title: getText('error', language),
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const deleteLocker = async (id: string) => {
    try {
      const { error } = await supabase
        .from('saved_parcel_lockers')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: getText('success', language),
        description: 'Paczkomat został usunięty',
      });

      fetchLockers();
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
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package className="w-5 h-5" />
          Moje paczkomaty
        </CardTitle>
        <CardDescription>
          Lista zapamiętanych paczkomatów InPost
        </CardDescription>
      </CardHeader>
      <CardContent>
        {lockers.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2">
            {lockers.map((locker) => (
              <div
                key={locker.id}
                className="p-4 border rounded-lg hover:bg-muted/50 transition-colors relative"
              >
                {locker.is_favorite && (
                  <Badge className="absolute top-2 right-2" variant="default">
                    <Star className="w-3 h-3 mr-1" />
                    Ulubiony
                  </Badge>
                )}
                <div className="space-y-2">
                  <p className="font-semibold text-lg">{locker.locker_name}</p>
                  <p className="text-sm">{locker.locker_address}</p>
                  {locker.locker_postal_code && locker.locker_city && (
                    <p className="text-sm text-muted-foreground">
                      {locker.locker_postal_code} {locker.locker_city}
                    </p>
                  )}
                </div>
                <div className="flex gap-2 mt-4">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => toggleFavorite(locker.id, locker.is_favorite)}
                  >
                    <Star className={`w-4 h-4 ${locker.is_favorite ? 'fill-current' : ''}`} />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => deleteLocker(locker.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <Package className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Brak zapamiętanych paczkomatów</h3>
            <p className="text-muted-foreground">
              Paczkomaty zostaną automatycznie zapisane po złożeniu zamówienia
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
