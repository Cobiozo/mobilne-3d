import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ModelThumbnail } from '@/components/ModelThumbnail';
import { ModelViewer } from '@/components/ModelViewer';
import { ControlPanel } from '@/components/ControlPanel';
import { supabase } from '@/integrations/supabase/client';
import { ShoppingCart, Palette, Package, Coins, Star } from 'lucide-react';
import { toast } from 'sonner';
import { CartItem } from '@/components/ShoppingCart';
import { ModelRating } from '@/components/ModelRating';
import { useApp } from '@/contexts/AppContext';
import { getText } from '@/lib/i18n';
import { loadModelFile, Model3MFInfo } from '@/utils/modelLoader';
import * as THREE from 'three';

interface PublicModel {
  id: string;
  name: string;
  description: string | null;
  file_url: string;
  file_size: number | null;
  price: number;
  created_at: string;
  user_id: string;
  profiles: {
    display_name: string | null;
  } | null;
}

export const PublicModels = () => {
  const { language } = useApp();
  const [models, setModels] = useState<PublicModel[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedColors, setSelectedColors] = useState<{ [key: string]: string }>({});
  const [availableColors, setAvailableColors] = useState<Array<{ color_hex: string; color_name: string }>>([]);
  const [addingToCart, setAddingToCart] = useState<string | null>(null);
  const [previewModel, setPreviewModel] = useState<PublicModel | null>(null);
  const [previewModelData, setPreviewModelData] = useState<ArrayBuffer | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | undefined>(undefined);
  const [previewAvailableModels, setPreviewAvailableModels] = useState<Model3MFInfo[]>([]);
  const [previewSelectedModelIndex, setPreviewSelectedModelIndex] = useState(0);
  const [previewCurrentGeometry, setPreviewCurrentGeometry] = useState<THREE.BufferGeometry | null>(null);

  useEffect(() => {
    fetchPublicModels();
    loadAvailableColors();
    loadCurrentUser();
  }, []);

  const loadCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setCurrentUserId(user?.id);
  };

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
        .select('id, name, description, file_url, file_size, price, created_at, user_id')
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
      
      // Initialize default colors to #EF4444
      const defaultColors: { [key: string]: string } = {};
      combinedData?.forEach(model => {
        defaultColors[model.id] = '#EF4444';
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

  const handleOpenPreview = async (model: PublicModel) => {
    setPreviewModel(model);
    setIsLoadingPreview(true);
    setPreviewModelData(null);
    setPreviewAvailableModels([]);
    setPreviewSelectedModelIndex(0);
    setPreviewCurrentGeometry(null);
    
    try {
      // Extract file path from URL
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
      setPreviewModelData(arrayBuffer);
      
      // Load models for 3MF support
      try {
        const models = await loadModelFile(arrayBuffer, model.name);
        setPreviewAvailableModels(models);
        setPreviewSelectedModelIndex(0);
        if (models.length > 0 && models[0].geometry) {
          setPreviewCurrentGeometry(models[0].geometry);
        }
      } catch (error) {
        console.error('Error loading models:', error);
        setPreviewAvailableModels([]);
        setPreviewCurrentGeometry(null);
      }
    } catch (error) {
      console.error('Error loading preview:', error);
      toast.error('Nie udało się załadować podglądu modelu');
      setPreviewModel(null);
    } finally {
      setIsLoadingPreview(false);
    }
  };

  const handleClosePreview = () => {
    setPreviewModel(null);
    setPreviewModelData(null);
    setPreviewAvailableModels([]);
    setPreviewSelectedModelIndex(0);
    setPreviewCurrentGeometry(null);
  };

  const handlePreviewModelSelect = (index: number) => {
    setPreviewSelectedModelIndex(index);
    if (previewAvailableModels[index] && previewAvailableModels[index].geometry) {
      setPreviewCurrentGeometry(previewAvailableModels[index].geometry);
    }
  };

  const handleAddToCart = async (model: PublicModel) => {
    setAddingToCart(model.id);
    
    try {
      // Check if user is logged in
      const { data: { user } } = await supabase.auth.getUser();
      
      // If model has price and user is logged in, process purchase
      if (model.price > 0 && user) {
        // Check if user owns this model
        if (model.user_id === user.id) {
          toast.error('Nie możesz kupić własnego modelu!');
          return;
        }

        // Process purchase
        const { data: purchaseData, error: purchaseError } = await supabase
          .rpc('process_model_purchase', {
            p_model_id: model.id,
            p_buyer_id: user.id,
            p_price: model.price
          });

        if (purchaseError) {
          if (purchaseError.message.includes('Insufficient balance')) {
            toast.error('Niewystarczające środki w portfelu');
          } else {
            toast.error('Błąd podczas zakupu: ' + purchaseError.message);
          }
          return;
        }

        toast.success(`Zakupiono model "${model.name}" za ${model.price} monet!`);
        return;
      }

      // If no price or not logged in, add to physical cart
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
      
      // Get dimensions (with 3MF support)
      const { getModelDimensions } = await import('@/utils/modelLoader');
      const fileName = model.file_url.split('/').pop() || model.name;
      const dimensions = await getModelDimensions(arrayBuffer, fileName, previewSelectedModelIndex || 0);

      // Generate thumbnail
      const { generateThumbnailFromModel } = await import('@/utils/thumbnailGenerator');
      const selectedColor = selectedColors[model.id] || '#EF4444';
      const thumbnailUrl = await generateThumbnailFromModel(arrayBuffer, selectedColor);

      // Create cart item
      // Create unique cart item ID from model ID and color
      const cartItemId = `${model.id}-${selectedColor}`;
      
      const newItem: CartItem = {
        id: cartItemId,
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

      // Check if item already exists (by unique cart item ID)
      const existingIndex = cartItems.findIndex(
        item => item.id === cartItemId
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
      toast.error('Nie udało się dodać modelu do koszyka: ' + (error instanceof Error ? error.message : 'Nieznany błąd'));
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
    <>
      {/* Preview Dialog */}
      <Dialog open={!!previewModel} onOpenChange={(open) => !open && handleClosePreview()}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle>{previewModel?.name}</DialogTitle>
          </DialogHeader>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[70vh]">
            {/* Model Viewer */}
            <div className="lg:col-span-2 h-full">
              {isLoadingPreview ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                    <p>{getText('loading', language)}</p>
                  </div>
                </div>
              ) : (
                <ModelViewer
                  modelData={previewModelData}
                  modelColor={previewModel ? selectedColors[previewModel.id] || '#EF4444' : '#EF4444'}
                  fileName={previewModel?.name}
                  currentGeometry={previewCurrentGeometry}
                />
              )}
            </div>

            {/* Control Panel */}
            <div className="h-full overflow-y-auto">
              <ControlPanel
                modelColor={previewModel ? selectedColors[previewModel.id] || '#EF4444' : '#EF4444'}
                onColorChange={(color) => previewModel && handleColorChange(previewModel.id, color)}
                fileName={previewModel?.name}
                hideControls={true}
                availableModels={previewAvailableModels.map(model => ({
                  name: model.name,
                  index: model.index,
                  meshCount: model.meshCount
                }))}
                selectedModelIndex={previewSelectedModelIndex}
                onModelSelect={handlePreviewModelSelect}
              />
              
              {previewModelData && previewModel && (
                <div className="mt-4 pt-4 border-t">
                  <Button 
                    onClick={() => {
                      handleAddToCart(previewModel);
                      handleClosePreview();
                    }}
                    className="w-full"
                    disabled={addingToCart === previewModel.id}
                  >
                    {addingToCart === previewModel.id ? (
                      <>
                        <div className="w-4 h-4 mr-2 animate-spin rounded-full border-2 border-current border-t-transparent" />
                        {getText('adding', language)}
                      </>
                    ) : (
                      <>
                        <ShoppingCart className="w-4 h-4 mr-2" />
                        {getText('addToCart', language)}
                      </>
                    )}
                  </Button>
                </div>
              )}

              {previewModel?.description && (
                <div className="mt-4 pt-4 border-t">
                  <h4 className="font-semibold mb-2">{getText('description', language)}</h4>
                  <p className="text-sm text-muted-foreground">
                    {previewModel.description}
                  </p>
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Models Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {models.map((model) => (
          <Card key={model.id} className="overflow-hidden hover:shadow-lg transition-shadow">
            <CardHeader className="p-0 relative cursor-pointer" onClick={() => handleOpenPreview(model)}>
              <ModelThumbnail 
                fileUrl={model.file_url}
                color={selectedColors[model.id] || '#EF4444'}
                className="w-full h-64"
              />
              <div className="absolute top-2 right-2 bg-black/50 text-white px-2 py-1 rounded text-xs">
                {getText('clickToView', language)}
              </div>
            </CardHeader>
            <CardContent className="p-4">
              <div className="space-y-3">
                <div>
                  <CardTitle className="text-lg line-clamp-1">{model.name}</CardTitle>
                  {model.description && (
                    <CardDescription className="text-sm mt-1 line-clamp-2">
                      {model.description}
                    </CardDescription>
                  )}
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    <Badge variant="outline" className="text-xs">
                      {formatFileSize(model.file_size)}
                    </Badge>
                    {model.price > 0 && (
                      <Badge variant="secondary" className="text-xs">
                        <Coins className="w-3 h-3 mr-1" />
                        {model.price} monet
                      </Badge>
                    )}
                    {model.profiles?.display_name && (
                      <span className="text-xs text-muted-foreground">
                        Dodany przez: {model.profiles.display_name}
                      </span>
                    )}
                  </div>
                </div>

                {/* Rating component */}
                <div className="border-t pt-3">
                  <ModelRating 
                    modelId={model.id}
                    modelOwnerId={model.user_id}
                    currentUserId={currentUserId}
                    compact={true}
                  />
                </div>

                {/* Color selector */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Palette className="w-4 h-4 text-muted-foreground" />
                    <span className="text-xs font-medium">Wybierz kolor</span>
                  </div>
                  <div className="grid grid-cols-6 sm:grid-cols-8 gap-1.5">
                    {availableColors.map((color) => (
                      <button
                        key={color.color_hex}
                        onClick={() => handleColorChange(model.id, color.color_hex)}
                        className={`w-6 h-6 rounded border-2 transition-all hover:scale-110 ${
                          (selectedColors[model.id] || '#000000').toLowerCase() === color.color_hex.toLowerCase() 
                            ? 'border-primary shadow-glow' 
                            : 'border-border hover:border-primary/50'
                        }`}
                        style={{ backgroundColor: color.color_hex }}
                        title={color.color_name}
                      />
                    ))}
                  </div>
                </div>

                {/* Add to cart / Buy button */}
                <Button
                  className="w-full"
                  size="sm"
                  onClick={() => handleAddToCart(model)}
                  disabled={addingToCart === model.id}
                >
                  {addingToCart === model.id ? (
                    <>
                      <div className="w-4 h-4 mr-2 animate-spin rounded-full border-2 border-current border-t-transparent" />
                      {model.price > 0 ? 'Kupowanie...' : 'Dodawanie...'}
                    </>
                  ) : model.price > 0 ? (
                    <>
                      <Coins className="w-4 h-4 mr-2" />
                      Kup za {model.price} monet
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
    </>
  );
};