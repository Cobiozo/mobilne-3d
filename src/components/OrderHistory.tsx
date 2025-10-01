import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { supabase } from '@/integrations/supabase/client';
import { useApp } from '@/contexts/AppContext';
import { getText } from '@/lib/i18n';
import { Calendar, Package } from 'lucide-react';

interface Order {
  id: string;
  order_number: string;
  status: string;
  total_price: number;
  created_at: string;
  material: string | null;
  delivery_method: string | null;
  estimated_delivery: string | null;
  order_items?: OrderItem[];
}

interface OrderItem {
  id: string;
  model_id: string;
  quantity: number;
  unit_price: number;
  color: string;
  material: string;
  thumbnail: string | null;
}

export const OrderHistory = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { language } = useApp();

  useEffect(() => {
    fetchOrders();
  }, []);

  // Refresh orders when tab becomes visible
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        fetchOrders();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  const fetchOrders = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) return;

      const { data, error } = await supabase
        .from('orders')
        .select(`
          id, 
          order_number, 
          status, 
          total_price, 
          created_at, 
          material, 
          delivery_method, 
          estimated_delivery,
          order_items (
            id,
            model_id,
            quantity,
            unit_price,
            color,
            material,
            thumbnail
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setOrders(data || []);
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'completed':
        return 'default';
      case 'pending':
        return 'secondary';
      case 'processing':
        return 'outline';
      case 'shipped':
        return 'default';
      case 'cancelled':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      pending: 'Oczekujące',
      processing: 'W realizacji',
      shipped: 'Wysłane',
      completed: 'Zrealizowane',
      cancelled: 'Anulowane'
    };
    return labels[status] || status;
  };

  if (isLoading) {
    return <LoadingSpinner />;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package className="w-5 h-5" />
          Historia zamówień
        </CardTitle>
        <CardDescription>
          Wszystkie Twoje zamówienia w jednym miejscu
        </CardDescription>
      </CardHeader>
      <CardContent>
        {orders.length > 0 ? (
          <div className="space-y-4">
            {orders.map((order) => (
              <div key={order.id} className="p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="font-semibold text-lg">{order.order_number}</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(order.created_at).toLocaleDateString('pl-PL', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>
                  <Badge variant={getStatusBadgeVariant(order.status)}>
                    {getStatusLabel(order.status)}
                  </Badge>
                </div>

                {/* Order Items with thumbnails */}
                {order.order_items && order.order_items.length > 0 && (
                  <div className="mb-3 flex gap-2 overflow-x-auto pb-2">
                    {order.order_items.map((item) => (
                      <div key={item.id} className="flex-shrink-0">
                        {item.thumbnail ? (
                          <img 
                            src={`${item.thumbnail}?t=${Date.now()}`}
                            alt="Model"
                            className="w-16 h-16 object-cover rounded border border-border"
                            loading="lazy"
                          />
                        ) : (
                          <div 
                            className="w-16 h-16 rounded border border-border flex items-center justify-center"
                            style={{ backgroundColor: item.color }}
                          >
                            <span className="text-xs">3D</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Kwota</p>
                    <p className="font-medium">{parseFloat(order.total_price.toString()).toFixed(2)} zł</p>
                  </div>
                  {order.material && (
                    <div>
                      <p className="text-muted-foreground">Materiał</p>
                      <p className="font-medium">{order.material}</p>
                    </div>
                  )}
                  {order.delivery_method && (
                    <div>
                      <p className="text-muted-foreground">Dostawa</p>
                      <p className="font-medium">{order.delivery_method}</p>
                    </div>
                  )}
                  {order.estimated_delivery && (
                    <div>
                      <p className="text-muted-foreground">Przewidywana dostawa</p>
                      <p className="font-medium">
                        {new Date(order.estimated_delivery).toLocaleDateString('pl-PL')}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Brak zamówień</h3>
            <p className="text-muted-foreground">
              Nie masz jeszcze żadnych zamówień
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
