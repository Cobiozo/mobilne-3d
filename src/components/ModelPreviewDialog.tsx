import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogAction } from '@/components/ui/alert-dialog';
import { ModelViewer } from '@/components/ModelViewer';
import { ControlPanel } from '@/components/ControlPanel';
import { Button } from '@/components/ui/button';
import { ShoppingCart, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useApp } from '@/contexts/AppContext';
import { getText } from '@/lib/i18n';
import { CartItem, ShoppingCartComponent } from '@/components/ShoppingCart';
import { captureCanvasFromThreeJS } from '@/utils/exportUtils';

interface Model {
  id: string;
  name: string;
  file_url: string;
  file_size: number | null;
  file_type: string | null;
  description: string | null;
  is_public: boolean;
  created_at: string;
}

interface ModelPreviewDialogProps {
  model: Model | null;
  isOpen: boolean;
  onClose: () => void;
}

export const ModelPreviewDialog = ({ model, isOpen, onClose }: ModelPreviewDialogProps) => {
  const [modelData, setModelData] = useState<ArrayBuffer | null>(null);
  const [modelColor, setModelColor] = useState("#FFFFFF");
  const [isLoading, setIsLoading] = useState(false);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [showAddedToCart, setShowAddedToCart] = useState(false);
  const { language } = useApp();

  // Load cart from localStorage on mount
  useEffect(() => {
    const savedCart = localStorage.getItem('cartItems');
    if (savedCart) {
      try {
        const items = JSON.parse(savedCart);
        setCartItems(items);
      } catch (error) {
        console.error('Error loading cart from localStorage:', error);
      }
    }
  }, []);

  // Save cart to localStorage whenever it changes
  useEffect(() => {
    if (cartItems.length > 0) {
      localStorage.setItem('cartItems', JSON.stringify(cartItems));
    }
    // Don't remove from localStorage when empty - only when explicitly cleared
  }, [cartItems]);

  useEffect(() => {
    if (model && isOpen) {
      loadModelData();
    }
  }, [model, isOpen]);

  const loadModelData = async () => {
    if (!model) return;
    
    setIsLoading(true);
    setModelData(null); // Reset previous model data
    
    try {
      console.log('Full model URL:', model.file_url);
      
      // Extract the file path from the full URL
      let filePath = '';
      
      if (model.file_url.includes('/storage/v1/object/public/models/')) {
        const urlParts = model.file_url.split('/storage/v1/object/public/models/');
        filePath = urlParts[1];
      } else if (model.file_url.includes('/models/')) {
        const urlParts = model.file_url.split('/models/');
        filePath = urlParts[1];
      } else {
        // Assume it's already a path
        filePath = model.file_url;
      }
      
      console.log('Extracted file path:', filePath);
      
      // Get the file from Supabase storage
      const { data, error } = await supabase.storage
        .from('models')
        .download(filePath);

      if (error) {
        console.error('Error downloading model:', error);
        toast.error(`Błąd pobierania modelu: ${error.message}`);
        return;
      }

      const arrayBuffer = await data.arrayBuffer();
      console.log('Model data loaded, size:', arrayBuffer.byteLength);
      setModelData(arrayBuffer);
    } catch (error) {
      console.error('Error loading model:', error);
      toast.error(`Błąd ładowania modelu: ${error instanceof Error ? error.message : 'Nieznany błąd'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddToCart = async () => {
    if (!model || !modelData) return;

    try {
      // Get dimensions from model
      const { getModelDimensions } = await import('@/utils/modelLoader');
      const dimensions = getModelDimensions(modelData);
      
      console.log('Adding to cart with dimensions:', dimensions);

      // Capture model thumbnail from canvas
      let thumbnailUrl: string | undefined;
      try {
        const canvas = document.querySelector('canvas') as HTMLCanvasElement;
        if (canvas) {
          // Create smaller thumbnail for better performance
          const thumbnailCanvas = document.createElement('canvas');
          const thumbnailWidth = 200;
          const thumbnailHeight = 200;
          thumbnailCanvas.width = thumbnailWidth;
          thumbnailCanvas.height = thumbnailHeight;
          
          const ctx = thumbnailCanvas.getContext('2d');
          if (ctx) {
            // White background
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, thumbnailWidth, thumbnailHeight);
            
            // Draw scaled down version of the canvas
            ctx.drawImage(canvas, 0, 0, thumbnailWidth, thumbnailHeight);
            
            // Convert to base64 with reduced quality
            thumbnailUrl = thumbnailCanvas.toDataURL('image/jpeg', 0.7);
            console.log('Generated thumbnail for cart, size:', Math.round(thumbnailUrl.length / 1024), 'KB');
          }
        }
      } catch (error) {
        console.warn('Could not capture model thumbnail:', error);
      }

      const cartItem: CartItem = {
        id: model.id,
        name: model.name,
        color: modelColor,
        quantity: 1,
        price: 39.99, // Base price - will be calculated in checkout based on actual dimensions
        dimensions: dimensions, // Add dimensions to cart item
        image: thumbnailUrl // Add thumbnail image
      };

      setCartItems(prev => {
        const existingIndex = prev.findIndex(item => 
          item.id === cartItem.id && item.color === cartItem.color
        );
        
        if (existingIndex >= 0) {
          const updated = [...prev];
          updated[existingIndex].quantity += 1;
          return updated;
        } else {
          return [...prev, cartItem];
        }
      });

      setShowAddedToCart(true);
    } catch (error) {
      console.error('Error adding to cart:', error);
      toast.error('Błąd podczas dodawania do koszyka');
    }
  };

  return (
    <>
      <AlertDialog open={showAddedToCart} onOpenChange={setShowAddedToCart}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>✓ Dodano do koszyka</AlertDialogTitle>
            <AlertDialogDescription>
              Produkt został dodany do koszyka. Co chcesz zrobić teraz?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <Button 
              onClick={() => {
                setShowAddedToCart(false);
              }}
              variant="outline"
              className="w-full sm:w-auto"
            >
              Kupuj dalej
            </Button>
            <Button 
              onClick={() => {
                setShowAddedToCart(false);
                onClose();
                // Open cart - trigger click on cart button
                setTimeout(() => {
                  const cartButton = document.querySelector('[data-cart-trigger]') as HTMLButtonElement;
                  if (cartButton) cartButton.click();
                }, 100);
              }}
              className="w-full sm:w-auto"
            >
              Idź do koszyka
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle>{model?.name}</DialogTitle>
          </DialogHeader>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[70vh]">
            {/* Model Viewer */}
            <div className="lg:col-span-2 h-full">
              {isLoading ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                    <p>Ładowanie...</p>
                  </div>
                </div>
              ) : modelData ? (
                <ModelViewer
                  modelData={modelData}
                  modelColor={modelColor}
                  fileName={model?.name}
                />
              ) : (
                <div className="flex items-center justify-center h-full">
                  <p className="text-muted-foreground">Nie udało się załadować modelu</p>
                </div>
              )}
            </div>

            {/* Control Panel */}
            <div className="h-full overflow-y-auto">
              <ControlPanel
                modelColor={modelColor}
                onColorChange={setModelColor}
                onExport={() => {}}
                fileName={model?.name}
                hideControls={true}
              />
              
              {modelData && (
                <div className="mt-4 pt-4 border-t">
                  <Button 
                    onClick={handleAddToCart}
                    className="w-full"
                    disabled={!modelData}
                  >
                    <ShoppingCart className="w-4 h-4 mr-2" />
                    Dodaj do koszyka
                  </Button>
                </div>
              )}

              {model?.description && (
                <div className="mt-4 pt-4 border-t">
                  <h4 className="font-semibold mb-2">Opis</h4>
                  <p className="text-sm text-muted-foreground">
                    {model.description}
                  </p>
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <ShoppingCartComponent 
        items={cartItems}
        onUpdateQuantity={(id, quantity) => {
          setCartItems(prev => 
            prev.map(item => 
              item.id === id ? { ...item, quantity } : item
            )
          );
        }}
        onRemoveItem={(id) => {
          setCartItems(prev => prev.filter(item => item.id !== id));
        }}
        onClearCart={() => setCartItems([])}
      />
    </>
  );
};