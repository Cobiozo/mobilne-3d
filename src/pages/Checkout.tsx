import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ArrowLeft, CreditCard, Truck, Package } from "lucide-react";
import { CartItem } from "@/components/ShoppingCart";

const Checkout = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [itemSizes, setItemSizes] = useState<{ [key: string]: { x: number; y: number; z: number } }>({});
  const [itemMaterials, setItemMaterials] = useState<{ [key: string]: string }>({});
  
  // Form data
  const [customerInfo, setCustomerInfo] = useState({
    firstName: '',
    lastName: '',
    email: user?.email || '',
    phone: '',
    address: '',
    city: '',
    postalCode: '',
    country: 'Polska'
  });
  
  const [orderInfo, setOrderInfo] = useState({
    material: 'PLA',
    instructions: '',
    urgent: false
  });

  const [deliveryMethod, setDeliveryMethod] = useState<'inpost-courier' | 'paczkomaty'>('paczkomaty');
  const [paymentMethod, setPaymentMethod] = useState<'traditional' | 'payu' | 'blik' | 'paypo' | 'twisto' | 'paypal'>('traditional');

  const deliveryPrices = {
    'inpost-courier': 15.99,
    'paczkomaty': 17.22
  };

  useEffect(() => {
    // Get cart items from localStorage or URL params
    const savedCart = localStorage.getItem('cartItems');
    if (savedCart) {
      const items = JSON.parse(savedCart);
      setCartItems(items);
      
      // Initialize default sizes (100mm x 100mm x 100mm) and materials for each item
      const defaultSizes: { [key: string]: { x: number; y: number; z: number } } = {};
      const defaultMaterials: { [key: string]: string } = {};
      items.forEach((item: CartItem) => {
        defaultSizes[item.id] = { x: 100, y: 100, z: 100 };
        defaultMaterials[item.id] = 'PLA';
      });
      setItemSizes(defaultSizes);
      setItemMaterials(defaultMaterials);
    } else {
      // If no cart items, redirect back
      toast.error('Brak elementów w koszyku');
      navigate('/');
    }
  }, [navigate]);

  useEffect(() => {
    console.log('Checkout auth check:', { loading, user: !!user });
    if (!loading && !user) {
      console.log('Redirecting to auth - no user found');
      toast.error('Musisz być zalogowany, aby złożyć zamówienie');
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  const getColorName = (color: string) => {
    const colorNames: { [key: string]: string } = {
      '#FFFFFF': 'Biały',
      '#000000': 'Czarny',
      '#FF0000': 'Czerwony',
      '#00FF00': 'Zielony',
      '#0000FF': 'Niebieski',
      '#FFFF00': 'Żółty',
      '#FF00FF': 'Magenta',
      '#00FFFF': 'Cyjan'
    };
    return colorNames[color.toUpperCase()] || `Niestandardowy (${color})`;
  };

  const getMaterialMultiplier = (material: string) => {
    const multipliers: { [key: string]: number } = {
      'PLA': 1.0,
      'ABS': 2.0,      // +100%
      'PETG': 1.15,    // +15%
      'TPU': 1.30      // +30%
    };
    return multipliers[material] || 1.0;
  };

  const calculatePrice = (item: CartItem) => {
    // Base price calculation based on volume
    const size = itemSizes[item.id] || { x: 100, y: 100, z: 100 };
    const material = itemMaterials[item.id] || 'PLA';
    
    // Calculate volume in cm³ (convert from mm)
    const volumeCm3 = (size.x / 10) * (size.y / 10) * (size.z / 10);
    
    // Base price: 0.50 zł per cm³
    const basePricePerCm3 = 0.50;
    
    // Apply material multiplier
    const materialMultiplier = getMaterialMultiplier(material);
    
    // Calculate final price
    const pricePerUnit = volumeCm3 * basePricePerCm3 * materialMultiplier;
    
    return pricePerUnit * item.quantity;
  };

  const totalPrice = cartItems.reduce((sum, item) => sum + calculatePrice(item), 0);
  const deliveryPrice = deliveryPrices[deliveryMethod];
  const finalPrice = totalPrice + deliveryPrice;

  const handleSubmitOrder = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      // Create order for each cart item
      for (const item of cartItems) {
        // First, find the model in database by name
        const { data: models } = await supabase
          .from('models')
          .select('id')
          .eq('user_id', user.id)
          .eq('name', item.name)
          .limit(1);

        if (!models || models.length === 0) {
          throw new Error(`Model "${item.name}" nie został znaleziony w bazie danych`);
        }

        const modelId = models[0].id;
        const itemPrice = calculatePrice(item);
        const size = itemSizes[item.id];
        const material = itemMaterials[item.id];

        // Create order
        const { data: order, error: orderError } = await supabase
          .from('orders')
          .insert({
            user_id: user.id,
            model_id: modelId,
            quantity: item.quantity,
            total_price: itemPrice,
            material: material,
            special_instructions: `Dostawa: ${deliveryMethod === 'inpost-courier' ? 'Kurier InPost' : 'Paczkomaty InPost'}\nPłatność: ${paymentMethod}\nWymiary: ${size.x}mm x ${size.y}mm x ${size.z}mm\n${orderInfo.instructions}`,
            status: 'pending',
            order_number: `ORD-${Date.now()}`
          })
          .select()
          .single();

        if (orderError) throw orderError;

        // Create order item
        const { error: itemError } = await supabase
          .from('order_items')
          .insert({
            order_id: order.id,
            model_id: modelId,
            quantity: item.quantity,
            unit_price: itemPrice / item.quantity,
            color: item.color,
            material: material,
            size_scale: Math.max(size.x, size.y, size.z) / 100 // Store relative scale
          });

        if (itemError) throw itemError;
      }

      // Clear cart
      localStorage.removeItem('cartItems');
      
      toast.success('Zamówienie zostało złożone pomyślnie!');
      navigate('/dashboard?tab=orders');
      
    } catch (error) {
      console.error('Error creating order:', error);
      toast.error(`Błąd podczas składania zamówienia: ${error instanceof Error ? error.message : 'Nieznany błąd'}`);
    } finally {
      setIsLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-secondary flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
          <p>Ładowanie...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-secondary">
      {/* Header */}
      <header className="border-b border-border/50 bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/')}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Powrót
            </Button>
            <h1 className="text-2xl font-bold">Płatność i zamówienie</h1>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Order Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="w-5 h-5" />
                Podsumowanie zamówienia
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {cartItems.map((item) => {
                const size = itemSizes[item.id] || { x: 100, y: 100, z: 100 };
                const material = itemMaterials[item.id] || 'PLA';
                
                return (
                  <div key={item.id} className="p-4 border rounded-lg space-y-4">
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-8 h-8 rounded border border-border"
                        style={{ backgroundColor: item.color }}
                      />
                      
                      <div className="flex-1">
                        <h4 className="font-medium">{item.name}</h4>
                        <p className="text-sm text-muted-foreground">
                          {getColorName(item.color)} • Ilość: {item.quantity}
                        </p>
                      </div>
                    </div>

                    {/* Size Controls */}
                    <div className="space-y-3">
                      <Label className="text-sm font-medium">Wymiary modelu (mm)</Label>
                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <Label htmlFor={`size-x-${item.id}`} className="text-xs text-muted-foreground">
                            Szerokość (X)
                          </Label>
                          <Input
                            id={`size-x-${item.id}`}
                            type="number"
                            min="1"
                            max="390"
                            value={size.x}
                            onChange={(e) => {
                              const value = Math.min(390, Math.max(1, parseInt(e.target.value) || 1));
                              setItemSizes(prev => ({
                                ...prev,
                                [item.id]: { ...prev[item.id], x: value }
                              }));
                            }}
                            className="h-9"
                          />
                        </div>
                        <div>
                          <Label htmlFor={`size-y-${item.id}`} className="text-xs text-muted-foreground">
                            Głębokość (Y)
                          </Label>
                          <Input
                            id={`size-y-${item.id}`}
                            type="number"
                            min="1"
                            max="390"
                            value={size.y}
                            onChange={(e) => {
                              const value = Math.min(390, Math.max(1, parseInt(e.target.value) || 1));
                              setItemSizes(prev => ({
                                ...prev,
                                [item.id]: { ...prev[item.id], y: value }
                              }));
                            }}
                            className="h-9"
                          />
                        </div>
                        <div>
                          <Label htmlFor={`size-z-${item.id}`} className="text-xs text-muted-foreground">
                            Wysokość (Z)
                          </Label>
                          <Input
                            id={`size-z-${item.id}`}
                            type="number"
                            min="1"
                            max="380"
                            value={size.z}
                            onChange={(e) => {
                              const value = Math.min(380, Math.max(1, parseInt(e.target.value) || 1));
                              setItemSizes(prev => ({
                                ...prev,
                                [item.id]: { ...prev[item.id], z: value }
                              }));
                            }}
                            className="h-9"
                          />
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Max: 390mm (X,Y) × 380mm (Z)
                      </p>
                    </div>

                    {/* Material Selection */}
                    <div>
                      <Label htmlFor={`material-${item.id}`} className="text-sm font-medium">Materiał</Label>
                      <Select 
                        value={material}
                        onValueChange={(value) => {
                          setItemMaterials(prev => ({
                            ...prev,
                            [item.id]: value
                          }));
                        }}
                      >
                        <SelectTrigger id={`material-${item.id}`}>
                          <SelectValue placeholder="Wybierz materiał" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="PLA">PLA (Standard) - cena bazowa</SelectItem>
                          <SelectItem value="ABS">ABS (Wytrzymały) - +100%</SelectItem>
                          <SelectItem value="PETG">PETG (Przezroczysty) - +15%</SelectItem>
                          <SelectItem value="TPU">TPU (Elastyczny) - +30%</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <Separator />

                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Cena:</span>
                      <span className="text-lg font-semibold">
                        {calculatePrice(item).toFixed(2)} zł
                      </span>
                    </div>
                  </div>
                );
              })}
              
              <Separator />
              
              <div className="space-y-2">
                <div className="flex justify-between items-center text-sm">
                  <span>Suma produktów:</span>
                  <span>{totalPrice.toFixed(2)} zł</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span>Dostawa:</span>
                  <span>{deliveryPrice.toFixed(2)} zł</span>
                </div>
                <Separator />
                <div className="flex justify-between items-center font-semibold text-lg">
                  <span>Całkowita wartość:</span>
                  <span>{finalPrice.toFixed(2)} zł</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Order Form */}
          <div className="space-y-6">
            {/* Customer Information */}
            <Card>
              <CardHeader>
                <CardTitle>Dane klienta</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="firstName">Imię</Label>
                    <Input
                      id="firstName"
                      value={customerInfo.firstName}
                      onChange={(e) => setCustomerInfo(prev => ({ ...prev, firstName: e.target.value }))}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="lastName">Nazwisko</Label>
                    <Input
                      id="lastName"
                      value={customerInfo.lastName}
                      onChange={(e) => setCustomerInfo(prev => ({ ...prev, lastName: e.target.value }))}
                      required
                    />
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={customerInfo.email}
                    onChange={(e) => setCustomerInfo(prev => ({ ...prev, email: e.target.value }))}
                    required
                  />
                </div>
                
                <div>
                  <Label htmlFor="phone">Telefon</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={customerInfo.phone}
                    onChange={(e) => setCustomerInfo(prev => ({ ...prev, phone: e.target.value }))}
                    required
                  />
                </div>
                
                <div>
                  <Label htmlFor="address">Adres</Label>
                  <Input
                    id="address"
                    value={customerInfo.address}
                    onChange={(e) => setCustomerInfo(prev => ({ ...prev, address: e.target.value }))}
                    required
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="city">Miasto</Label>
                    <Input
                      id="city"
                      value={customerInfo.city}
                      onChange={(e) => setCustomerInfo(prev => ({ ...prev, city: e.target.value }))}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="postalCode">Kod pocztowy</Label>
                    <Input
                      id="postalCode"
                      value={customerInfo.postalCode}
                      onChange={(e) => setCustomerInfo(prev => ({ ...prev, postalCode: e.target.value }))}
                      required
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Order Options */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="w-5 h-5" />
                  Dodatkowe opcje
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="instructions">Uwagi specjalne</Label>
                  <Textarea
                    id="instructions"
                    value={orderInfo.instructions}
                    onChange={(e) => setOrderInfo(prev => ({ ...prev, instructions: e.target.value }))}
                    placeholder="Dodatkowe instrukcje dla zamówienia..."
                    rows={3}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Delivery Method */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Truck className="w-5 h-5" />
                  Metoda dostawy
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div 
                  className={cn(
                    "p-4 border-2 rounded-lg cursor-pointer transition-all",
                    deliveryMethod === 'paczkomaty' 
                      ? "border-primary bg-primary/5" 
                      : "border-border hover:border-primary/50"
                  )}
                  onClick={() => setDeliveryMethod('paczkomaty')}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "w-4 h-4 rounded-full border-2 flex items-center justify-center",
                        deliveryMethod === 'paczkomaty' ? "border-primary" : "border-border"
                      )}>
                        {deliveryMethod === 'paczkomaty' && (
                          <div className="w-2 h-2 rounded-full bg-primary" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium">Paczkomaty InPost</p>
                        <p className="text-sm text-muted-foreground">Odbierz w dowolnym paczkomacie</p>
                      </div>
                    </div>
                    <span className="font-semibold">17.22 zł</span>
                  </div>
                </div>

                <div 
                  className={cn(
                    "p-4 border-2 rounded-lg cursor-pointer transition-all",
                    deliveryMethod === 'inpost-courier' 
                      ? "border-primary bg-primary/5" 
                      : "border-border hover:border-primary/50"
                  )}
                  onClick={() => setDeliveryMethod('inpost-courier')}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "w-4 h-4 rounded-full border-2 flex items-center justify-center",
                        deliveryMethod === 'inpost-courier' ? "border-primary" : "border-border"
                      )}>
                        {deliveryMethod === 'inpost-courier' && (
                          <div className="w-2 h-2 rounded-full bg-primary" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium">Kurier InPost</p>
                        <p className="text-sm text-muted-foreground">Dostawa pod wskazany adres</p>
                      </div>
                    </div>
                    <span className="font-semibold">15.99 zł</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Payment */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="w-5 h-5" />
                  Płatność
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[
                    { id: 'traditional', name: 'Przelew tradycyjny', desc: 'Standardowy przelew bankowy' },
                    { id: 'payu', name: 'PayU', desc: 'Szybka płatność online' },
                    { id: 'blik', name: 'Blik', desc: 'Płatność kodem z aplikacji bankowej' },
                    { id: 'paypo', name: 'Płacę później z PayPo', desc: 'Kup teraz, zapłać później' },
                    { id: 'twisto', name: 'Płacę później z Twisto', desc: 'Odroczona płatność' },
                    { id: 'paypal', name: 'PayPal', desc: 'Bezpieczna płatność międzynarodowa' }
                  ].map((method) => (
                    <div
                      key={method.id}
                      className={cn(
                        "p-3 border-2 rounded-lg cursor-pointer transition-all",
                        paymentMethod === method.id 
                          ? "border-primary bg-primary/5" 
                          : "border-border hover:border-primary/50"
                      )}
                      onClick={() => setPaymentMethod(method.id as typeof paymentMethod)}
                    >
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "w-4 h-4 rounded-full border-2 flex items-center justify-center",
                          paymentMethod === method.id ? "border-primary" : "border-border"
                        )}>
                          {paymentMethod === method.id && (
                            <div className="w-2 h-2 rounded-full bg-primary" />
                          )}
                        </div>
                        <div className="flex-1">
                          <p className="font-medium">{method.name}</p>
                          <p className="text-sm text-muted-foreground">{method.desc}</p>
                        </div>
                      </div>
                    </div>
                  ))}

                  <Separator className="my-4" />
                  
                  <Button 
                    onClick={handleSubmitOrder}
                    disabled={isLoading}
                    className="w-full"
                    size="lg"
                  >
                    {isLoading ? 'Przetwarzanie...' : 'Złóż zamówienie'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Checkout;