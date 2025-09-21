import { useState, useEffect } from "react";
import { FileUpload } from "@/components/FileUpload";
import { ImageUpload } from "@/components/ImageUpload";
import { ModelViewer } from "@/components/ModelViewer";
import { ControlPanel } from "@/components/ControlPanel";
import { ModelSelector } from "@/components/ModelSelector";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Box, Layers3, Image } from "lucide-react";
import { exportCanvasAs, captureCanvasFromThreeJS } from "@/utils/exportUtils";
import { render2DView } from "@/utils/export2D";
import { useApp } from "@/contexts/AppContext";
import { useTranslation } from "@/lib/i18n";
import { LanguageThemeSelector } from "@/components/LanguageThemeSelector";
import { ThemeSelector } from "@/components/ThemeSelector";
import { LanguageSelector } from "@/components/LanguageSelector";
import { useTheme } from "next-themes";
import { loadModelFile, Model3MFInfo } from "@/utils/modelLoader";
import { imageToGeometry, loadImageData } from "@/utils/imageToGeometry";
import * as THREE from 'three';


const Index = () => {
  const { language } = useApp();
  const { t } = useTranslation(language);
  const { theme, resolvedTheme } = useTheme();
  const [activeTab, setActiveTab] = useState<"model3d" | "image2d">("model3d");
  const [modelData, setModelData] = useState<ArrayBuffer | null>(null);
  const [imageGeometry, setImageGeometry] = useState<THREE.BufferGeometry | null>(null);
  const [modelColor, setModelColor] = useState("#FFFFFF");
  const [fileName, setFileName] = useState<string>();
  const [availableModels, setAvailableModels] = useState<Model3MFInfo[]>([]);
  const [selectedModelIndex, setSelectedModelIndex] = useState(0);

  // Auto-adjust color based on theme
  useEffect(() => {
    if (resolvedTheme === 'light') {
      setModelColor('#000000'); // Black for light theme
    } else {
      setModelColor('#FFFFFF'); // White for dark theme
    }
  }, [resolvedTheme]);

  const handleFileSelect = async (file: File) => {
    try {
      const arrayBuffer = await file.arrayBuffer();
      setModelData(arrayBuffer);
      setFileName(file.name);
      
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

  const handleImageSelect = async (file: File) => {
    try {
      toast.info(t('imageGenerating'));
      
      // Load image data
      const imageData = await loadImageData(file);
      
      // Convert to 3D geometry using voxel approach with reduced thickness
      const geometry = imageToGeometry(imageData, {
        mode: 'silhouette',
        extrudeDepth: 0.5,  // Much thinner - 1/3 of previous thickness
        bevelEnabled: false  // Keep disabled for performance
      });
      
      setImageGeometry(geometry);
      setFileName(file.name);
      setModelData(null); // Clear 3D model data
      setAvailableModels([]);
      setSelectedModelIndex(0);
      
      toast.success(t('imageGenerated'));
    } catch (error) {
      console.error("Error processing image:", error);
      toast.error(t('imageError'));
    }
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
                  {t('appTitle')}
                </h1>
                <p className="text-xs sm:text-sm text-muted-foreground hidden sm:block">
                  {t('appSubtitle')}
                </p>
              </div>
            </div>
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
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-4 sm:gap-6 min-h-[calc(100vh-120px)] sm:min-h-[calc(100vh-140px)]">
          {/* Control Panel - Full width on mobile, sidebar on desktop */}
          <div className="xl:col-span-1 order-2 xl:order-1">
            <div className="space-y-4">
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
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="model3d" className="flex items-center gap-2">
                        <Layers3 className="w-4 h-4" />
                        {t('tabModel3D')}
                      </TabsTrigger>
                      <TabsTrigger value="image2d" className="flex items-center gap-2">
                        <Image className="w-4 h-4" />
                        {t('tabImageTo3D')}
                      </TabsTrigger>
                    </TabsList>
                    <TabsContent value="model3d" className="mt-4">
                      <FileUpload onFileSelect={handleFileSelect} />
                    </TabsContent>
                    <TabsContent value="image2d" className="mt-4">
                      <ImageUpload onFileSelect={handleImageSelect} />
                    </TabsContent>
                  </Tabs>
                </div>
              )}
            </div>
          </div>

          {/* 3D Viewer - Full width on mobile, main area on desktop */}
          <div className="xl:col-span-3 order-1 xl:order-2 min-h-[300px] sm:min-h-[400px] lg:min-h-[500px]">
            <ModelViewer
              modelData={modelData || undefined}
              modelColor={modelColor}
              fileName={fileName}
              currentGeometry={imageGeometry || availableModels[selectedModelIndex]?.geometry}
            />
          </div>
        </div>

        {/* Upload Area when model is loaded - Mobile only */}
        {(modelData || imageGeometry) && (
          <div className="mt-4 sm:mt-6 xl:hidden">
            <div className="text-center">
              <p className="text-muted-foreground mb-4 text-sm sm:text-base">
                {t('differentModel')}
              </p>
              <div className="max-w-md mx-auto">
                <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "model3d" | "image2d")} className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="model3d" className="flex items-center gap-2">
                      <Layers3 className="w-4 h-4" />
                      {t('tabModel3D')}
                    </TabsTrigger>
                    <TabsTrigger value="image2d" className="flex items-center gap-2">
                      <Image className="w-4 h-4" />
                      {t('tabImageTo3D')}
                    </TabsTrigger>
                  </TabsList>
                  <TabsContent value="model3d" className="mt-4">
                    <FileUpload onFileSelect={handleFileSelect} />
                  </TabsContent>
                  <TabsContent value="image2d" className="mt-4">
                    <ImageUpload onFileSelect={handleImageSelect} />
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
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="model3d" className="flex items-center gap-2">
                      <Layers3 className="w-4 h-4" />
                      {t('tabModel3D')}
                    </TabsTrigger>
                    <TabsTrigger value="image2d" className="flex items-center gap-2">
                      <Image className="w-4 h-4" />
                      {t('tabImageTo3D')}
                    </TabsTrigger>
                  </TabsList>
                  <TabsContent value="model3d" className="mt-4">
                    <FileUpload onFileSelect={handleFileSelect} />
                  </TabsContent>
                  <TabsContent value="image2d" className="mt-4">
                    <ImageUpload onFileSelect={handleImageSelect} />
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