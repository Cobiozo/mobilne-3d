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
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ArrowLeft, CreditCard, Truck, Package } from "lucide-react";
import { CartItem } from "@/components/ShoppingCart";

const Checkout = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
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

  useEffect(() => {
    // Get cart items from localStorage or URL params
    const savedCart = localStorage.getItem('cartItems');
    if (savedCart) {
      const items = JSON.parse(savedCart);
      setCartItems(items);
    } else {
      // If no cart items, redirect back
      toast.error('Brak elementów w koszyku');
      navigate('/');
    }
  }, [navigate]);

  useEffect(() => {
    if (!user) {
      toast.error('Musisz być zalogowany, aby złożyć zamówienie');
      navigate('/auth');
    }
  }, [user, navigate]);

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

  const calculatePrice = (item: CartItem) => {
    // Basic pricing logic - can be enhanced
    const basePricePerGram = 0.20; // 20 groszy per gram
    const estimatedWeight = 50; // Default estimated weight in grams
    return basePricePerGram * estimatedWeight * item.quantity;
  };

  const totalPrice = cartItems.reduce((sum, item) => sum + calculatePrice(item), 0);

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

        // Create order
        const { data: order, error: orderError } = await supabase
          .from('orders')
          .insert({
            user_id: user.id,
            model_id: modelId,
            quantity: item.quantity,
            total_price: itemPrice,
            material: orderInfo.material,
            special_instructions: orderInfo.instructions,
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
            material: orderInfo.material
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
              {cartItems.map((item) => (
                <div key={item.id} className="flex items-center gap-3 p-3 border rounded-lg">
                  <div 
                    className="w-8 h-8 rounded border border-border"
                    style={{ backgroundColor: item.color }}
                  />
                  
                  <div className="flex-1">
                    <h4 className="font-medium">{item.name}</h4>
                    <p className="text-sm text-muted-foreground">
                      {getColorName(item.color)} • Ilość: {item.quantity}
                    </p>
                    <p className="text-sm font-medium">
                      {calculatePrice(item).toFixed(2)} zł
                    </p>
                  </div>
                </div>
              ))}
              
              <Separator />
              
              <div className="flex justify-between items-center font-semibold text-lg">
                <span>Całkowita wartość:</span>
                <span>{totalPrice.toFixed(2)} zł</span>
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
                  <Truck className="w-5 h-5" />
                  Opcje zamówienia
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="material">Materiał</Label>
                  <Select 
                    value={orderInfo.material} 
                    onValueChange={(value) => setOrderInfo(prev => ({ ...prev, material: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Wybierz materiał" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PLA">PLA (Standard)</SelectItem>
                      <SelectItem value="ABS">ABS (Wytrzymały)</SelectItem>
                      <SelectItem value="PETG">PETG (Przezroczysty)</SelectItem>
                      <SelectItem value="TPU">TPU (Elastyczny)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
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

            {/* Payment */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="w-5 h-5" />
                  Płatność
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="p-4 bg-muted rounded-lg">
                    <p className="text-sm text-muted-foreground">
                      Płatność będzie możliwa po potwierdzeniu zamówienia przez nasz zespół.
                      Skontaktujemy się z Tobą w ciągu 24 godzin z szczegółami dotyczącymi płatności.
                    </p>
                  </div>
                  
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