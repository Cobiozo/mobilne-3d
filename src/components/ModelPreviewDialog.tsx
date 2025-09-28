import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ModelViewer } from '@/components/ModelViewer';
import { ControlPanel } from '@/components/ControlPanel';
import { Button } from '@/components/ui/button';
import { ShoppingCart, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useApp } from '@/contexts/AppContext';
import { getText } from '@/lib/i18n';
import { CartItem, ShoppingCartComponent } from '@/components/ShoppingCart';

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
  const { language } = useApp();

  useEffect(() => {
    if (model && isOpen) {
      loadModelData();
    }
  }, [model, isOpen]);

  const loadModelData = async () => {
    if (!model) return;
    
    setIsLoading(true);
    try {
      // Get the file from Supabase storage
      const { data, error } = await supabase.storage
        .from('models')
        .download(model.file_url);

      if (error) {
        console.error('Error downloading model:', error);
        toast.error('Błąd pobierania modelu');
        return;
      }

      const arrayBuffer = await data.arrayBuffer();
      setModelData(arrayBuffer);
    } catch (error) {
      console.error('Error loading model:', error);
      toast.error('Błąd ładowania modelu');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddToCart = () => {
    if (!model || !modelData) return;

    const cartItem: CartItem = {
      id: model.id,
      name: model.name,
      color: modelColor,
      quantity: 1,
      price: 29.99 // Default price - you can make this configurable
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

    toast.success('Dodano do koszyka');
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>{model?.name}</span>
              <Button variant="ghost" size="sm" onClick={onClose}>
                <X className="w-4 h-4" />
              </Button>
            </DialogTitle>
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
              ) : (
                <ModelViewer
                  modelData={modelData}
                  modelColor={modelColor}
                  fileName={model?.name}
                />
              )}
            </div>

            {/* Control Panel */}
            <div className="h-full overflow-y-auto">
              <ControlPanel
                modelColor={modelColor}
                onColorChange={setModelColor}
                onExport={() => {}}
                fileName={model?.name}
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