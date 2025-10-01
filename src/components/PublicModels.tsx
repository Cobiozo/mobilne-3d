import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ModelThumbnail } from '@/components/ModelThumbnail';
import { supabase } from '@/integrations/supabase/client';
import { ShoppingCart, Palette, Package } from 'lucide-react';
import { toast } from 'sonner';
import { CartItem } from '@/components/ShoppingCart';

interface PublicModel {
  id: string;
  name: string;
  description: string | null;
  file_url: string;
  file_size: number | null;
  created_at: string;
  profiles: {
    display_name: string | null;
  } | null;
}

export const PublicModels = () => {
  const [models, setModels] = useState<PublicModel[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedColors, setSelectedColors] = useState<{ [key: string]: string }>({});
  const [availableColors, setAvailableColors] = useState<Array<{ color_hex: string; color_name: string }>>([]);
  const [addingToCart, setAddingToCart] = useState<string | null>(null);

  useEffect(() => {
    fetchPublicModels();
    loadAvailableColors();
  }, []);

  const loadAvailableColors = async () => {
    const { data, error } = await supabase
      .from("available_colors")
      .select("color_hex, color_name")
      .eq("is_active", true)
      .order("sort_order", { ascending: true });

    if (!error && data) {
      setAvailableColors(data);
    }
  };

  const fetchPublicModels = async () => {
    setIsLoading(true);
    try {
      const { data: modelsData, error } = await supabase
        .from('models')
        .select('id, name, description, file_url, file_size, created_at, user_id')
        .eq('is_public', true)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch profiles separately
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('user_id, display_name');

      // Combine data
      const combinedData = modelsData?.map(model => ({
        ...model,
        profiles: profilesData?.find(p => p.user_id === model.user_id) || null
      })) || [];

      setModels(combinedData);
      
      // Initialize default colors (black)
      const defaultColors: { [key: string]: string } = {};
      combinedData?.forEach(model => {
        defaultColors[model.id] = '#000000';
      });
      setSelectedColors(defaultColors);
    } catch (error) {
      console.error('Error fetching public models:', error);
      toast.error('Nie udało się załadować modeli');
    } finally {
      setIsLoading(false);
    }
  };

  const handleColorChange = (modelId: string, color: string) => {
    setSelectedColors(prev => ({
      ...prev,
      [modelId]: color
    }));
  };

  const handleAddToCart = async (model: PublicModel) => {
    setAddingToCart(model.id);
    
    try {
      // Download model file to get dimensions and generate thumbnail
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

      const { data: fileData, error: downloadError } = await supabase.storage
        .from('models')
        .download(filePath);

      if (downloadError || !fileData) {
        throw new Error('Nie udało się pobrać pliku modelu');
      }

      const arrayBuffer = await fileData.arrayBuffer();
      
      // Get dimensions
      const { getModelDimensions } = await import('@/utils/modelLoader');
      const dimensions = getModelDimensions(arrayBuffer);

      // Generate thumbnail
      const { generateThumbnailFromModel } = await import('@/utils/thumbnailGenerator');
      const selectedColor = selectedColors[model.id] || '#000000';
      const thumbnailUrl = await generateThumbnailFromModel(arrayBuffer, selectedColor);

      // Create cart item
      const newItem: CartItem = {
        id: model.id,
        name: model.name,
        color: selectedColor,
        quantity: 1,
        dimensions: dimensions,
        image: thumbnailUrl
      };

      // Load existing cart
      const savedCart = localStorage.getItem('cartItems');
      let cartItems: CartItem[] = [];
      
      if (savedCart) {
        try {
          cartItems = JSON.parse(savedCart);
        } catch (error) {
          console.error('Error parsing cart:', error);
        }
      }

      // Check if item already exists with same color
      const existingIndex = cartItems.findIndex(
        item => item.id === newItem.id && item.color === newItem.color
      );

      if (existingIndex >= 0) {
        // Increase quantity
        cartItems[existingIndex].quantity += 1;
        toast.success(`Zwiększono ilość "${newItem.name}" w koszyku`);
      } else {
        // Add new item
        cartItems.push(newItem);
        toast.success(`Dodano "${newItem.name}" do koszyka`);
      }

      // Save to localStorage
      localStorage.setItem('cartItems', JSON.stringify(cartItems));
      
      // Dispatch custom event to notify other components
      window.dispatchEvent(new CustomEvent('cartUpdated', { 
        detail: { cartItems } 
      }));
      
    } catch (error) {
      console.error('Error adding to cart:', error);
      toast.error('Nie udało się dodać modelu do koszyka');
    } finally {
      setAddingToCart(null);
    }
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return 'N/A';
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(2)} MB`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (models.length === 0) {
    return (
      <div className="text-center py-12">
        <Package className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">Brak publicznych modeli</h3>
        <p className="text-muted-foreground">
          Obecnie nie ma dostępnych publicznych modeli 3D
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {models.map((model) => (
        <Card key={model.id} className="overflow-hidden hover:shadow-lg transition-shadow">
          <CardHeader className="p-0">
            <ModelThumbnail 
              fileUrl={model.file_url}
              color={selectedColors[model.id] || '#000000'}
              className="w-full h-48"
            />
          </CardHeader>
          <CardContent className="p-4">
            <div className="space-y-3">
              <div>
                <CardTitle className="text-base line-clamp-1">{model.name}</CardTitle>
                {model.description && (
                  <CardDescription className="text-xs mt-1 line-clamp-2">
                    {model.description}
                  </CardDescription>
                )}
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant="outline" className="text-xs">
                    {formatFileSize(model.file_size)}
                  </Badge>
                  {model.profiles?.display_name && (
                    <span className="text-xs text-muted-foreground">
                      by {model.profiles.display_name}
                    </span>
                  )}
                </div>
              </div>

              {/* Color selector */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Palette className="w-4 h-4 text-muted-foreground" />
                  <span className="text-xs font-medium">Personalizuj kolor</span>
                </div>
                <Select
                  value={selectedColors[model.id] || '#000000'}
                  onValueChange={(value) => handleColorChange(model.id, value)}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue>
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-4 h-4 rounded border border-border"
                          style={{ backgroundColor: selectedColors[model.id] || '#000000' }}
                        />
                        <span className="text-xs">
                          {availableColors.find(c => c.color_hex === selectedColors[model.id])?.color_name || 'Czarny'}
                        </span>
                      </div>
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {availableColors.map((color) => (
                      <SelectItem key={color.color_hex} value={color.color_hex}>
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-4 h-4 rounded border border-border"
                            style={{ backgroundColor: color.color_hex }}
                          />
                          <span>{color.color_name}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Add to cart button */}
              <Button
                className="w-full"
                size="sm"
                onClick={() => handleAddToCart(model)}
                disabled={addingToCart === model.id}
              >
                {addingToCart === model.id ? (
                  <>
                    <div className="w-4 h-4 mr-2 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    Dodawanie...
                  </>
                ) : (
                  <>
                    <ShoppingCart className="w-4 h-4 mr-2" />
                    Dodaj do koszyka
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};