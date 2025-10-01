import { useState, useEffect } from "react";
import { FileUpload } from "@/components/FileUpload";
import { ImageUpload } from "@/components/ImageUpload";
import { ModelViewer } from "@/components/ModelViewer";
import { ControlPanel } from "@/components/ControlPanel";
import { ProgressLoader } from "@/components/ProgressLoader";
import { ModelSelector } from "@/components/ModelSelector";
import { ShoppingCartComponent, CartItem } from "@/components/ShoppingCart";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Box, Layers3, Image, ShoppingCart, MessageCircle } from "lucide-react";
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
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { User, LogIn } from "lucide-react";
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
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<"model3d" | "image2d">("model3d");
  const [modelData, setModelData] = useState<ArrayBuffer | null>(null);
  const [imageGeometry, setImageGeometry] = useState<THREE.BufferGeometry | null>(null);
  const [modelColor, setModelColor] = useState("#FFFFFF");
  const [fileName, setFileName] = useState<string>();
  const [availableModels, setAvailableModels] = useState<Model3MFInfo[]>([]);
  const [selectedModelIndex, setSelectedModelIndex] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);

  // Standard colors for comparison
  const standardColors = ['#FFFFFF', '#000000', '#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF', '#00FFFF'];
  
  const isNonStandardColor = !standardColors.includes(modelColor.toUpperCase());

  // Shopping cart state
  const [cartItems, setCartItems] = useState<CartItem[]>([]);

  // Load cart from localStorage on mount
  useEffect(() => {
    const savedCart = localStorage.getItem('cartItems');
    if (savedCart) {
      try {
        const items = JSON.parse(savedCart);
        setCartItems(items);
        console.log('Loaded cart from localStorage:', items);
      } catch (error) {
        console.error('Error loading cart from localStorage:', error);
        localStorage.removeItem('cartItems');
      }
    }
  }, []);

  // Save cart to localStorage whenever it changes
  useEffect(() => {
    if (cartItems.length > 0) {
      localStorage.setItem('cartItems', JSON.stringify(cartItems));
      console.log('Saved cart to localStorage:', cartItems);
    } else {
      localStorage.removeItem('cartItems');
    }
  }, [cartItems]);

  // Auto-adjust color based on theme and apply site settings
  useEffect(() => {
    if (resolvedTheme === 'light') {
      setModelColor('#000000'); // Black for light theme
    } else {
      setModelColor('#FFFFFF'); // White for dark theme
    }

    // Apply site settings to the page
    if (siteSettings.homepage_title) {
      document.title = siteSettings.homepage_title[language] || siteSettings.homepage_title.pl || '3D Model Viewer';
    }
    
    // Apply primary color if available
    if (siteSettings.primary_color) {
      const primaryHsl = hexToHsl(siteSettings.primary_color);
      if (primaryHsl) {
        document.documentElement.style.setProperty('--primary', primaryHsl);
      }
    }
    
    // Apply secondary color if available
    if (siteSettings.secondary_color) {
      const secondaryHsl = hexToHsl(siteSettings.secondary_color);
      if (secondaryHsl) {
        document.documentElement.style.setProperty('--secondary', secondaryHsl);
      }
    }
  }, [resolvedTheme, siteSettings, language]);

  const handleFileSelect = async (file: File) => {
    try {
      console.log('handleFileSelect called with file:', file.name, 'User logged in:', !!user);
      
      const arrayBuffer = await file.arrayBuffer();
      setModelData(arrayBuffer);
      setFileName(file.name);
      
      // Save model to database if user is logged in
      if (user) {
        console.log('User is logged in, calling saveModelToDatabase');
        try {
          await saveModelToDatabase(file, arrayBuffer);
        } catch (error) {
          console.error('Error in saveModelToDatabase:', error);
          toast.error('Błąd podczas zapisywania modelu do bazy danych');
        }
      } else {
        console.log('User not logged in, skipping saveModelToDatabase');
        toast.info('Zaloguj się, aby automatycznie zapisywać modele');
      }
      
      // Load models using the unified loader
      try {
        const models = await loadModelFile(arrayBuffer, file.name);
        console.log('Loaded models:', models, 'Count:', models.length);
        setAvailableModels(models);
        setSelectedModelIndex(0);
        
        if (models.length > 1) {
          toast.success(t('uploadSuccess', { fileName: file.name }) + ` (${models.length} ${t('modelsAvailable')})`);
        } else {
          toast.success(t('uploadSuccess', { fileName: file.name }));
        }
      } catch (error) {
        console.error('Model loading failed:', error);
        setAvailableModels([]);
        setSelectedModelIndex(0);
        toast.error(t('uploadError'));
      }
    } catch (error) {
      console.error("Error loading file:", error);
      toast.error(t('uploadError'));
    }
  };

  const saveModelToDatabase = async (file: File, arrayBuffer: ArrayBuffer) => {
    try {
      console.log('Rozpoczynam zapisywanie modelu:', file.name, 'Użytkownik:', user?.id);
      
      // Check if model with the same name already exists for this user
      const { data: existingModels, error: checkError } = await supabase
        .from('models')
        .select('name')
        .eq('user_id', user!.id)
        .eq('name', file.name);

      if (checkError) {
        console.error('Error checking for existing models:', checkError);
        throw checkError;
      }

      if (existingModels && existingModels.length > 0) {
        console.log('Model o tej nazwie już istnieje:', file.name);
        toast.info(`Model "${file.name}" już istnieje w Twoich modelach`);
        return;
      }

      // Create a unique filename
      const timestamp = Date.now();
      const fileExtension = file.name.split('.').pop();
      const uniqueFileName = `${timestamp}_${file.name}`;
      
      console.log('Tworzę unikalną nazwę pliku:', uniqueFileName);
      
      // Convert ArrayBuffer to File for upload
      const fileToUpload = new File([arrayBuffer], uniqueFileName, { type: file.type });
      
      console.log('Uploading to storage...');
      // Upload to Supabase storage with timeout
      const uploadPath = `${user!.id}/${uniqueFileName}`;  // Zmieniony format ścieżki
      console.log('Upload path:', uploadPath);
      
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
        console.error('Upload error:', uploadError);
        toast.error(`Błąd przesyłania pliku: ${uploadError.message}`);
        return;
      }

      console.log('Upload successful:', uploadData);

      // Get the public URL
      const { data: { publicUrl } } = supabase.storage
        .from('models')
        .getPublicUrl(uploadData.path);

      console.log('Public URL:', publicUrl);

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

      console.log('Inserting model data:', modelData);

      const { data: insertData, error: dbError } = await supabase
        .from('models')
        .insert(modelData)
        .select();

      if (dbError) {
        console.error('Database error:', dbError);
        toast.error(`Błąd zapisywania do bazy danych: ${dbError.message}`);
      } else {
        console.log('Model saved successfully:', insertData);
        toast.success(`Model "${file.name}" zapisany w "Moje modele 3D"`);
      }
    } catch (error) {
      console.error('Error saving model:', error);
      toast.error(`Błąd zapisywania modelu: ${error instanceof Error ? error.message : 'Nieznany błąd'}`);
    }
  };

  const handleImageSelect = async (file: File) => {
    try {
      setIsGenerating(true);
      setGenerationProgress(0);
      toast.info('🔄 Rozpoczynam generowanie z PartCrafter...');
      
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
      
      setGenerationProgress(10);
      const imageData = await loadImageData(file);
      setGenerationProgress(30);
      
      // Use PartCrafter for structured 3D mesh generation
      toast.info('🚀 Przetwarzanie z PartCrafter: Structured 3D Mesh Generation...');
      setGenerationProgress(50);
      
      // Generate 3D model using PartCrafter
      const result = await imageToGen3D(imageData, {
        topology: 'triangle',
        num_parts: 3,
        target_polycount: 30000,
        should_remesh: true,
        should_texture: true,
        enable_pbr: true
      });
      
      setGenerationProgress(80);
      
      if (result.success && result.geometry) {
        setImageGeometry(result.geometry);
        setGenerationProgress(100);
        clearInterval(progressInterval);
        
        setTimeout(() => {
          setIsGenerating(false);
          setGenerationProgress(0);
        }, 500);
        
        toast.success(`✅ Model wygenerowany pomyślnie z ${result.method || 'PartCrafter'}!`);
        setFileName(file.name);
        setModelData(null);
        setAvailableModels([]);
        setSelectedModelIndex(0);
      } else {
        throw new Error(result.error || 'PartCrafter generation failed');
      }
      
    } catch (error) {
      console.error("Error generating 3D from image:", error);
      setIsGenerating(false);
      setGenerationProgress(0);
      toast.error('❌ Błąd generowania 3D z obrazu: ' + (error instanceof Error ? error.message : 'Nieznany błąd'));
    }
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
      const dimensions = getModelDimensions(modelData);
      
      console.log('Model dimensions for cart:', dimensions);

      // Find model in database by name if user is logged in
      let modelId = `${Date.now()}-${Math.random()}`;
      
      if (user) {
        const { data: models } = await supabase
          .from('models')
          .select('id')
          .eq('user_id', user.id)
          .eq('name', fileName)
          .limit(1);
        
        if (models && models.length > 0) {
          modelId = models[0].id;
          console.log('Found model in database:', modelId);
        } else {
          console.log('Model not found in database, using temp ID:', modelId);
        }
      }

      const newItem: CartItem = {
        id: modelId,
        name: fileName,
        color: modelColor,
        quantity: 1,
        price: 39.99, // Base price - will be calculated in checkout based on dimensions
        dimensions: dimensions // Add dimensions to cart item
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
          toast.success(`Zwiększono ilość "${newItem.name}" w koszyku`);
          return updated;
        } else {
          // Add new item
          toast.success(`Dodano "${newItem.name}" do koszyka`);
          return [...prev, newItem];
        }
      });
    } catch (error) {
      console.error('Error adding to cart:', error);
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
    toast.success('Wyczyszczono koszyk');
  };

  const handleReset = () => {
    setModelData(null);
    setImageGeometry(null);
    setFileName(undefined);
    setAvailableModels([]);
    setSelectedModelIndex(0);
    // Reset color based on current theme
    if (resolvedTheme === 'light') {
      setModelColor('#000000');
    } else {
      setModelColor('#FFFFFF');
    }
    toast.info(t('resetMessage'));
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
    <div className="min-h-screen bg-gradient-secondary">
      {/* Header */}
      <header className="border-b border-border/50 bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="p-1.5 sm:p-2 rounded-lg bg-gradient-primary">
                <Layers3 className="w-5 h-5 sm:w-6 sm:h-6 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-lg sm:text-xl lg:text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                  {siteSettings.homepage_title?.[language] || siteSettings.homepage_title?.pl || t('appTitle')}
                </h1>
              </div>
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              {/* Shopping Cart */}
              <ShoppingCartComponent
                items={cartItems}
                onUpdateQuantity={handleUpdateCartQuantity}
                onRemoveItem={handleRemoveFromCart}
                onClearCart={handleClearCart}
              />
              
              {/* Authentication */}
              {!loading && (
                <div className="flex items-center gap-2">
                  {user ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => navigate('/dashboard')}
                      className="flex items-center gap-2"
                    >
                      <User className="w-4 h-4" />
                      <span className="hidden sm:inline">Dashboard</span>
                    </Button>
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => navigate('/auth')}
                      className="flex items-center gap-2"
                    >
                      <LogIn className="w-4 h-4" />
                      <span className="hidden sm:inline">{t('signIn')}</span>
                    </Button>
                  )}
                </div>
              )}
              
              {/* Theme/Language selectors */}
              <div className="flex gap-1 sm:gap-2">
                {/* Mobile: Separate buttons */}
                <div className="flex gap-1 sm:gap-2 lg:hidden">
                  <LanguageSelector />
                  <ThemeSelector />
                </div>
                {/* Desktop: Combined selector */}
                <div className="hidden lg:block">
                  <LanguageThemeSelector />
                </div>
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
                onModelSelect={setSelectedModelIndex}
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
                currentGeometry={imageGeometry || availableModels[selectedModelIndex]?.geometry}
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
  );
};

export default Index;