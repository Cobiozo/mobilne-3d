import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { ModelUpload } from '@/components/ModelUpload';
import { ModelPreviewDialog } from '@/components/ModelPreviewDialog';
import { ModelThumbnail } from '@/components/ModelThumbnail';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useApp } from '@/contexts/AppContext';
import { getText } from '@/lib/i18n';
import { Eye, Download, Trash2, Globe, Lock, Plus, Package, ShoppingCart } from 'lucide-react';
import { CartItem } from '@/components/ShoppingCart';
import { toast as sonnerToast } from 'sonner';

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

interface ModelLibraryProps {
  userId: string;
}

export const ModelLibrary = ({ userId }: ModelLibraryProps) => {
  const [models, setModels] = useState<Model[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const [selectedModel, setSelectedModel] = useState<Model | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [addingToCart, setAddingToCart] = useState<string | null>(null);
  const { toast } = useToast();
  const { language } = useApp();

  const fetchModels = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('models')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      toast({
        title: getText('error', language),
        description: error.message,
        variant: "destructive",
      });
    } else {
      setModels(data || []);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchModels();
  }, [userId, toast, language]);

  // Refresh models when tab becomes visible
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        fetchModels();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  const handleUploadComplete = () => {
    setShowUpload(false);
    fetchModels(); // Refresh the models list
  };

  const deleteModel = async (modelId: string) => {
    const { error } = await supabase
      .from('models')
      .delete()
      .eq('id', modelId);

    if (error) {
      toast({
        title: getText('error', language),
        description: error.message,
        variant: "destructive",
      });
    } else {
      setModels(models.filter(m => m.id !== modelId));
      toast({
        title: getText('success', language),
        description: getText('modelDeleted', language),
      });
    }
  };

  const togglePublic = async (modelId: string, isPublic: boolean) => {
    const { error } = await supabase
      .from('models')
      .update({ is_public: !isPublic })
      .eq('id', modelId);

    if (error) {
      toast({
        title: getText('error', language),
        description: error.message,
        variant: "destructive",
      });
    } else {
      setModels(models.map(m => 
        m.id === modelId ? { ...m, is_public: !isPublic } : m
      ));
      toast({
        title: getText('success', language),
        description: getText('modelVisibilityUpdated', language),
      });
    }
  };

  const handleAddToCart = async (model: Model) => {
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
      const thumbnailUrl = await generateThumbnailFromModel(arrayBuffer, '#000000');

      // Create cart item with default settings (black color)
      const newItem: CartItem = {
        id: model.id,
        name: model.name,
        color: '#000000', // Default black color
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

      // Check if item already exists
      const existingIndex = cartItems.findIndex(
        item => item.id === newItem.id && item.color === newItem.color
      );

      if (existingIndex >= 0) {
        // Increase quantity
        cartItems[existingIndex].quantity += 1;
        sonnerToast.success(`Zwiększono ilość "${newItem.name}" w koszyku`);
      } else {
        // Add new item
        cartItems.push(newItem);
        sonnerToast.success(`Dodano "${newItem.name}" do koszyka`);
      }

      // Save to localStorage
      localStorage.setItem('cartItems', JSON.stringify(cartItems));
      
      // Dispatch custom event to notify other components
      window.dispatchEvent(new CustomEvent('cartUpdated', { 
        detail: { cartItems } 
      }));
      
    } catch (error) {
      console.error('Error adding to cart:', error);
      sonnerToast.error('Nie udało się dodać modelu do koszyka');
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
    return <LoadingSpinner />;
  }

  if (showUpload) {
    return <ModelUpload onUploadComplete={handleUploadComplete} />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">{getText('myModels', language)}</h2>
          <p className="text-muted-foreground">
            {getText('manageUploaded3DModels', language)}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Badge variant="outline">
            {models.length} {getText('models', language)}
          </Badge>
          <Button type="button" onClick={() => setShowUpload(true)}>
            <Plus className="w-4 h-4 mr-2" />
            {getText('uploadModel', language)}
          </Button>
        </div>
      </div>

      {models.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <h3 className="text-lg font-semibold mb-2">
              {getText('noModelsYet', language)}
            </h3>
            <p className="text-muted-foreground text-center mb-4">
              {getText('uploadFirstModel', language)}
            </p>
            <Button type="button" onClick={() => setShowUpload(true)}>
              <Plus className="w-4 h-4 mr-2" />
              {getText('uploadModel', language)}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {models.map((model) => (
            <Card key={model.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg truncate">{model.name}</CardTitle>
                  <div className="flex items-center gap-1">
                    {model.is_public ? (
                      <Globe className="w-4 h-4 text-green-500" />
                    ) : (
                      <Lock className="w-4 h-4 text-gray-500" />
                    )}
                  </div>
                </div>
                <CardDescription>
                  {model.file_type} • {formatFileSize(model.file_size)}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {/* Model thumbnail preview */}
                <ModelThumbnail 
                  fileUrl={model.file_url}
                  className="w-full h-40 rounded-lg border overflow-hidden mb-4"
                />
                
                {model.description && (
                  <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                    {model.description}
                  </p>
                )}
                <div className="flex flex-wrap gap-2">
                  <Button 
                    type="button"
                    size="sm" 
                    variant="outline"
                    onClick={() => {
                      setSelectedModel(model);
                      setShowPreview(true);
                    }}
                  >
                    <Eye className="w-4 h-4 mr-1" />
                    {getText('view', language)}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="default"
                    onClick={() => handleAddToCart(model)}
                    disabled={addingToCart === model.id}
                  >
                    {addingToCart === model.id ? (
                      <>
                        <div className="w-4 h-4 mr-1 animate-spin rounded-full border-2 border-current border-t-transparent" />
                        Dodawanie...
                      </>
                    ) : (
                      <>
                        <ShoppingCart className="w-4 h-4 mr-1" />
                        Do koszyka
                      </>
                    )}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => togglePublic(model.id, model.is_public)}
                  >
                    {model.is_public ? (
                      <>
                        <Lock className="w-4 h-4 mr-1" />
                        {getText('makePrivate', language)}
                      </>
                    ) : (
                      <>
                        <Globe className="w-4 h-4 mr-1" />
                        {getText('makePublic', language)}
                      </>
                    )}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="destructive"
                    onClick={() => deleteModel(model.id)}
                  >
                    <Trash2 className="w-4 h-4 mr-1" />
                    {getText('delete', language)}
                  </Button>
                </div>
                <div className="mt-2 text-xs text-muted-foreground">
                  {getText('uploaded', language)}: {new Date(model.created_at).toLocaleDateString()}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      
      <ModelPreviewDialog
        model={selectedModel}
        isOpen={showPreview}
        onClose={() => {
          setShowPreview(false);
          setSelectedModel(null);
        }}
      />
    </div>
  );
};