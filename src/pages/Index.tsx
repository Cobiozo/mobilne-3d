import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileUpload } from "@/components/FileUpload";
import { ImageUpload } from "@/components/ImageUpload";
import { ModelViewer } from "@/components/ModelViewer";
import { ControlPanel } from "@/components/ControlPanel";
import { ProgressLoader } from "@/components/ProgressLoader";
import { ModelSelector } from "@/components/ModelSelector";
import { ShoppingCartComponent, CartItem } from "@/components/ShoppingCart";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter } from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { Box, Layers3, Image, ShoppingCart, MessageCircle, Package } from "lucide-react";
import { exportCanvasAs, captureCanvasFromThreeJS } from "@/utils/exportUtils";
import { render2DView } from "@/utils/export2D";
import { useApp } from "@/contexts/AppContext";
import { useTranslation } from "@/lib/i18n";
import { LanguageThemeSelector } from "@/components/LanguageThemeSelector";
import { ThemeSelector } from "@/components/ThemeSelector";
import { LanguageSelector } from "@/components/LanguageSelector";
import { useTheme } from "next-themes";
import { loadModelFile, Model3MFInfo } from "@/utils/modelLoader";
import { imageToGen3D, loadImageData } from "@/utils/imageToGeometry";
import { useImageToAI, AIAnalysis } from "@/hooks/useImageToAI";
import { AIAnalysisPreview } from "@/components/AIAnalysisPreview";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { User, LogIn, LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import * as THREE from 'three';

// Helper function to convert hex to HSL
const hexToHsl = (hex: string): string | null => {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h, s, l = (max + min) / 2;

  if (max === min) {
    h = s = 0;
  } else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
      default: h = 0;
    }
    h /= 6;
  }

  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
};


