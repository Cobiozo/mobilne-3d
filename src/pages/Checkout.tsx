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
  const [itemOriginalSizes, setItemOriginalSizes] = useState<{ [key: string]: { x: number; y: number; z: number } }>({});
  const [itemMaterials, setItemMaterials] = useState<{ [key: string]: string }>({});
  const [loadingDimensions, setLoadingDimensions] = useState(true);
  
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
    const loadModelDimensions = async () => {
      const savedCart = localStorage.getItem('cartItems');
      if (savedCart) {
        const items = JSON.parse(savedCart);
        setCartItems(items);
        
        setLoadingDimensions(true);
        
        const sizes: { [key: string]: { x: number; y: number; z: number } } = {};
        const originalSizes: { [key: string]: { x: number; y: number; z: number } } = {};
        const materials: { [key: string]: string } = {};
        
        // Load actual dimensions from each model
        for (const item of items) {
          try {
            // Get model from database to get file URL
            const { data: models } = await supabase
              .from('models')
              .select('file_url')
              .eq('id', item.id)
              .limit(1);
            
            if (models && models.length > 0) {
              const model = models[0];
              
              // Extract file path
              let filePath = '';
              if (model.file_url.includes('/storage/v1/object/public/models/')) {
                const urlParts = model.file_url.split('/storage/v1/object/public/models/');
                filePath = urlParts[1];
              } else if (model.file_url.includes('/models/')) {
                const urlParts = model.file_url.split('/models/');
                filePath = urlParts[1];
              } else {
                filePath = model.file_url;
              }
              
              // Download model file
              const { data: fileData, error } = await supabase.storage
                .from('models')
                .download(filePath);
              
              if (!error && fileData) {
                const arrayBuffer = await fileData.arrayBuffer();
                
                // Import the function dynamically
                const { getModelDimensions } = await import('@/utils/modelLoader');
                const dimensions = getModelDimensions(arrayBuffer);
                
                // Store original dimensions
                originalSizes[item.id] = { ...dimensions };
                
                // Check if dimensions exceed maximum and scale down if needed
                const maxX = 390;
                const maxY = 390;
                const maxZ = 380;
                
                const scaleX = dimensions.x > maxX ? maxX / dimensions.x : 1;
                const scaleY = dimensions.y > maxY ? maxY / dimensions.y : 1;
                const scaleZ = dimensions.z > maxZ ? maxZ / dimensions.z : 1;
                
                const scale = Math.min(scaleX, scaleY, scaleZ);
                
                sizes[item.id] = {
                  x: Math.round(dimensions.x * scale * 10) / 10,
                  y: Math.round(dimensions.y * scale * 10) / 10,
                  z: Math.round(dimensions.z * scale * 10) / 10
                };
                
                if (scale < 1) {
                  toast.info(`Model "${item.name}" został przeskalowany aby zmieścić się w maksymalnych wymiarach`);
                }
              }
            }
          } catch (error) {
            console.error(`Error loading dimensions for ${item.name}:`, error);
            // Fallback to default dimensions
            sizes[item.id] = { x: 100, y: 100, z: 100 };
            originalSizes[item.id] = { x: 100, y: 100, z: 100 };
          }
          
          materials[item.id] = 'PLA';
        }
        
        setItemSizes(sizes);
        setItemOriginalSizes(originalSizes);
        setItemMaterials(materials);
        setLoadingDimensions(false);
      } else {
        toast.error('Brak elementów w koszyku');
        navigate('/');
      }
    };
    
    loadModelDimensions();
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
    const size = itemSizes[item.id] || { x: 100, y: 100, z: 100 };
    const originalSize = itemOriginalSizes[item.id] || { x: 100, y: 100, z: 100 };
    const material = itemMaterials[item.id] || 'PLA';
    
    // Calculate volume in mm³ for original size at 100% scale
    const originalVolumeMm3 = originalSize.x * originalSize.y * originalSize.z;
    
    // Calculate volume in mm³ for current size
    const currentVolumeMm3 = size.x * size.y * size.z;
    
    // Reference: User's model at 100% scale with PLA = 39 zł
    // We use the first item's original volume as reference
    const referenceVolumeMm3 = originalVolumeMm3;
    const referencePricePLA = 39.0; // Base price for 100% scale PLA
    
    // Calculate price based on volume ratio
    const volumeRatio = currentVolumeMm3 / referenceVolumeMm3;
    
    // Apply material multiplier
    const materialMultiplier = getMaterialMultiplier(material);
    
    // Calculate final price: base price * volume ratio * material multiplier * quantity
    const pricePerUnit = referencePricePLA * volumeRatio * materialMultiplier;
    
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
              {loadingDimensions ? (
                <div className="flex items-center justify-center py-8">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                    <p className="text-sm text-muted-foreground">Wczytywanie wymiarów modeli...</p>
                  </div>
                </div>
              ) : (
                cartItems.map((item) => {
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
                      <Label className="text-sm font-medium">Skalowanie modelu</Label>
                      <p className="text-xs text-muted-foreground">
                        Oryginalne wymiary: {itemOriginalSizes[item.id]?.x.toFixed(1) || '?'} × {itemOriginalSizes[item.id]?.y.toFixed(1) || '?'} × {itemOriginalSizes[item.id]?.z.toFixed(1) || '?'} mm
                      </p>
                      
                      <div>
                        <Label htmlFor={`scale-${item.id}`} className="text-sm">
                          Skala (%)
                        </Label>
                        <Input
                          id={`scale-${item.id}`}
                          type="number"
                          min="1"
                          max="1000"
                          value={Math.round((size.x / (itemOriginalSizes[item.id]?.x || 1)) * 100)}
                          onChange={(e) => {
                            const scalePercent = Math.max(1, Math.min(1000, parseInt(e.target.value) || 100));
                            const scale = scalePercent / 100;
                            const originalSize = itemOriginalSizes[item.id] || { x: 100, y: 100, z: 100 };
                            
                            let newX = originalSize.x * scale;
                            let newY = originalSize.y * scale;
                            let newZ = originalSize.z * scale;
                            
                            // Check if exceeds maximum and scale down proportionally
                            const scaleX = newX > 390 ? 390 / newX : 1;
                            const scaleY = newY > 390 ? 390 / newY : 1;
                            const scaleZ = newZ > 380 ? 380 / newZ : 1;
                            const maxScale = Math.min(scaleX, scaleY, scaleZ);
                            
                            if (maxScale < 1) {
                              newX *= maxScale;
                              newY *= maxScale;
                              newZ *= maxScale;
                              toast.warning('Wymiary zostały ograniczone do maksymalnych');
                            }
                            
                            setItemSizes(prev => ({
                              ...prev,
                              [item.id]: {
                                x: Math.round(newX * 10) / 10,
                                y: Math.round(newY * 10) / 10,
                                z: Math.round(newZ * 10) / 10
                              }
                            }));
                          }}
                          className="h-9"
                        />
                      </div>
                      
                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <Label className="text-xs text-muted-foreground">
                            X (mm)
                          </Label>
                          <Input
                            type="number"
                            value={size.x.toFixed(1)}
                            disabled
                            className="h-9 bg-muted"
                          />
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground">
                            Y (mm)
                          </Label>
                          <Input
                            type="number"
                            value={size.y.toFixed(1)}
                            disabled
                            className="h-9 bg-muted"
                          />
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground">
                            Z (mm)
                          </Label>
                          <Input
                            type="number"
                            value={size.z.toFixed(1)}
                            disabled
                            className="h-9 bg-muted"
                          />
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Max: 390mm (X,Y) × 380mm (Z) - proporcje są zachowane
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
              })
              )}
              
              <Separator />
              
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