import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { supabase } from '@/integrations/supabase/client';
import { useApp } from '@/contexts/AppContext';
import { getText } from '@/lib/i18n';
import { Calendar, Package, CreditCard } from 'lucide-react';

interface Order {
  id: string;
  order_number: string;
  status: string;
  total_price: number;
  created_at: string;
  material: string | null;
  delivery_method: string | null;
  estimated_delivery: string | null;
  payment_method: string | null;
  parcel_locker_code: string | null;
  parcel_locker_name: string | null;
  parcel_locker_address: string | null;
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

const PaymentDetailsButton = ({ orderId, totalPrice, orderNumber }: { orderId: string; totalPrice: number; orderNumber: string }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [paymentConfig, setPaymentConfig] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  const loadPaymentDetails = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('payment_methods')
        .select('config')
        .eq('method_key', 'traditional')
        .eq('is_active', true)
        .single();

      if (error) throw error;
      setPaymentConfig(data?.config || {});
    } catch (error) {
      console.error('Error loading payment details:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && !paymentConfig) {
      loadPaymentDetails();
    }
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="w-full mt-3">
          <CreditCard className="w-4 h-4 mr-2" />
          Dane do przelewu
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Dane do przelewu tradycyjnego</DialogTitle>
        </DialogHeader>
        {isLoading ? (
          <div className="flex justify-center py-8">
            <LoadingSpinner />
          </div>
        ) : paymentConfig ? (
          <div className="space-y-4">
            <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg space-y-3">
              <div>
                <p className="text-sm text-muted-foreground">Numer konta:</p>
                <p className="font-mono font-semibold text-lg break-all">{paymentConfig.account_number}</p>
              </div>
              {paymentConfig.account_holder && (
                <div>
                  <p className="text-sm text-muted-foreground">Odbiorca:</p>
                  <p className="font-semibold">{paymentConfig.account_holder}</p>
                </div>
              )}
              <div>
                <p className="text-sm text-muted-foreground">Kwota:</p>
                <p className="font-semibold text-lg">{totalPrice.toFixed(2)} zł</p>
              </div>
              {paymentConfig.transfer_title && (
                <div>
                  <p className="text-sm text-muted-foreground">Tytuł przelewu:</p>
                  <p className="font-semibold">{paymentConfig.transfer_title.replace('{order_number}', orderNumber)}</p>
                </div>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Prosimy o dokonanie przelewu w ciągu 3 dni roboczych. Zamówienie zostanie zrealizowane po zaksięgowaniu wpłaty.
            </p>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Brak skonfigurowanych danych do przelewu</p>
        )}
      </DialogContent>
    </Dialog>
  );
};

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
          payment_method,
          parcel_locker_code,
          parcel_locker_name,
          parcel_locker_address,
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
                            src={item.thumbnail}
                            alt="Model"
                            className="w-16 h-16 object-cover rounded border border-border"
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

                {/* Parcel Locker Information */}
                {order.delivery_method === 'paczkomaty' && order.parcel_locker_name && (
                  <div className="mt-3 p-3 bg-primary/5 border border-primary/20 rounded-lg">
                    <p className="text-sm font-medium text-muted-foreground mb-1">
                      Paczkomat:
                    </p>
                    <p className="font-semibold text-primary">{order.parcel_locker_name}</p>
                    {order.parcel_locker_code && (
                      <p className="text-sm text-muted-foreground">Kod: {order.parcel_locker_code}</p>
                    )}
                    {order.parcel_locker_address && (
                      <p className="text-sm">{order.parcel_locker_address}</p>
                    )}
                  </div>
                )}

                {order.payment_method === 'traditional' && (
                  <PaymentDetailsButton 
                    orderId={order.id} 
                    totalPrice={order.total_price} 
                    orderNumber={order.order_number} 
                  />
                )}
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