const Index = () => {
  const { language, siteSettings } = useApp();
  const { t } = useTranslation(language);
  const { theme, resolvedTheme } = useTheme();
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<"model3d" | "image2d">("model3d");
  const [modelData, setModelData] = useState<ArrayBuffer | null>(null);
  const [imageGeometry, setImageGeometry] = useState<THREE.BufferGeometry | null>(null);
  const [modelColor, setModelColor] = useState("#EF4444");
  const [fileName, setFileName] = useState<string>();
  const [availableModels, setAvailableModels] = useState<Model3MFInfo[]>([]);
  const [selectedModelIndex, setSelectedModelIndex] = useState(0);
  const [currentGeometry, setCurrentGeometry] = useState<THREE.BufferGeometry | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [showAddedToCart, setShowAddedToCart] = useState(false);
  const [availableColors, setAvailableColors] = useState<string[]>([]);
  const [currentAIAnalysis, setCurrentAIAnalysis] = useState<AIAnalysis | null>(null);
  
  // AI Analysis hook
  const { analyzeImageFile, isAnalyzing, analysis: aiAnalysis } = useImageToAI({
    onAnalysisComplete: (analysis) => {
      setCurrentAIAnalysis(analysis);
    }
  });

  // Load available colors from database
  useEffect(() => {
    const loadColors = async () => {
      const { data, error } = await supabase
        .from("available_colors")
        .select("color_hex")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });

      if (!error && data) {
        setAvailableColors(data.map(c => c.color_hex));
      }
    };

    loadColors();
  }, []);
  
  const isNonStandardColor = !availableColors.some(color => color.toLowerCase() === modelColor.toLowerCase());

  // Shopping cart state
  const [cartItems, setCartItems] = useState<CartItem[]>([]);

  // Debounce ref for cart DB saves
  const cartSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Load cart from localStorage on mount
  useEffect(() => {
    const loadCart = () => {
      const savedCart = localStorage.getItem('cartItems');
      if (savedCart) {
        try {
          const items = JSON.parse(savedCart);
          setCartItems(items);
        } catch {
          localStorage.removeItem('cartItems');
        }
      }
    };

    loadCart();

    // Listen for cart updates from other components
    const handleCartUpdate = (event: CustomEvent) => {
      if (event.detail?.cartItems) {
        setCartItems(event.detail.cartItems);
      } else {
        loadCart();
      }
    };

    window.addEventListener('cartUpdated', handleCartUpdate as EventListener);
    
    return () => {
      window.removeEventListener('cartUpdated', handleCartUpdate as EventListener);
    };
  }, []);

  // Save cart to localStorage and database whenever it changes (with debounce for DB)
  useEffect(() => {
    // Only save if we have items
    if (cartItems.length > 0) {
      localStorage.setItem('cartItems', JSON.stringify(cartItems));
      
      // Debounced save to database if user is logged in
      if (user) {
        if (cartSaveTimeoutRef.current) {
          clearTimeout(cartSaveTimeoutRef.current);
        }
        
        cartSaveTimeoutRef.current = setTimeout(() => {
          supabase
            .from('user_carts')
            .upsert([{
              user_id: user.id,
              cart_data: cartItems as any
            }])
            .then(() => {
              // Silent - no logging in production
            });
        }, 2000); // 2 second debounce for DB saves
      }
    }
    
    // Dispatch custom event to notify other components
    window.dispatchEvent(new CustomEvent('cartUpdated', { 
      detail: { cartItems } 
    }));
    
    return () => {
      if (cartSaveTimeoutRef.current) {
        clearTimeout(cartSaveTimeoutRef.current);
      }
    };
  }, [cartItems, user]);

  // Memoize HSL conversions
  const primaryHsl = useMemo(() => 
    siteSettings.primary_color ? hexToHsl(siteSettings.primary_color) : null,
    [siteSettings.primary_color]
  );

  const secondaryHsl = useMemo(() => 
    siteSettings.secondary_color ? hexToHsl(siteSettings.secondary_color) : null,
    [siteSettings.secondary_color]
  );

  // Apply site settings
  useEffect(() => {
    // Apply site settings to the page
    if (siteSettings.homepage_title) {
      document.title = siteSettings.homepage_title[language] || siteSettings.homepage_title.pl || '3D Model Viewer';
    }
    
    // Apply primary color if available
    if (primaryHsl) {
      document.documentElement.style.setProperty('--primary', primaryHsl);
    }
    
    // Apply secondary color if available
    if (secondaryHsl) {
      document.documentElement.style.setProperty('--secondary', secondaryHsl);
    }
  }, [resolvedTheme, siteSettings, language, primaryHsl, secondaryHsl]);

  const handleFileSelect = async (file: File) => {
    try {
      const arrayBuffer = await file.arrayBuffer();
      setModelData(arrayBuffer);
      setFileName(file.name);
      
      // Save model to database if user is logged in
      if (user) {
        try {
          await saveModelToDatabase(file, arrayBuffer);
        } catch {
          toast.error('Błąd podczas zapisywania modelu do bazy danych');
        }
      } else {
        toast.info('Zaloguj się, aby automatycznie zapisywać modele');
      }
      
      // Load models using the unified loader
      try {
        const models = await loadModelFile(arrayBuffer, file.name);
        setAvailableModels(models);
        setSelectedModelIndex(0);
        
        // Set current geometry for rendering
        if (models.length > 0 && models[0].geometry) {
          setCurrentGeometry(models[0].geometry);
        }
        
        if (models.length > 1) {
          toast.success(t('uploadSuccess', { fileName: file.name }) + ` (${models.length} ${t('modelsAvailable')})`);
        } else {
          toast.success(t('uploadSuccess', { fileName: file.name }));
        }
      } catch {
        setAvailableModels([]);
        setSelectedModelIndex(0);
        setCurrentGeometry(null);
        toast.error(t('uploadError'));
      }
    } catch {
      toast.error(t('uploadError'));
    }
  };

  const saveModelToDatabase = async (file: File, arrayBuffer: ArrayBuffer) => {
    try {
      // Check if model with the same name AND size already exists for this user
      const { data: existingModels, error: checkError } = await supabase
        .from('models')
        .select('name, file_size')
        .eq('user_id', user!.id)
        .eq('name', file.name)
        .eq('file_size', file.size);

      if (checkError) {
        throw checkError;
      }

      if (existingModels && existingModels.length > 0) {
        toast.info(`Model "${file.name}" już istnieje w Twoich modelach`);
        return;
      }

      // Create a unique filename
      const timestamp = Date.now();
      const fileExtension = file.name.split('.').pop();
      const uniqueFileName = `${timestamp}_${file.name}`;
      
      // Convert ArrayBuffer to File for upload
      const fileToUpload = new File([arrayBuffer], uniqueFileName, { type: file.type });
      
      // Upload to Supabase storage with timeout
      const uploadPath = `${user!.id}/${uniqueFileName}`;
      
      const uploadPromise = supabase.storage
        .from('models')
        .upload(uploadPath, fileToUpload);

      // Add timeout for upload
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Upload timeout after 30 seconds')), 30000)
      );

      const { data: uploadData, error: uploadError } = await Promise.race([
        uploadPromise,
        timeoutPromise
      ]) as any;

      if (uploadError) {
        toast.error(`Błąd przesyłania pliku: ${uploadError.message}`);
        return;
      }

      // Get the public URL
      const { data: { publicUrl } } = supabase.storage
        .from('models')
        .getPublicUrl(uploadData.path);

      // Save model metadata to database
      const modelData = {
        user_id: user!.id,
        name: file.name,
        description: `Wczytany model 3D: ${file.name}`,
        file_url: publicUrl,
        file_type: fileExtension || 'unknown',
        file_size: file.size,
        is_public: false
      };

      const { error: dbError } = await supabase
        .from('models')
        .insert(modelData)
        .select();

      if (dbError) {
        toast.error(`Błąd zapisywania do bazy danych: ${dbError.message}`);
      } else {
        toast.success(`Model "${file.name}" zapisany w "Moje modele 3D"`);
      }
    } catch (error) {
      toast.error(`Błąd zapisywania modelu: ${error instanceof Error ? error.message : 'Nieznany błąd'}`);
    }
  };

  const handleImageSelect = async (file: File) => {
    try {
      setIsGenerating(true);
      setGenerationProgress(0);
      setCurrentAIAnalysis(null);
      toast.info('🧠 Rozpoczynam analizę AI obrazu...');
      
      // First, run AI analysis
      setGenerationProgress(10);
      const aiResult = await analyzeImageFile(file, 'full');
      
      if (aiResult) {
        toast.success(`✨ AI rozpoznało: ${aiResult.objectName}`);
        setGenerationProgress(30);
      }
      
      // Simulate progress
      const progressInterval = setInterval(() => {
        setGenerationProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + Math.random() * 10;
        });
      }, 500);
      
      toast.info('🚀 Generowanie modelu 3D z AI...');
      setGenerationProgress(50);
      
      const imageData = await loadImageData(file);
      
      // Call edge function with AI analysis data
      const { data, error } = await supabase.functions.invoke('image-to-3d-gen3d', {
        body: {
          imageBase64: await fileToBase64(file),
          options: {
            topology: 'triangle',
            num_parts: 3,
            target_polycount: 30000
          },
          aiAnalysis: aiResult || undefined
        }
      });
      
      setGenerationProgress(80);
      
      if (error) throw new Error(error.message);
      
      if (data.success && data.result) {
        // Load geometry from result
        const result = await imageToGen3D(imageData, {
          topology: 'triangle',
          num_parts: 3
        });
        
        if (result.success && result.geometry) {
          setImageGeometry(result.geometry);
          setGenerationProgress(100);
          clearInterval(progressInterval);
          
          setTimeout(() => {
            setIsGenerating(false);
            setGenerationProgress(0);
          }, 500);
          
          const method = data.aiEnhanced ? 'AI-Enhanced Stable3DGen' : 'Stable3DGen';
          toast.success(`✅ Model wygenerowany z ${method}!`);
          setFileName(file.name);
          setModelData(null);
          setAvailableModels([]);
          setSelectedModelIndex(0);
        } else {
          throw new Error(result.error || 'Generation failed');
        }
      } else {
        throw new Error(data.error || 'Generation failed');
      }
      
    } catch (error) {
      console.error("Error generating 3D from image:", error);
      setIsGenerating(false);
      setGenerationProgress(0);
      toast.error('❌ Błąd generowania 3D: ' + (error instanceof Error ? error.message : 'Nieznany błąd'));
    }
  };
  
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  // Shopping cart functions
  const handleAddToCart = async () => {
    if (!fileName) {
      toast.error('Brak załadowanego modelu');
      return;
    }

    if (!modelData) {
      toast.error('Model nie został jeszcze wczytany');
      return;
    }

    try {
      // Get dimensions from current model
      const { getModelDimensions } = await import('@/utils/modelLoader');
      const dimensions = await getModelDimensions(modelData, fileName, selectedModelIndex);

      // Capture model thumbnail from canvas
      let thumbnailUrl: string | undefined;
      try {
        const canvas = document.querySelector('canvas') as HTMLCanvasElement;
        if (canvas) {
          const capturedCanvas = captureCanvasFromThreeJS(canvas);
          thumbnailUrl = capturedCanvas.toDataURL('image/png');
        }
      } catch {
        // Silent fail - thumbnail is optional
      }

      // Find model in database by name if user is logged in
      let modelId = `${Date.now()}-${Math.random()}`;
      if (availableModels.length > 1) {
        modelId = `${modelId}-model-${selectedModelIndex}`;
      }
      
      if (user) {
        const { data: models } = await supabase
          .from('models')
          .select('id')
          .eq('user_id', user.id)
          .eq('name', fileName)
          .limit(1);
        
        if (models && models.length > 0) {
          modelId = models[0].id;
          if (availableModels.length > 1) {
            modelId = `${modelId}-model-${selectedModelIndex}`;
          }
        }
      }

      // Create descriptive name for multi-model 3MF files
      let itemName = fileName;
      if (availableModels.length > 1) {
        itemName = `${fileName} - Model ${selectedModelIndex + 1}`;
      }

      const newItem: CartItem = {
        id: modelId,
        name: itemName,
        color: modelColor,
        quantity: 1,
        price: 39.99, // Base price - will be calculated in checkout based on dimensions
        dimensions: dimensions, // Add dimensions to cart item
        image: thumbnailUrl, // Add thumbnail image
        modelIndex: availableModels.length > 1 ? selectedModelIndex : undefined
      };

      setCartItems(prev => {
        // Check if item with same id and color already exists
        const existingIndex = prev.findIndex(
          item => item.id === newItem.id && item.color === newItem.color
        );

        if (existingIndex >= 0) {
          // Update quantity if item exists
          const updated = [...prev];
          updated[existingIndex].quantity += 1;
          setShowAddedToCart(true);
          return updated;
        } else {
          // Add new item
          setShowAddedToCart(true);
          return [...prev, newItem];
        }
      });
    } catch {
      toast.error('Błąd podczas dodawania do koszyka');
    }
  };

  const handleUpdateCartQuantity = (id: string, quantity: number) => {
    if (quantity <= 0) {
      handleRemoveFromCart(id);
      return;
    }

    setCartItems(prev =>
      prev.map(item =>
        item.id === id ? { ...item, quantity } : item
      )
    );
  };

  const handleRemoveFromCart = (id: string) => {
    setCartItems(prev => {
      const item = prev.find(item => item.id === id);
      if (item) {
        toast.success(`Usunięto "${item.name}" z koszyka`);
      }
      return prev.filter(item => item.id !== id);
    });
  };

  const handleClearCart = () => {
    setCartItems([]);
    localStorage.removeItem('cartItems');
    
    // Delete from database if user is logged in
    if (user) {
      supabase
        .from('user_carts')
        .delete()
        .eq('user_id', user.id)
        .then(() => {
          // Silent - no logging
        });
    }
    
    window.dispatchEvent(new CustomEvent('cartUpdated', { 
      detail: { cartItems: [] } 
    }));
    toast.success('Wyczyszczono koszyk');
  };

  const handleReset = () => {
    setModelData(null);
    setImageGeometry(null);
    setFileName(undefined);
    setAvailableModels([]);
    setSelectedModelIndex(0);
    setCurrentGeometry(null);
    // Reset color to default #EF4444
    setModelColor('#EF4444');
    toast.info(t('resetMessage'));
  };

  const handleModelSelect = (index: number) => {
    setSelectedModelIndex(index);
    if (availableModels[index] && availableModels[index].geometry) {
      setCurrentGeometry(availableModels[index].geometry);
    }
  };

  const handleExportSTL = async () => {
    try {
      if (!imageGeometry) {
        toast.error(t('exportNoModel'));
        return;
      }

      toast.info('Przygotowywanie eksportu STL...');
      
      // Create STL content from geometry
      const stlContent = generateSTLFromGeometry(imageGeometry);
      
      // Create blob and download
      const blob = new Blob([stlContent], { type: 'application/octet-stream' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${fileName ? fileName.replace(/\.[^/.]+$/, '') : 'model'}.stl`;
      link.click();
      
      URL.revokeObjectURL(url);
      toast.success('Model wyeksportowany jako STL pomyślnie!');
      
    } catch (error) {
      console.error('STL export failed:', error);
      toast.error(t('exportError'));
    }
  };

  const generateSTLFromGeometry = (geometry: THREE.BufferGeometry): string => {
    const positions = geometry.getAttribute('position') as THREE.BufferAttribute;
    const indices = geometry.index;
    
    let stl = 'solid model\n';
    
    if (indices) {
      // Indexed geometry
      for (let i = 0; i < indices.count; i += 3) {
        const a = indices.getX(i) * 3;
        const b = indices.getX(i + 1) * 3;
        const c = indices.getX(i + 2) * 3;
        
        const v1 = [positions.getX(a / 3), positions.getY(a / 3), positions.getZ(a / 3)];
        const v2 = [positions.getX(b / 3), positions.getY(b / 3), positions.getZ(b / 3)];
        const v3 = [positions.getX(c / 3), positions.getY(c / 3), positions.getZ(c / 3)];
        
        // Calculate normal
        const normal = calculateNormal(v1, v2, v3);
        
        stl += `  facet normal ${normal[0]} ${normal[1]} ${normal[2]}\n`;
        stl += '    outer loop\n';
        stl += `      vertex ${v1[0]} ${v1[1]} ${v1[2]}\n`;
        stl += `      vertex ${v2[0]} ${v2[1]} ${v2[2]}\n`;
        stl += `      vertex ${v3[0]} ${v3[1]} ${v3[2]}\n`;
        stl += '    endloop\n';
        stl += '  endfacet\n';
      }
    }
    
    stl += 'endsolid model\n';
    return stl;
  };

  const calculateNormal = (v1: number[], v2: number[], v3: number[]): number[] => {
    // Calculate two edges
    const edge1 = [v2[0] - v1[0], v2[1] - v1[1], v2[2] - v1[2]];
    const edge2 = [v3[0] - v1[0], v3[1] - v1[1], v3[2] - v1[2]];
    
    // Cross product
    const normal = [
      edge1[1] * edge2[2] - edge1[2] * edge2[1],
      edge1[2] * edge2[0] - edge1[0] * edge2[2],
      edge1[0] * edge2[1] - edge1[1] * edge2[0]
    ];
    
    // Normalize
    const length = Math.sqrt(normal[0] * normal[0] + normal[1] * normal[1] + normal[2] * normal[2]);
    if (length > 0) {
      normal[0] /= length;
      normal[1] /= length;
      normal[2] /= length;
    }
    
    return normal;
  };

  const handleExport = async (format: 'png' | 'jpg' | 'pdf', view: '2d-front' | '2d-top' | '2d-side') => {
    try {
      if (!modelData) {
        toast.error(t('exportNoModel'));
        return;
      }

      toast.info(`Przygotowywanie eksportu 2D (${view})...`);
      
      // Import dependencies
      const THREE = await import('three');
      const { STLLoader } = await import('three/examples/jsm/loaders/STLLoader.js');
      
      // Use the appropriate geometry
      let geometry: any;
      if (availableModels.length > 1 && availableModels[selectedModelIndex]?.geometry) {
        // For 3MF files with multiple models - use currently selected
        geometry = availableModels[selectedModelIndex].geometry.clone();
        console.log(`Eksportowanie modelu ${selectedModelIndex + 1} z ${availableModels.length} dostępnych`);
        toast.info(`Eksportowanie modelu ${selectedModelIndex + 1} z ${availableModels.length}`);
      } else {
        // For STL files or single models - parse normally
        const loader = new STLLoader();
        geometry = loader.parse(modelData!);
        
        // Center and scale geometry for STL
        geometry.computeBoundingBox();
        const center = new THREE.Vector3();
        geometry.boundingBox?.getCenter(center);
        geometry.translate(-center.x, -center.y, -center.z);
        
        const size = new THREE.Vector3();
        geometry.boundingBox?.getSize(size);
        const maxDimension = Math.max(size.x, size.y, size.z);
        const targetSize = 4;
        const scaleFactor = targetSize / maxDimension;
        const safeScale = Math.max(0.01, Math.min(100, scaleFactor));
        geometry.scale(safeScale, safeScale, safeScale);
        geometry.computeVertexNormals();
      }
      
      // Create material
      const material = new THREE.MeshStandardMaterial({
        color: new THREE.Color(modelColor),
        metalness: 0.3,
        roughness: 0.4,
        side: THREE.DoubleSide,
      });
      
      // Render 2D view
      const canvas2D = render2DView(geometry, material, view, modelColor);
      
      // Export with model-specific filename
      const viewName = view === '2d-front' ? 'przod' : view === '2d-top' ? 'gora' : 'bok';
      let baseFileName = fileName ? fileName.replace(/\.[^/.]+$/, '') : 'model-export';
      
      // Add model number for 3MF files
      if (availableModels.length > 1) {
        baseFileName += `-model-${selectedModelIndex + 1}`;
      }
      
      await exportCanvasAs(canvas2D, format, `${baseFileName}-${viewName}`);
      
    } catch (error) {
      console.error('Export failed:', error);
      toast.error(t('exportError'));
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
              onClick={() => setShowAddedToCart(false)}
              variant="outline"
              className="w-full sm:w-auto"
            >
              Kupuj dalej
            </Button>
            <Button 
              onClick={() => {
                setShowAddedToCart(false);
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

    <div className="min-h-screen bg-gradient-secondary">
      {/* Header */}
      <header className="border-b border-border/50 bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4">
          <div className="flex items-center justify-between gap-4">
            {/* Logo and Title */}
            <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
              <div className="p-1.5 sm:p-2 rounded-lg bg-gradient-primary">
                <Layers3 className="w-5 h-5 sm:w-6 sm:h-6 text-primary-foreground" />
              </div>
              <h1 className="text-lg sm:text-xl lg:text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                {siteSettings.homepage_title?.[language] || siteSettings.homepage_title?.pl || t('appTitle')}
              </h1>
            </div>
            
            {/* Right Side Actions */}
            <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
              {/* Shopping Cart */}
              <ShoppingCartComponent
                items={cartItems}
                onUpdateQuantity={handleUpdateCartQuantity}
                onRemoveItem={handleRemoveFromCart}
                onClearCart={handleClearCart}
              />
              
              {/* Public Models Link */}
              {(user || siteSettings.public_model_viewing !== false) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate('/models')}
                  className="gap-1 sm:gap-2 px-2 sm:px-3"
                >
                  <Package className="w-4 h-4" />
                  <span className="hidden sm:inline">Modele</span>
                </Button>
              )}
              
              {/* Terms Link */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/regulamin')}
                className="gap-1 sm:gap-2 px-2 sm:px-3 hidden md:flex"
              >
                <span>Regulamin</span>
              </Button>
              
              {/* Authentication */}
              {!loading && user ? (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate('/dashboard')}
                    className="gap-1 sm:gap-2 px-2 sm:px-3"
                  >
                    <User className="w-4 h-4" />
                    <span className="hidden sm:inline">Dashboard</span>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={async () => {
                      await signOut();
                      toast.success('Wylogowano pomyślnie');
                    }}
                    className="gap-1 sm:gap-2 px-2 sm:px-3"
                  >
                    <LogOut className="w-4 h-4" />
                    <span className="hidden sm:inline">Wyloguj</span>
                  </Button>
                </>
              ) : !loading && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate('/auth')}
                  className="gap-1 sm:gap-2 px-2 sm:px-3"
                >
                  <LogIn className="w-4 h-4" />
                  <span className="hidden sm:inline">{t('signIn')}</span>
                </Button>
              )}
              
              {/* Theme/Language selectors - Mobile: Separate buttons */}
              <div className="flex gap-1 lg:hidden">
                <LanguageSelector />
                <ThemeSelector />
              </div>
              
              {/* Theme/Language selectors - Desktop: Combined selector */}
              <div className="hidden lg:block">
                <LanguageThemeSelector />
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-4 sm:gap-6 min-h-[calc(100vh-120px)] sm:min-h-[calc(100vh-140px)]">
          {/* Control Panel - Full width on mobile, sidebar on desktop */}
          <div className="xl:col-span-1 order-2 xl:order-1">
            <div className="space-y-4">
              {/* Action Buttons - Show when model is loaded */}
              {(modelData || imageGeometry) && (
                <div className="flex flex-col gap-3">
                  {isNonStandardColor ? (
                    <Button 
                      variant="outline"
                      onClick={() => toast.info('Funkcja zapytania o dostępność będzie wkrótce dostępna')}
                      className="flex items-center gap-2 w-full"
                      size="lg"
                    >
                      <MessageCircle className="w-5 h-5" />
                      Zapytaj o dostępność
                    </Button>
                  ) : (
                    <Button 
                      onClick={handleAddToCart}
                      className="flex items-center gap-2 w-full"
                      size="lg"
                    >
                      <ShoppingCart className="w-5 h-5" />
                      Dodaj do koszyka
                    </Button>
                  )}
                </div>
              )}
              
              <ControlPanel
                modelColor={modelColor}
                onColorChange={setModelColor}
                fileName={fileName}
                onReset={handleReset}
                onExport={handleExport}
                onExportSTL={handleExportSTL}
                availableModels={availableModels.map(model => ({
                  name: model.name,
                  index: model.index,
                  meshCount: model.meshCount
                }))}
                selectedModelIndex={selectedModelIndex}
                onModelSelect={handleModelSelect}
                isImageGenerated={!!imageGeometry}
              />
              
              {!modelData && !imageGeometry && (
                <div className="block xl:hidden">
                  <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "model3d" | "image2d")} className="w-full">
                    <TabsList className="grid w-full grid-cols-1">
                      <TabsTrigger value="model3d" className="flex items-center gap-2">
                        <Layers3 className="w-4 h-4" />
                        {t('tabModel3D')}
                      </TabsTrigger>
                    </TabsList>
                    <TabsContent value="model3d" className="mt-4">
                      <FileUpload onFileSelect={handleFileSelect} />
                    </TabsContent>
                  </Tabs>
                </div>
              )}
            </div>
          </div>

          {/* 3D Viewer - Full width on mobile, main area on desktop */}
          <div className="xl:col-span-3 order-1 xl:order-2 min-h-[300px] sm:min-h-[400px] lg:min-h-[500px]">
            {isGenerating ? (
              <div className="h-full flex items-center justify-center bg-card rounded-lg border">
                <ProgressLoader 
                  progress={generationProgress}
                  title="Generowanie modelu 3D"
                  description="Używam algorytmu Stable3DGen do utworzenia wysokiej jakości modelu..."
                />
              </div>
            ) : (
              <ModelViewer
                modelData={modelData || undefined}
                modelColor={modelColor}
                fileName={fileName}
                currentGeometry={currentGeometry || imageGeometry}
              />
            )}
          </div>
        </div>


        {/* Upload Area when model is loaded - Mobile only */}
        {(modelData || imageGeometry) && (
          <div className="mt-4 sm:mt-6 xl:hidden">
            <div className="text-center">
              <div className="max-w-md mx-auto">
                <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "model3d" | "image2d")} className="w-full">
                  <TabsList className="grid w-full grid-cols-1">
                    <TabsTrigger value="model3d" className="flex items-center gap-2">
                      <Layers3 className="w-4 h-4" />
                      {t('tabModel3D')}
                    </TabsTrigger>
                  </TabsList>
                  <TabsContent value="model3d" className="mt-4">
                    <FileUpload onFileSelect={handleFileSelect} />
                  </TabsContent>
                </Tabs>
              </div>
            </div>
          </div>
        )}

        {/* Desktop file upload when no model loaded */}
        {!modelData && !imageGeometry && (
          <div className="hidden xl:block mt-6">
            <div className="text-center">
              <div className="max-w-md mx-auto">
                <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "model3d" | "image2d")} className="w-full">
                  <TabsList className="grid w-full grid-cols-1">
                    <TabsTrigger value="model3d" className="flex items-center gap-2">
                      <Layers3 className="w-4 h-4" />
                      {t('tabModel3D')}
                    </TabsTrigger>
                  </TabsList>
                  <TabsContent value="model3d" className="mt-4">
                    <FileUpload onFileSelect={handleFileSelect} />
                  </TabsContent>
                </Tabs>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
    </>
  );
};

export default Index;