import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useApp } from '@/contexts/AppContext';
import { getText } from '@/lib/i18n';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ShoppingCart, Package, Clock, CheckCircle, XCircle, Truck, Eye, Edit } from 'lucide-react';

interface Order {
  id: string;
  order_number: string;
  status: 'pending' | 'processing' | 'completed' | 'cancelled' | 'shipped';
  quantity: number;
  material: string | null;
  total_price: number | null;
  estimated_delivery: string | null;
  created_at: string;
  updated_at: string;
  customer_name: string;
  model_name: string;
  special_instructions: string | null;
}

const statusLabels = {
  pending: 'Oczekujące',
  processing: 'W trakcie',
  completed: 'Zakończone',
  cancelled: 'Anulowane',
  shipped: 'Wysłane'
};

const statusIcons = {
  pending: Clock,
  processing: Package,
  completed: CheckCircle,
  cancelled: XCircle,
  shipped: Truck
};

const statusColors = {
  pending: 'bg-yellow-100 text-yellow-800',
  processing: 'bg-blue-100 text-blue-800',
  completed: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
  shipped: 'bg-purple-100 text-purple-800'
};

export const OrdersManagement = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();
  const { language } = useApp();

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          id,
          order_number,
          status,
          quantity,
          material,
          total_price,
          estimated_delivery,
          special_instructions,
          created_at,
          updated_at
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formattedOrders = data?.map(order => ({
        id: order.id,
        order_number: order.order_number,
        status: order.status as 'pending' | 'processing' | 'completed' | 'cancelled' | 'shipped',
        quantity: order.quantity,
        material: order.material,
        total_price: order.total_price,
        estimated_delivery: order.estimated_delivery,
        special_instructions: order.special_instructions,
        created_at: order.created_at,
        updated_at: order.updated_at,
        customer_name: 'Klient',
        model_name: 'Model 3D'
      })) || [];

      setOrders(formattedOrders);
    } catch (error) {
      console.error('Error fetching orders:', error);
      toast({
        title: getText('error', language),
        description: 'Failed to load orders',
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status: newStatus })
        .eq('id', orderId);

      if (error) throw error;

      setOrders(orders.map(order => 
        order.id === orderId ? { ...order, status: newStatus as any } : order
      ));

      if (selectedOrder?.id === orderId) {
        setSelectedOrder({ ...selectedOrder, status: newStatus as any });
      }

      toast({
        title: getText('success', language),
        description: `Status zamówienia zmieniony na ${statusLabels[newStatus as keyof typeof statusLabels]}`,
      });
    } catch (error) {
      console.error('Error updating order status:', error);
      toast({
        title: getText('error', language),
        description: 'Failed to update order status',
        variant: "destructive",
      });
    }
  };

  const filteredOrders = orders.filter(order => {
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
    const matchesSearch = 
      order.order_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.model_name.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesStatus && matchesSearch;
  });

  const getOrderStats = () => {
    const total = orders.length;
    const pending = orders.filter(o => o.status === 'pending').length;
    const processing = orders.filter(o => o.status === 'processing').length;
    const completed = orders.filter(o => o.status === 'completed').length;
    const revenue = orders.reduce((sum, order) => sum + (order.total_price || 0), 0);

    return { total, pending, processing, completed, revenue };
  };

  const stats = getOrderStats();

  if (isLoading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Zarządzanie zamówieniami</h2>
          <p className="text-muted-foreground">
            Przeglądaj i zarządzaj wszystkimi zamówieniami
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Wszystkie</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Oczekujące</CardTitle>
            <Clock className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pending}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">W trakcie</CardTitle>
            <Package className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.processing}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Zakończone</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.completed}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Przychód</CardTitle>
            <span className="text-sm font-bold">zł</span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.revenue.toFixed(2)}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 grid-cols-1 lg:grid-cols-3">
        {/* Orders List */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Lista zamówień</CardTitle>
              <div className="flex gap-2">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Wszystkie</SelectItem>
                    <SelectItem value="pending">Oczekujące</SelectItem>
                    <SelectItem value="processing">W trakcie</SelectItem>
                    <SelectItem value="completed">Zakończone</SelectItem>
                    <SelectItem value="cancelled">Anulowane</SelectItem>
                    <SelectItem value="shipped">Wysłane</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  placeholder="Szukaj zamówień..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="flex-1"
                />
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {filteredOrders.map((order) => {
                  const StatusIcon = statusIcons[order.status];
                  return (
                    <div
                      key={order.id}
                      className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                        selectedOrder?.id === order.id 
                          ? 'bg-primary/10 border-primary' 
                          : 'hover:bg-muted/50'
                      }`}
                      onClick={() => setSelectedOrder(order)}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <StatusIcon className="w-4 h-4" />
                          <span className="font-medium">{order.order_number}</span>
                        </div>
                        <Badge className={statusColors[order.status]}>
                          {statusLabels[order.status]}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
                        <span>Klient: {order.customer_name}</span>
                        <span>Model: {order.model_name}</span>
                        <span>Ilość: {order.quantity}</span>
                        <span>{order.total_price ? `${order.total_price} zł` : 'Brak ceny'}</span>
                      </div>
                      <div className="mt-2 text-xs text-muted-foreground">
                        {new Date(order.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  );
                })}
                {filteredOrders.length === 0 && (
                  <p className="text-center text-muted-foreground py-4">
                    Brak zamówień spełniających kryteria
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Order Details */}
        <div className="lg:col-span-1">
          {selectedOrder ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShoppingCart className="w-5 h-5" />
                  Szczegóły zamówienia
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-medium">Numer zamówienia</h4>
                  <p className="text-sm text-muted-foreground">{selectedOrder.order_number}</p>
                </div>

                <div>
                  <h4 className="font-medium">Status</h4>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge className={statusColors[selectedOrder.status]}>
                      {statusLabels[selectedOrder.status]}
                    </Badge>
                    <Select
                      value={selectedOrder.status}
                      onValueChange={(newStatus) => updateOrderStatus(selectedOrder.id, newStatus)}
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Oczekujące</SelectItem>
                        <SelectItem value="processing">W trakcie</SelectItem>
                        <SelectItem value="completed">Zakończone</SelectItem>
                        <SelectItem value="cancelled">Anulowane</SelectItem>
                        <SelectItem value="shipped">Wysłane</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium">Klient</h4>
                  <p className="text-sm text-muted-foreground">{selectedOrder.customer_name}</p>
                </div>

                <div>
                  <h4 className="font-medium">Model</h4>
                  <p className="text-sm text-muted-foreground">{selectedOrder.model_name}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-medium">Ilość</h4>
                    <p className="text-sm text-muted-foreground">{selectedOrder.quantity}</p>
                  </div>
                  <div>
                    <h4 className="font-medium">Cena</h4>
                    <p className="text-sm text-muted-foreground">
                      {selectedOrder.total_price ? `${selectedOrder.total_price} zł` : 'Nie ustalono'}
                    </p>
                  </div>
                </div>

                {selectedOrder.material && (
                  <div>
                    <h4 className="font-medium">Materiał</h4>
                    <p className="text-sm text-muted-foreground">{selectedOrder.material}</p>
                  </div>
                )}

                {selectedOrder.estimated_delivery && (
                  <div>
                    <h4 className="font-medium">Szacowana dostawa</h4>
                    <p className="text-sm text-muted-foreground">
                      {new Date(selectedOrder.estimated_delivery).toLocaleDateString()}
                    </p>
                  </div>
                )}

                {selectedOrder.special_instructions && (
                  <div>
                    <h4 className="font-medium">Uwagi specjalne</h4>
                    <p className="text-sm text-muted-foreground bg-muted p-2 rounded">
                      {selectedOrder.special_instructions}
                    </p>
                  </div>
                )}

                <div className="pt-2 border-t">
                  <div className="text-xs text-muted-foreground">
                    <p>Utworzone: {new Date(selectedOrder.created_at).toLocaleString()}</p>
                    <p>Zaktualizowane: {new Date(selectedOrder.updated_at).toLocaleString()}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="flex items-center justify-center py-12">
                <div className="text-center">
                  <ShoppingCart className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Wybierz zamówienie</h3>
                  <p className="text-muted-foreground">
                    Wybierz zamówienie z listy aby zobaczyć szczegóły
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};