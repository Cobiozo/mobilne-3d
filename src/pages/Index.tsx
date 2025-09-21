import { useState, useEffect } from "react";
import { FileUpload } from "@/components/FileUpload";
import { ModelViewer } from "@/components/ModelViewer";
import { ControlPanel } from "@/components/ControlPanel";
import { ModelSelector } from "@/components/ModelSelector";
import { toast } from "sonner";
import { Box, Layers3 } from "lucide-react";
import { exportCanvasAs, captureCanvasFromThreeJS } from "@/utils/exportUtils";
import { render2DView } from "@/utils/export2D";
import { useApp } from "@/contexts/AppContext";
import { useTranslation } from "@/lib/i18n";
import { LanguageThemeSelector } from "@/components/LanguageThemeSelector";
import { ThemeSelector } from "@/components/ThemeSelector";
import { LanguageSelector } from "@/components/LanguageSelector";
import { useTheme } from "next-themes";
import { loadModelFile, Model3MFInfo } from "@/utils/modelLoader";


const Index = () => {
  const { language } = useApp();
  const { t } = useTranslation(language);
  const { theme, resolvedTheme } = useTheme();
  const [modelData, setModelData] = useState<ArrayBuffer | null>(null);
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

  const handleReset = () => {
    setModelData(null);
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

  const handleExport = async (format: 'png' | 'jpg' | 'pdf', view: '2d-front' | '2d-top' | '2d-side') => {
    try {
      if (!modelData) {
        toast.error(t('exportNoModel'));
        return;
      }

      toast.info(`Przygotowywanie eksportu 2D (${view})...`);
      
      // Import STLLoader for geometry parsing
      const { STLLoader } = await import('three/examples/jsm/loaders/STLLoader.js');
      const THREE = await import('three');
      
      // Parse geometry from model data
      const loader = new STLLoader();
      const geometry = loader.parse(modelData);
      
      // Center and scale geometry
      geometry.computeBoundingBox();
      const center = new THREE.Vector3();
      geometry.boundingBox?.getCenter(center);
      geometry.translate(-center.x, -center.y, -center.z);
      
      const size = new THREE.Vector3();
      geometry.boundingBox?.getSize(size);
      const maxDimension = Math.max(size.x, size.y, size.z);
      const scale = 3 / maxDimension;
      geometry.scale(scale, scale, scale);
      geometry.computeVertexNormals();
      
      // Create material
      const material = new THREE.MeshStandardMaterial({
        color: new THREE.Color(modelColor),
        metalness: 0.3,
        roughness: 0.4,
        side: THREE.DoubleSide,
      });
      
      // Render 2D view
      const canvas2D = render2DView(geometry, material, view, modelColor);
      
      // Export
      const viewName = view === '2d-front' ? 'przod' : view === '2d-top' ? 'gora' : 'bok';
      const baseFileName = fileName ? fileName.replace(/\.[^/.]+$/, '') : 'model-export';
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
              />
              
              {availableModels.length > 1 && (
                <ModelSelector
                  models={availableModels.map(model => ({
                    name: model.name,
                    index: model.index,
                    meshCount: model.meshCount
                  }))}
                  selectedModelIndex={selectedModelIndex}
                  onModelSelect={setSelectedModelIndex}
                />
              )}
              
              {!modelData && (
                <div className="block xl:hidden">
                  <FileUpload onFileSelect={handleFileSelect} />
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
              currentGeometry={availableModels[selectedModelIndex]?.geometry}
            />
          </div>
        </div>

        {/* Upload Area when model is loaded - Hidden on mobile when in sidebar */}
        {modelData && (
          <div className="mt-4 sm:mt-6 xl:hidden">
            <div className="text-center">
              <p className="text-muted-foreground mb-4 text-sm sm:text-base">
                {t('differentModel')}
              </p>
              <div className="max-w-md mx-auto">
                <FileUpload onFileSelect={handleFileSelect} />
              </div>
            </div>
          </div>
        )}

        {/* Desktop file upload when no model loaded */}
        {!modelData && (
          <div className="hidden xl:block mt-6">
            <div className="text-center">
              <div className="max-w-md mx-auto">
                <FileUpload onFileSelect={handleFileSelect} />
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default Index;