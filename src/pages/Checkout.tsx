import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { useAuth } from "@/hooks/useAuth";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ArrowLeft, CreditCard, Truck, Package } from "lucide-react";
import { CartItem } from "@/components/ShoppingCart";
import { ShippingAddresses } from "@/components/ShippingAddresses";
import { ParcelLockerPicker } from "@/components/ParcelLockerPicker";

const Checkout = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [searchParams] = useSearchParams();
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [itemSizes, setItemSizes] = useState<{ [key: string]: { x: number; y: number; z: number } }>({});
  const [itemOriginalSizes, setItemOriginalSizes] = useState<{ [key: string]: { x: number; y: number; z: number } }>({});
  const [itemMaterials, setItemMaterials] = useState<{ [key: string]: string }>({});
  const [virtualCurrency, setVirtualCurrency] = useState<number>(0);
  const [useVirtualCurrency, setUseVirtualCurrency] = useState<number>(0);
  const [paymentMethodConfig, setPaymentMethodConfig] = useState<any>(null);
  const [availablePaymentMethods, setAvailablePaymentMethods] = useState<Array<{
    method_key: string;
    name: string;
    description: string | null;
    is_active: boolean;
  }>>([]);
  const [needsInvoice, setNeedsInvoice] = useState(false);
  const [invoiceData, setInvoiceData] = useState({
    companyName: '',
    nip: '',
    address: '',
    city: '',
    postalCode: '',
    country: 'Polska'
  });
  
  // Stała referencja cenowa: model 190mm x 109mm x 9.8mm = 39 zł z PLA
  const REFERENCE_VOLUME_MM3 = 190 * 109 * 9.8; // = 203,042 mm³
  const REFERENCE_PRICE_PLA = 39.0;
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
  const [paymentMethod, setPaymentMethod] = useState<string>('traditional');
  const [selectedParcelLocker, setSelectedParcelLocker] = useState<{
    code: string;
    name: string;
    address: string;
    city: string;
    postal_code: string;
    lat: number;
    lng: number;
  } | null>(null);

  const deliveryPrices = {
    'inpost-courier': 15.99,
    'paczkomaty': 17.22
  };

  useEffect(() => {
    const loadProfileData = async () => {
      if (!user) return;

      // First try to load default shipping address
      const { data: defaultAddress } = await supabase
        .from('shipping_addresses')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_default', true)
        .maybeSingle();

      if (defaultAddress) {
        // Use default shipping address
        setCustomerInfo(prev => ({
          ...prev,
          firstName: defaultAddress.recipient_name.split(' ')[0] || '',
          lastName: defaultAddress.recipient_name.split(' ').slice(1).join(' ') || '',
          phone: defaultAddress.phone || '',
          address: defaultAddress.address || '',
          city: defaultAddress.city || '',
          postalCode: defaultAddress.postal_code || '',
          country: defaultAddress.country || 'Polska'
        }));
      } else {
        // Fallback to profile data if no default shipping address
        const { data: profile } = await supabase
          .from('profiles')
          .select('display_name, phone, address, city, postal_code, country')
          .eq('user_id', user.id)
          .maybeSingle();

        if (profile) {
          setCustomerInfo(prev => ({
            ...prev,
            firstName: profile.display_name?.split(' ')[0] || '',
            lastName: profile.display_name?.split(' ').slice(1).join(' ') || '',
            phone: profile.phone || '',
            address: profile.address || '',
            city: profile.city || '',
            postalCode: profile.postal_code || '',
            country: profile.country || 'Polska'
          }));
        }
      }

      // Load virtual currency balance
      const { data: wallet } = await supabase
        .from('user_wallets')
        .select('virtual_currency')
        .eq('user_id', user.id)
        .maybeSingle();

      if (wallet) {
        setVirtualCurrency(Number(wallet.virtual_currency) || 0);
      }

      // Load available payment methods
      const { data: methods } = await supabase
        .from('payment_methods')
        .select('method_key, name, description, is_active')
        .eq('is_active', true)
        .order('sort_order');

      if (methods) {
        setAvailablePaymentMethods(methods);
        // Set default payment method to first available
        if (methods.length > 0) {
          setPaymentMethod(methods[0].method_key);
        }
      }

      // Load favorite or last used parcel locker
      const { data: savedLockers } = await supabase
        .from('saved_parcel_lockers')
        .select('*')
        .eq('user_id', user.id)
        .order('is_favorite', { ascending: false })
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (savedLockers) {
        setSelectedParcelLocker({
          code: savedLockers.locker_code,
          name: savedLockers.locker_name,
          address: savedLockers.locker_address,
          city: savedLockers.locker_city || '',
          postal_code: savedLockers.locker_postal_code || '',
          lat: Number(savedLockers.location_lat) || 0,
          lng: Number(savedLockers.location_lng) || 0
        });
      }
    };

    loadProfileData();
  }, [user]);


  // Load user profile data and model dimensions
  useEffect(() => {
    const loadProfileAndDimensions = async () => {
      // Load user profile data
      if (user) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('display_name, phone, address, city, postal_code, country')
          .eq('user_id', user.id)
          .single();

        if (profileData) {
          // Extract first and last name from display_name if available
          const nameParts = profileData.display_name?.split(' ') || [];
          const firstName = nameParts[0] || '';
          const lastName = nameParts.slice(1).join(' ') || '';

          setCustomerInfo({
            firstName,
            lastName,
            email: user.email || '',
            phone: profileData.phone || '',
            address: profileData.address || '',
            city: profileData.city || '',
            postalCode: profileData.postal_code || '',
            country: profileData.country || 'Polska'
          });
        }
      }

      // Load model dimensions
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
            // If item already has dimensions (from main page), use them
            if (item.dimensions) {
              console.log(`Using pre-loaded dimensions for ${item.name}:`, item.dimensions);
              originalSizes[item.id] = { ...item.dimensions };
              
              // Check if dimensions exceed maximum and scale down if needed
              const maxX = 390;
              const maxY = 390;
              const maxZ = 380;
              
              const scaleX = item.dimensions.x > maxX ? maxX / item.dimensions.x : 1;
              const scaleY = item.dimensions.y > maxY ? maxY / item.dimensions.y : 1;
              const scaleZ = item.dimensions.z > maxZ ? maxZ / item.dimensions.z : 1;
              
              const scale = Math.min(scaleX, scaleY, scaleZ);
              
              sizes[item.id] = {
                x: Math.round(item.dimensions.x * scale * 10) / 10,
                y: Math.round(item.dimensions.y * scale * 10) / 10,
                z: Math.round(item.dimensions.z * scale * 10) / 10
              };
              
              if (scale < 1) {
                toast.info(`Model "${item.name}" został przeskalowany aby zmieścić się w maksymalnych wymiarach`);
              }
            } else {
              // Load from database
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
                  
                  console.log(`Loaded dimensions for ${item.name} from database:`, dimensions);
                  
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
                } else {
                  throw new Error('Failed to download model file');
                }
              } else {
                throw new Error('Model not found in database');
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
    
    loadProfileAndDimensions();
  }, [navigate, user]);

  useEffect(() => {
    console.log('Checkout auth check:', { loading, user: !!user });
    if (!loading && !user) {
      console.log('Redirecting to auth - no user found');
      toast.error('Musisz być zalogowany, aby złożyć zamówienie');
      // Save that we want to return to checkout after login
      navigate('/auth?returnTo=/checkout');
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
    const material = itemMaterials[item.id] || 'PLA';
    
    // Calculate volume in mm³ for current item's size
    const currentVolumeMm3 = size.x * size.y * size.z;
    
    // Reference: Model 190mm x 109mm x 9.8mm with PLA = 39 zł
    // This represents ~203,042 mm³
    
    // Calculate price based on volume ratio
    // Smaller volume = cheaper, larger volume = more expensive
    const volumeRatio = currentVolumeMm3 / REFERENCE_VOLUME_MM3;
    
    // Apply material multiplier
    const materialMultiplier = getMaterialMultiplier(material);
    
    // Calculate final price: reference price * volume ratio * material multiplier
    const pricePerUnit = REFERENCE_PRICE_PLA * volumeRatio * materialMultiplier;
    
    console.log(`Price calculation for ${item.name}:`, {
      currentSize: `${size.x.toFixed(1)} × ${size.y.toFixed(1)} × ${size.z.toFixed(1)} mm`,
      currentVolume: currentVolumeMm3.toFixed(0) + ' mm³',
      referenceVolume: REFERENCE_VOLUME_MM3.toFixed(0) + ' mm³ (190×109×9.8)',
      volumeRatio: volumeRatio.toFixed(3),
      material,
      materialMultiplier,
      basePricePLA: (REFERENCE_PRICE_PLA * volumeRatio).toFixed(2) + ' zł',
      finalPrice: pricePerUnit.toFixed(2) + ' zł'
    });
    
    return pricePerUnit * item.quantity;
  };

  const totalPrice = cartItems.reduce((sum, item) => sum + calculatePrice(item), 0);
  const deliveryPrice = deliveryPrices[deliveryMethod];
  const discount = Math.min(useVirtualCurrency, totalPrice + deliveryPrice);
  const finalPrice = Math.max(0, totalPrice + deliveryPrice - discount);

  const handleSubmitOrder = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      // Calculate total price for entire order
      const orderTotalPrice = cartItems.reduce((sum, item) => sum + calculatePrice(item), 0);
      
      // Collect all materials used
      const materialsUsed = [...new Set(cartItems.map(item => itemMaterials[item.id]))].join(', ');
      
      // Create special instructions with all item details
      const itemsDetails = cartItems.map(item => {
        const size = itemSizes[item.id];
        const material = itemMaterials[item.id];
        return `${item.name}: ${size.x}mm × ${size.y}mm × ${size.z}mm (${material}) x ${item.quantity}`;
      }).join('\n');
      
      const parcelLockerInfo = deliveryMethod === 'paczkomaty' && selectedParcelLocker 
        ? `\nPaczkomat: ${selectedParcelLocker.name} (${selectedParcelLocker.code})\nAdres paczkomatu: ${selectedParcelLocker.address}, ${selectedParcelLocker.postal_code} ${selectedParcelLocker.city}` 
        : '';
      
      const specialInstructions = `Dostawa: ${deliveryMethod === 'inpost-courier' ? 'Kurier InPost' : 'Paczkomaty InPost'}
Płatność: ${paymentMethod}${parcelLockerInfo}

Produkty:
${itemsDetails}

${orderInfo.instructions ? `Uwagi: ${orderInfo.instructions}` : ''}`;

      // Create ONE order for all items
      const orderNumber = `ORD-${Date.now()}`;
      
      // Look up first model's UUID from database
      const { data: firstModels } = await supabase
        .from('models')
        .select('id')
        .eq('user_id', user.id)
        .eq('name', cartItems[0].name)
        .limit(1);

      if (!firstModels || firstModels.length === 0) {
        throw new Error(`Model "${cartItems[0].name}" nie został znaleziony w bazie danych`);
      }

      const firstModelId = firstModels[0].id;
      
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          user_id: user.id,
          model_id: firstModelId,
          quantity: cartItems.reduce((sum, item) => sum + item.quantity, 0),
          total_price: orderTotalPrice,
          material: materialsUsed,
          special_instructions: specialInstructions,
          status: 'pending',
          order_number: orderNumber,
          // Add shipping information
          customer_first_name: customerInfo.firstName,
          customer_last_name: customerInfo.lastName,
          customer_email: customerInfo.email,
          customer_phone: customerInfo.phone,
          shipping_address: customerInfo.address,
          shipping_city: customerInfo.city,
          shipping_postal_code: customerInfo.postalCode,
          shipping_country: customerInfo.country,
          delivery_method: deliveryMethod,
          payment_method: paymentMethod,
          invoice_data: needsInvoice ? invoiceData : null,
          // Add parcel locker information if paczkomaty delivery
          parcel_locker_code: deliveryMethod === 'paczkomaty' && selectedParcelLocker ? selectedParcelLocker.code : null,
          parcel_locker_name: deliveryMethod === 'paczkomaty' && selectedParcelLocker ? selectedParcelLocker.name : null,
          parcel_locker_address: deliveryMethod === 'paczkomaty' && selectedParcelLocker ? `${selectedParcelLocker.address}, ${selectedParcelLocker.postal_code} ${selectedParcelLocker.city}` : null
        })
        .select()
        .single();

      if (orderError) {
        console.error('Order creation error:', orderError);
        throw orderError;
      }

      console.log('Created order:', order);

      // Create order items for EACH product in the cart
      for (const item of cartItems) {
        // Look up actual model UUID from database by name
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
        const size = itemSizes[item.id];
        const material = itemMaterials[item.id];
        const itemPrice = calculatePrice(item);

        const { error: itemError } = await supabase
          .from('order_items')
          .insert({
            order_id: order.id,
            model_id: modelId,
            quantity: item.quantity,
            unit_price: itemPrice / item.quantity,
            color: item.color,
            material: material,
            size_scale: Math.max(size.x, size.y, size.z) / 100,
            thumbnail: item.image // Save thumbnail from cart item
          });

        if (itemError) {
          console.error('Order item creation error:', itemError);
          throw itemError;
        }
      }

      // Save shipping info to profile for future orders
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          user_id: user.id,
          display_name: `${customerInfo.firstName} ${customerInfo.lastName}`,
          phone: customerInfo.phone,
          address: customerInfo.address,
          city: customerInfo.city,
          postal_code: customerInfo.postalCode,
          country: customerInfo.country
        });

      if (profileError) {
        console.warn('Could not save profile data:', profileError);
        // Don't throw error, just log it - order was successful
      }

      // Save shipping information to user profile if not already saved
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('display_name, phone, address, city, postal_code, country')
        .eq('user_id', user.id)
        .single();

      // Update profile if shipping info is missing or incomplete
      if (existingProfile && (!existingProfile.address || !existingProfile.phone)) {
        await supabase
          .from('profiles')
          .update({
            phone: customerInfo.phone,
            address: customerInfo.address,
            city: customerInfo.city,
            postal_code: customerInfo.postalCode,
            country: customerInfo.country,
            display_name: existingProfile.display_name || `${customerInfo.firstName} ${customerInfo.lastName}`.trim()
          })
          .eq('user_id', user.id);
        
        toast.success('Dane wysyłkowe zostały zapisane do Twojego profilu');
      }

      // Deduct virtual currency if used
      if (useVirtualCurrency > 0) {
        const { error: walletError } = await supabase
          .from('user_wallets')
          .update({ 
            virtual_currency: Math.max(0, virtualCurrency - useVirtualCurrency) 
          })
          .eq('user_id', user.id);

        if (walletError) {
          console.warn('Could not update wallet:', walletError);
        }

        // Log transaction
        await supabase
          .from('wallet_transactions')
          .insert({
            user_id: user.id,
            amount: -useVirtualCurrency,
            transaction_type: 'order_payment',
            description: `Płatność za zamówienie ${orderNumber}`,
            related_order_id: order.id
          });
      }

      // Save address to shipping_addresses table
      const { data: existingAddresses } = await supabase
        .from('shipping_addresses')
        .select('id')
        .eq('user_id', user.id);

      const hasExistingAddresses = existingAddresses && existingAddresses.length > 0;

      // Check if this exact address already exists
      const { data: duplicateAddress } = await supabase
        .from('shipping_addresses')
        .select('id')
        .eq('user_id', user.id)
        .eq('recipient_name', `${customerInfo.firstName} ${customerInfo.lastName}`)
        .eq('address', customerInfo.address)
        .eq('city', customerInfo.city)
        .eq('postal_code', customerInfo.postalCode)
        .maybeSingle();

      if (!duplicateAddress) {
        // Create new address entry
        const { error: addressError } = await supabase
          .from('shipping_addresses')
          .insert({
            user_id: user.id,
            label: hasExistingAddresses ? `Zamówienie ${orderNumber}` : 'Dom',
            recipient_name: `${customerInfo.firstName} ${customerInfo.lastName}`,
            phone: customerInfo.phone,
            address: customerInfo.address,
            city: customerInfo.city,
            postal_code: customerInfo.postalCode,
            country: customerInfo.country,
            is_default: !hasExistingAddresses // Set as default only if it's the first address
          });

        if (addressError) {
          console.warn('Could not save shipping address:', addressError);
          // Don't throw error, just log it - order was successful
        }
      }

      // Save parcel locker if paczkomaty delivery was chosen
      if (deliveryMethod === 'paczkomaty' && selectedParcelLocker) {
        // Check if this locker already exists
        const { data: existingLocker } = await supabase
          .from('saved_parcel_lockers')
          .select('id')
          .eq('user_id', user.id)
          .eq('locker_code', selectedParcelLocker.code)
          .maybeSingle();

        if (!existingLocker) {
          const { error: lockerError } = await supabase
            .from('saved_parcel_lockers')
            .insert({
              user_id: user.id,
              locker_code: selectedParcelLocker.code,
              locker_name: selectedParcelLocker.name,
              locker_address: selectedParcelLocker.address,
              locker_city: selectedParcelLocker.city,
              locker_postal_code: selectedParcelLocker.postal_code,
              location_lat: selectedParcelLocker.lat,
              location_lng: selectedParcelLocker.lng,
              is_favorite: false
            });

          if (lockerError) {
            console.warn('Could not save parcel locker:', lockerError);
            // Don't throw error, just log it - order was successful
          }
        }
      }

      const { data: paymentMethodData } = await supabase
        .from('payment_methods')
        .select('*')
        .eq('method_key', paymentMethod === 'payu' ? 'payu_standard' : paymentMethod)
        .single();

      const paymentConfig = (paymentMethodData?.config || {}) as any;

      // Handle PayU payment (for any payu_* method)
      if (paymentMethod.startsWith('payu_')) {
        try {
          const currentUrl = window.location.origin;
          const continueUrl = `${currentUrl}/payment-status?orderId=${order.id}`;
          
          // Create PayU order
          const payuResponse = await supabase.functions.invoke('payu-payment', {
            body: {
              action: 'create_order',
              customerIp: '127.0.0.1', // In production, get real IP
              description: `Zamówienie ${orderNumber}`,
              totalAmount: finalPrice,
              buyer: {
                email: customerInfo.email,
                phone: customerInfo.phone,
                firstName: customerInfo.firstName,
                lastName: customerInfo.lastName,
              },
              products: cartItems.map(item => ({
                name: item.name,
                unitPrice: (calculatePrice(item) / item.quantity).toString(),
                quantity: item.quantity.toString(),
              })),
              continueUrl,
            },
          });

          if (payuResponse.error) {
            throw new Error(payuResponse.error.message);
          }

          const payuData = payuResponse.data;
          
          if (payuData.success && payuData.redirectUri) {
            // Clear cart before redirect
            localStorage.removeItem('cartItems');
            
            // Redirect to PayU
            window.location.href = payuData.redirectUri;
            return;
          } else {
            throw new Error('PayU nie zwróciło URL przekierowania');
          }
        } catch (payuError) {
          console.error('PayU error:', payuError);
          toast.error(`Błąd płatności PayU: ${payuError instanceof Error ? payuError.message : 'Nieznany błąd'}`);
          setIsLoading(false);
          return;
        }
      }

      // Send order confirmation email for all payment methods
      try {
        const emailData: any = {
          orderId: order.id,
          customerEmail: customerInfo.email,
          orderNumber: orderNumber,
          items: cartItems.map(item => ({
            name: item.name,
            quantity: item.quantity,
            price: calculatePrice(item)
          })),
          totalPrice: finalPrice,
          deliveryMethod: deliveryMethod === 'paczkomaty' ? 'Paczkomaty InPost' : 'Kurier InPost',
          paymentMethod: paymentMethodData?.name || 'Przelew tradycyjny',
          shippingAddress: {
            name: `${customerInfo.firstName} ${customerInfo.lastName}`,
            address: customerInfo.address,
            city: customerInfo.city,
            postalCode: customerInfo.postalCode,
            country: customerInfo.country
          }
        };

        // Add payment details for traditional transfer
        if (paymentMethod === 'traditional' && paymentConfig.account_number) {
          emailData.paymentDetails = {
            accountNumber: paymentConfig.account_number,
            accountHolder: paymentConfig.account_holder,
            transferTitle: paymentConfig.transfer_title?.replace('{order_number}', orderNumber) || orderNumber
          };
        }

        // Add invoice data if needed
        if (needsInvoice) {
          emailData.invoiceData = invoiceData;
        }

        await supabase.functions.invoke('send-order-confirmation', {
          body: emailData
        });

        console.log('Order confirmation email sent');
      } catch (emailError) {
        console.error('Error sending confirmation email:', emailError);
        // Don't block order completion if email fails
      }

      // Clear cart for non-PayU payments
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
                      {item.image ? (
                        <img 
                          src={item.image}
                          alt={item.name}
                          className="w-16 h-16 object-cover rounded border border-border"
                          loading="lazy"
                        />
                      ) : (
                        <div 
                          className="w-16 h-16 rounded border border-border flex items-center justify-center"
                          style={{ backgroundColor: item.color }}
                        >
                          <span className="text-xs text-center px-1">3D</span>
                        </div>
                      )}
                      
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
                        <Label htmlFor={`scale-${item.id}`} className="text-sm flex justify-between items-center">
                          <span>Skala (%)</span>
                          <span className="font-mono text-xs text-muted-foreground">
                            {Math.round((size.x / (itemOriginalSizes[item.id]?.x || 1)) * 100)}%
                          </span>
                        </Label>
                        {isMobile ? (
                          <Slider
                            id={`scale-${item.id}`}
                            min={1}
                            max={1000}
                            step={1}
                            value={[Math.round((size.x / (itemOriginalSizes[item.id]?.x || 1)) * 100)]}
                            onValueChange={(values) => {
                              const scalePercent = values[0];
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
                            className="mt-2"
                          />
                        ) : (
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
                        )}
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
                
                {/* Virtual Currency Section */}
                {virtualCurrency > 0 && (
                  <>
                    <Separator />
                    <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">Dostępne wirtualne PLN:</span>
                        <span className="text-sm font-semibold text-primary">{virtualCurrency.toFixed(2)} zł</span>
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="useVirtualCurrency" className="text-xs">
                          Użyj wirtualnych PLN (max: {Math.min(virtualCurrency, totalPrice + deliveryPrice).toFixed(2)} zł)
                        </Label>
                        <div className="flex gap-2">
                          <Input
                            id="useVirtualCurrency"
                            type="number"
                            min="0"
                            max={Math.min(virtualCurrency, totalPrice + deliveryPrice)}
                            step="0.01"
                            value={useVirtualCurrency}
                            onChange={(e) => {
                              const value = Math.min(
                                Math.max(0, Number(e.target.value)),
                                Math.min(virtualCurrency, totalPrice + deliveryPrice)
                              );
                              setUseVirtualCurrency(value);
                            }}
                            className="h-9"
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setUseVirtualCurrency(Math.min(virtualCurrency, totalPrice + deliveryPrice))}
                          >
                            Max
                          </Button>
                        </div>
                      </div>
                    </div>
                  </>
                )}
                
                {discount > 0 && (
                  <div className="flex justify-between items-center text-sm text-primary">
                    <span>Rabat (wirtualne PLN):</span>
                    <span>-{discount.toFixed(2)} zł</span>
                  </div>
                )}
                
                <Separator />
                <div className="flex justify-between items-center font-semibold text-lg">
                  <span>Całkowita wartość:</span>
                  <span>{finalPrice.toFixed(2)} zł</span>
                </div>

                {/* Payment details for traditional transfer */}
                {paymentMethod === 'traditional' && paymentMethodConfig?.account_number && (
                  <>
                    <Separator className="my-4" />
                    <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg space-y-2">
                      <h4 className="font-semibold text-sm">Dane do przelewu:</h4>
                      <div className="space-y-1 text-sm">
                        <p><span className="text-muted-foreground">Numer konta:</span></p>
                        <p className="font-mono font-semibold">{paymentMethodConfig.account_number}</p>
                        {paymentMethodConfig.account_holder && (
                          <p><span className="text-muted-foreground">Odbiorca:</span> {paymentMethodConfig.account_holder}</p>
                        )}
                        <p><span className="text-muted-foreground">Kwota:</span> <span className="font-semibold">{finalPrice.toFixed(2)} zł</span></p>
                        {paymentMethodConfig.transfer_title && (
                          <p><span className="text-muted-foreground">Tytuł:</span> {paymentMethodConfig.transfer_title.replace('{order_number}', 'ORD-...')}</p>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">
                        Dokładne dane zostaną wysłane w potwierdzeniu zamówienia
                      </p>
                    </div>
                  </>
                )}
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
                {/* Display selected parcel locker for paczkomaty delivery */}
                {deliveryMethod === 'paczkomaty' && selectedParcelLocker && (
                  <div className="p-4 bg-primary/10 border border-primary/20 rounded-lg mb-4">
                    <p className="text-sm font-medium text-muted-foreground mb-2">
                      Wybrany paczkomat:
                    </p>
                    <p className="font-semibold text-primary">{selectedParcelLocker.name}</p>
                    <p className="text-sm">{selectedParcelLocker.address}</p>
                    <p className="text-sm text-muted-foreground">
                      {selectedParcelLocker.postal_code} {selectedParcelLocker.city}
                    </p>
                  </div>
                )}
                
                {/* Display default address for courier delivery */}
                {deliveryMethod === 'inpost-courier' && customerInfo.address && (
                  <div className="p-4 bg-muted border rounded-lg mb-4">
                    <p className="text-sm font-medium text-muted-foreground mb-2">
                      Adres dostawy:
                    </p>
                    <p className="font-semibold">
                      {customerInfo.firstName} {customerInfo.lastName}
                    </p>
                    <p className="text-sm">{customerInfo.phone}</p>
                    <p className="text-sm">{customerInfo.address}</p>
                    <p className="text-sm">
                      {customerInfo.postalCode} {customerInfo.city}
                    </p>
                    <p className="text-sm text-muted-foreground">{customerInfo.country}</p>
                  </div>
                )}

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

            {/* Parcel Locker Picker - shown only for paczkomaty delivery */}
            {deliveryMethod === 'paczkomaty' && (
              <ParcelLockerPicker
                userAddress={customerInfo.address}
                userCity={customerInfo.city}
                userPostalCode={customerInfo.postalCode}
                onLockerSelect={(locker) => setSelectedParcelLocker(locker)}
                selectedLocker={selectedParcelLocker}
              />
            )}

            {/* Invoice Data */}
            <Card>
              <CardHeader>
                <CardTitle>Dane do faktury VAT</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="needsInvoice" 
                    checked={needsInvoice}
                    onCheckedChange={(checked) => setNeedsInvoice(checked as boolean)}
                  />
                  <label 
                    htmlFor="needsInvoice" 
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                  >
                    Potrzebuję faktury VAT
                  </label>
                </div>

                {needsInvoice && (
                  <div className="space-y-4 pt-4 border-t">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="md:col-span-2">
                        <Label htmlFor="companyName">Nazwa firmy *</Label>
                        <Input
                          id="companyName"
                          value={invoiceData.companyName}
                          onChange={(e) => setInvoiceData({ ...invoiceData, companyName: e.target.value })}
                          required={needsInvoice}
                        />
                      </div>
                      <div>
                        <Label htmlFor="nip">NIP *</Label>
                        <Input
                          id="nip"
                          value={invoiceData.nip}
                          onChange={(e) => setInvoiceData({ ...invoiceData, nip: e.target.value })}
                          required={needsInvoice}
                        />
                      </div>
                      <div>
                        <Label htmlFor="invoiceCity">Miasto *</Label>
                        <Input
                          id="invoiceCity"
                          value={invoiceData.city}
                          onChange={(e) => setInvoiceData({ ...invoiceData, city: e.target.value })}
                          required={needsInvoice}
                        />
                      </div>
                      <div className="md:col-span-2">
                        <Label htmlFor="invoiceAddress">Adres *</Label>
                        <Input
                          id="invoiceAddress"
                          value={invoiceData.address}
                          onChange={(e) => setInvoiceData({ ...invoiceData, address: e.target.value })}
                          required={needsInvoice}
                        />
                      </div>
                      <div>
                        <Label htmlFor="invoicePostalCode">Kod pocztowy *</Label>
                        <Input
                          id="invoicePostalCode"
                          value={invoiceData.postalCode}
                          onChange={(e) => setInvoiceData({ ...invoiceData, postalCode: e.target.value })}
                          required={needsInvoice}
                        />
                      </div>
                      <div>
                        <Label htmlFor="invoiceCountry">Kraj *</Label>
                        <Input
                          id="invoiceCountry"
                          value={invoiceData.country}
                          onChange={(e) => setInvoiceData({ ...invoiceData, country: e.target.value })}
                          required={needsInvoice}
                        />
                      </div>
                    </div>
                  </div>
                )}
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
                  {availablePaymentMethods.map((method) => (
                    <div
                      key={method.method_key}
                      className={cn(
                        "p-3 border-2 rounded-lg cursor-pointer transition-all",
                        paymentMethod === method.method_key 
                          ? "border-primary bg-primary/5" 
                          : "border-border hover:border-primary/50"
                      )}
                      onClick={() => setPaymentMethod(method.method_key)}
                    >
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "w-4 h-4 rounded-full border-2 flex items-center justify-center",
                          paymentMethod === method.method_key ? "border-primary" : "border-border"
                        )}>
                          {paymentMethod === method.method_key && (
                            <div className="w-2 h-2 rounded-full bg-primary" />
                          )}
                        </div>
                        <div className="flex-1">
                          <p className="font-medium">{method.name}</p>
                          <p className="text-sm text-muted-foreground">{method.description}</p>
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