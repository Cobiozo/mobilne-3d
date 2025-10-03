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
import { ShoppingCart, Package, Clock, CheckCircle, XCircle, Truck, Eye, Edit, Download } from 'lucide-react';
import * as THREE from 'three';
import { STLExporter } from 'three/examples/jsm/exporters/STLExporter.js';

interface OrderItem {
  id: string;
  order_id: string;
  model_id: string;
  quantity: number;
  unit_price: number;
  color: string | null;
  material: string | null;
  size_scale: number | null;
  thumbnail: string | null;
}

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
  order_items?: OrderItem[];
  customer_first_name?: string | null;
  customer_last_name?: string | null;
  customer_email?: string | null;
  customer_phone?: string | null;
  shipping_address?: string | null;
  shipping_city?: string | null;
  shipping_postal_code?: string | null;
  shipping_country?: string | null;
  delivery_method?: string | null;
  payment_method?: string | null;
  invoice_data?: any;
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
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
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
          updated_at,
          customer_first_name,
          customer_last_name,
          customer_email,
          customer_phone,
          shipping_address,
          shipping_city,
          shipping_postal_code,
          shipping_country,
          delivery_method,
          payment_method,
          invoice_data
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formattedOrders = data?.map(order => ({
        ...order,
        status: order.status as 'pending' | 'processing' | 'completed' | 'cancelled' | 'shipped',
        customer_name: order.customer_first_name && order.customer_last_name 
          ? `${order.customer_first_name} ${order.customer_last_name}`
          : 'Klient',
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

  const handleDownloadModel = async (item: OrderItem) => {
    try {
      toast({
        title: 'Pobieranie modelu...',
        description: 'Przygotowuję model do pobrania',
      });

      // Get model details from database
      const { data: model, error: modelError } = await supabase
        .from('models')
        .select('name, file_url')
        .eq('id', item.model_id)
        .single();

      if (modelError || !model) {
        throw new Error('Nie można znaleźć modelu');
      }

      // Get order to extract target dimensions from special_instructions
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .select('special_instructions')
        .eq('id', item.order_id)
        .single();

      if (orderError) {
        console.warn('Could not fetch order details:', orderError);
      }

      // Extract the path from file_url
      const urlParts = model.file_url.split('/storage/v1/object/public/models/');
      if (urlParts.length !== 2) {
        throw new Error('Nieprawidłowy format URL pliku');
      }
      const filePath = urlParts[1];

      // Download from storage bucket
      const { data: fileData, error: downloadError } = await supabase.storage
        .from('models')
        .download(filePath);

      if (downloadError || !fileData) {
        throw new Error('Nie można pobrać pliku modelu');
      }

      const arrayBuffer = await fileData.arrayBuffer();
      const { STLLoader } = await import('three/examples/jsm/loaders/STLLoader.js');
      const loader = new STLLoader();
      
      // Parse the original model WITHOUT any processing
      const geometry = loader.parse(arrayBuffer);
      
      // Get original dimensions
      geometry.computeBoundingBox();
      if (!geometry.boundingBox) {
        throw new Error('Nie można obliczyć wymiarów modelu');
      }
      
      const originalSize = new THREE.Vector3();
      geometry.boundingBox.getSize(originalSize);
      
      console.log('Original model dimensions (mm):', {
        x: originalSize.x.toFixed(2),
        y: originalSize.y.toFixed(2),
        z: originalSize.z.toFixed(2)
      });

      // Try to extract target dimensions from special_instructions
      let targetDimensions: { x: number; y: number; z: number } | null = null;
      
      if (order?.special_instructions) {
        // Parse format like "model.stl: 282.7mm × 161.8mm × 14.5mm (PLA) x 1"
        const modelNamePattern = model.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(`${modelNamePattern}[^:]*:\\s*([0-9.]+)mm\\s*[×x]\\s*([0-9.]+)mm\\s*[×x]\\s*([0-9.]+)mm`);
        const match = order.special_instructions.match(regex);
        
        if (match) {
          targetDimensions = {
            x: parseFloat(match[1]),
            y: parseFloat(match[2]),
            z: parseFloat(match[3])
          };
          console.log('Target dimensions from order (mm):', targetDimensions);
        }
      }

      // Calculate scale factor if we have target dimensions
      let scaleFactor = 1.0;
      if (targetDimensions) {
        // Use the average scale factor from all dimensions
        const scaleX = targetDimensions.x / originalSize.x;
        const scaleY = targetDimensions.y / originalSize.y;
        const scaleZ = targetDimensions.z / originalSize.z;
        
        // Use the average to maintain proportions
        scaleFactor = (scaleX + scaleY + scaleZ) / 3;
        
        console.log('Calculated scale factors:', { scaleX, scaleY, scaleZ, average: scaleFactor });
      } else if (item.size_scale && item.size_scale !== 1.0) {
        // Fallback to size_scale from item if no dimensions in special_instructions
        scaleFactor = item.size_scale;
        console.log('Using size_scale from order_item:', scaleFactor);
      }

      if (scaleFactor !== 1.0) {
        // Apply scaling
        const scaledGeometry = geometry.clone();
        scaledGeometry.scale(scaleFactor, scaleFactor, scaleFactor);
        
        // Verify scaled dimensions
        scaledGeometry.computeBoundingBox();
        if (scaledGeometry.boundingBox) {
          const scaledSize = new THREE.Vector3();
          scaledGeometry.boundingBox.getSize(scaledSize);
          console.log('Final scaled dimensions (mm):', {
            x: scaledSize.x.toFixed(2),
            y: scaledSize.y.toFixed(2),
            z: scaledSize.z.toFixed(2)
          });
        }
        
        // Export scaled model to STL
        const exporter = new STLExporter();
        const stlString = exporter.parse(new THREE.Mesh(scaledGeometry));
        
        // Convert to blob
        const blob = new Blob([stlString], { type: 'application/octet-stream' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        const scaledName = model.name.replace('.stl', '') + `_order_${scaleFactor.toFixed(2)}x.stl`;
        link.download = scaledName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        toast({
          title: 'Sukces',
          description: `Model "${scaledName}" został pobrany`,
        });
      } else {
        // No scaling needed, download original
        const blob = new Blob([fileData], { type: 'application/octet-stream' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = model.name.endsWith('.stl') ? model.name : `${model.name}.stl`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        toast({
          title: 'Sukces',
          description: `Model "${model.name}" został pobrany`,
        });
      }
    } catch (error) {
      console.error('Error downloading model:', error);
      toast({
        title: 'Błąd',
        description: error instanceof Error ? error.message : 'Nie udało się pobrać modelu',
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
          <h2 className="text-2xl font-bold">{getText('ordersManagement', language)}</h2>
          <p className="text-muted-foreground">
            {getText('viewAndManageOrders', language)}
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{getText('all', language)}</CardTitle>
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
              <CardTitle>{getText('ordersList', language)}</CardTitle>
              <div className="flex gap-2">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent sideOffset={5}>
                    <SelectItem value="all">{getText('all', language)}</SelectItem>
                    <SelectItem value="pending">{getText('pending', language)}</SelectItem>
                    <SelectItem value="processing">{getText('processing', language)}</SelectItem>
                    <SelectItem value="completed">{getText('completed', language)}</SelectItem>
                    <SelectItem value="cancelled">{getText('cancelled', language)}</SelectItem>
                    <SelectItem value="shipped">{getText('shipped', language)}</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  placeholder={getText('searchOrders', language)}
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
                      onClick={async () => {
                        setSelectedOrder(order);
                        // Fetch order items for selected order
                        const { data: items } = await supabase
                          .from('order_items')
                          .select('*')
                          .eq('order_id', order.id);
                        setOrderItems(items || []);
                      }}
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
                      <SelectContent sideOffset={5}>
                        <SelectItem value="pending">{getText('pending', language)}</SelectItem>
                        <SelectItem value="processing">{getText('processing', language)}</SelectItem>
                        <SelectItem value="completed">{getText('completed', language)}</SelectItem>
                        <SelectItem value="cancelled">{getText('cancelled', language)}</SelectItem>
                        <SelectItem value="shipped">{getText('shipped', language)}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium">Klient</h4>
                  {selectedOrder.customer_first_name && selectedOrder.customer_last_name ? (
                    <p className="text-sm text-muted-foreground">
                      {selectedOrder.customer_first_name} {selectedOrder.customer_last_name}
                    </p>
                  ) : (
                    <p className="text-sm text-muted-foreground">{selectedOrder.customer_name}</p>
                  )}
                  {selectedOrder.customer_email && (
                    <p className="text-xs text-muted-foreground">{selectedOrder.customer_email}</p>
                  )}
                  {selectedOrder.customer_phone && (
                    <p className="text-xs text-muted-foreground">{selectedOrder.customer_phone}</p>
                  )}
                </div>

                {/* Shipping Information - Always show section */}
                <div className="pt-4 border-t">
                  <h4 className="font-medium mb-2">Dane do wysyłki</h4>
                  <div className="space-y-1 text-sm">
                    {selectedOrder.shipping_address ? (
                      <>
                        <p className="text-muted-foreground">
                          <span className="font-medium">Adres:</span> {selectedOrder.shipping_address}
                        </p>
                        {selectedOrder.shipping_city && selectedOrder.shipping_postal_code && (
                          <p className="text-muted-foreground">
                            {selectedOrder.shipping_postal_code} {selectedOrder.shipping_city}
                          </p>
                        )}
                        {selectedOrder.shipping_country && (
                          <p className="text-muted-foreground">
                            <span className="font-medium">Kraj:</span> {selectedOrder.shipping_country}
                          </p>
                        )}
                      </>
                    ) : (
                      <p className="text-xs text-muted-foreground italic">Brak danych adresowych</p>
                    )}
                    
                    {selectedOrder.delivery_method ? (
                      <p className="text-muted-foreground">
                        <span className="font-medium">Dostawa:</span>{' '}
                        {selectedOrder.delivery_method === 'inpost-courier' 
                          ? 'Kurier InPost' 
                          : selectedOrder.delivery_method === 'paczkomaty'
                          ? 'Paczkomaty InPost'
                          : selectedOrder.delivery_method}
                      </p>
                    ) : (
                      <p className="text-xs text-muted-foreground italic">Metoda dostawy nie określona</p>
                    )}
                    
                    {selectedOrder.payment_method ? (
                      <p className="text-muted-foreground">
                        <span className="font-medium">Płatność:</span>{' '}
                        {selectedOrder.payment_method.toUpperCase()}
                      </p>
                    ) : (
                      <p className="text-xs text-muted-foreground italic">Metoda płatności nie określona</p>
                    )}
                  </div>
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

                {selectedOrder.invoice_data && (
                  <div className="pt-4 border-t">
                    <h4 className="font-medium mb-2">Dane do faktury VAT</h4>
                    <div className="space-y-1 text-sm">
                      <p className="text-muted-foreground">
                        <span className="font-medium">Firma:</span> {selectedOrder.invoice_data.companyName}
                      </p>
                      <p className="text-muted-foreground">
                        <span className="font-medium">NIP:</span> {selectedOrder.invoice_data.nip}
                      </p>
                      <p className="text-muted-foreground">
                        <span className="font-medium">Adres:</span> {selectedOrder.invoice_data.address}
                      </p>
                      <p className="text-muted-foreground">
                        {selectedOrder.invoice_data.postalCode} {selectedOrder.invoice_data.city}
                      </p>
                      <p className="text-muted-foreground">
                        <span className="font-medium">Kraj:</span> {selectedOrder.invoice_data.country}
                      </p>
                    </div>
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

                {/* Order Items with thumbnails and download buttons */}
                {orderItems.length > 0 && (
                  <div className="pt-4 border-t">
                    <h4 className="font-medium mb-3">Elementy zamówienia</h4>
                    <div className="space-y-3">
                      {orderItems.map((item) => (
                        <div key={item.id} className="flex items-center gap-3 p-3 border rounded-lg">
                          {item.thumbnail ? (
                            <img
                              src={item.thumbnail}
                              alt="Model"
                              className="w-16 h-16 object-cover rounded border"
                            />
                          ) : (
                            <div className="w-16 h-16 bg-muted rounded border flex items-center justify-center">
                              <Package className="w-6 h-6 text-muted-foreground" />
                            </div>
                          )}
                          <div className="flex-1">
                            <p className="text-sm font-medium">Model ID: {item.model_id.slice(0, 8)}...</p>
                            <p className="text-xs text-muted-foreground">
                              Kolor: {item.color} • Materiał: {item.material}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Ilość: {item.quantity} • Cena jednostkowa: {item.unit_price?.toFixed(2)} zł
                            </p>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDownloadModel(item)}
                            title="Pobierz model gotowy do druku"
                          >
                            <Download className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
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