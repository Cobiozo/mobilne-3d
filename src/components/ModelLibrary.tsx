import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { ModelUpload } from '@/components/ModelUpload';
import { ModelPreviewDialog } from '@/components/ModelPreviewDialog';
import { ModelThumbnail } from '@/components/ModelThumbnail';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useApp } from '@/contexts/AppContext';
import { getText } from '@/lib/i18n';
import { Eye, Download, Trash2, Globe, Lock, Plus, Package, ShoppingCart, Edit, Check, X, Coins, Star, Palette } from 'lucide-react';
import { ModelRating } from '@/components/ModelRating';
import { CartItem } from '@/components/ShoppingCart';
import { toast as sonnerToast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';

interface Model {
  id: string;
  name: string;
  file_url: string;
  file_size: number | null;
  file_type: string | null;
  description: string | null;
  is_public: boolean;
  price: number;
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
  const [editingModel, setEditingModel] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [selectedColors, setSelectedColors] = useState<{ [key: string]: string }>({});
  const [availableColors, setAvailableColors] = useState<Array<{ color_hex: string; color_name: string }>>([]);
  const { toast } = useToast();
  const { language } = useApp();

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
      // Initialize default colors (black)
      const defaultColors: { [key: string]: string } = {};
      data?.forEach(model => {
        defaultColors[model.id] = '#000000';
      });
      setSelectedColors(defaultColors);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchModels();
    loadAvailableColors();
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

  const openEditDialog = (model: Model) => {
    setEditingModel(model.id);
    setEditName(model.name);
    setShowEditDialog(true);
  };

  const saveModelEdit = async () => {
    if (!editingModel) return;
    
    const { error } = await supabase
      .from('models')
      .update({ 
        name: editName.trim()
      })
      .eq('id', editingModel);

    if (error) {
      sonnerToast.error('Nie udało się zaktualizować modelu');
    } else {
      setModels(models.map(m => 
        m.id === editingModel ? { ...m, name: editName.trim() } : m
      ));
      sonnerToast.success('Model zaktualizowany pomyślnie');
      setShowEditDialog(false);
      setEditingModel(null);
    }
  };

  const handleColorChange = (modelId: string, color: string) => {
    setSelectedColors(prev => ({
      ...prev,
      [modelId]: color
    }));
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

      // Generate thumbnail with selected color
      const { generateThumbnailFromModel } = await import('@/utils/thumbnailGenerator');
      const selectedColor = selectedColors[model.id] || '#000000';
      const thumbnailUrl = await generateThumbnailFromModel(arrayBuffer, selectedColor);

      // Create cart item with selected color
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
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
          {models.map((model) => (
            <Card key={model.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-lg truncate">{model.name}</CardTitle>
                    {model.price > 0 && (
                      <Badge variant="secondary" className="mt-1">
                        <Coins className="w-3 h-3 mr-1" />
                        {model.price} monet
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEditDialog(model)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
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
                  color={selectedColors[model.id] || '#000000'}
                  className="w-full h-48 rounded-lg border overflow-hidden mb-4"
                />
                

                {/* Color selector */}
                <div className="space-y-2 mb-4">
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

      {/* Edit Model Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edytuj nazwę modelu</DialogTitle>
            <DialogDescription>
              Zmień nazwę swojego modelu
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="model-name">Nazwa modelu</Label>
              <Input
                id="model-name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="Nazwa modelu"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Anuluj
            </Button>
            <Button onClick={saveModelEdit}>
              <Check className="w-4 h-4 mr-1" />
              Zapisz
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};