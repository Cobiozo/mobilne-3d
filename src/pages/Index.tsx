import { useState } from "react";
import { FileUpload } from "@/components/FileUpload";
import { ModelViewer } from "@/components/ModelViewer";
import { ControlPanel } from "@/components/ControlPanel";
import { toast } from "sonner";
import { Box, Layers3 } from "lucide-react";
import { exportCanvasAs, captureCanvasFromThreeJS } from "@/utils/exportUtils";
import { render2DView } from "@/utils/export2D";
import { useApp } from "@/contexts/AppContext";
import { useTranslation } from "@/lib/i18n";
import { LanguageThemeSelector } from "@/components/LanguageThemeSelector";
import { ThemeSelector } from "@/components/ThemeSelector";
import { LanguageSelector } from "@/components/LanguageSelector";

const Index = () => {
  const { language } = useApp();
  const { t } = useTranslation(language);
  const [modelData, setModelData] = useState<ArrayBuffer | null>(null);
  const [modelColor, setModelColor] = useState("#FFFFFF");
  const [fileName, setFileName] = useState<string>();

  const handleFileSelect = async (file: File) => {
    try {
      const arrayBuffer = await file.arrayBuffer();
      setModelData(arrayBuffer);
      setFileName(file.name);
      toast.success(t('uploadSuccess', { fileName: file.name }));
    } catch (error) {
      console.error("Error loading file:", error);
      toast.error(t('uploadError'));
    }
  };

  const handleReset = () => {
    setModelData(null);
    setFileName(undefined);
    setModelColor("#FFFFFF");
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
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-gradient-primary">
                <Layers3 className="w-6 h-6 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                  {t('appTitle')}
                </h1>
                <p className="text-muted-foreground text-sm">
                  {t('appSubtitle')}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              {/* Mobile: Separate buttons */}
              <div className="flex gap-2 sm:hidden">
                <LanguageSelector />
                <ThemeSelector />
              </div>
              {/* Desktop: Combined selector */}
              <div className="hidden sm:block">
                <LanguageThemeSelector />
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-[calc(100vh-140px)]">
          {/* Control Panel */}
          <div className="lg:col-span-1 space-y-4">
            <ControlPanel
              modelColor={modelColor}
              onColorChange={setModelColor}
              fileName={fileName}
              onReset={handleReset}
              onExport={handleExport}
            />
            
            {!modelData && (
              <FileUpload onFileSelect={handleFileSelect} />
            )}
          </div>

          {/* 3D Viewer */}
          <div className="lg:col-span-3">
            <ModelViewer
              modelData={modelData || undefined}
              modelColor={modelColor}
              fileName={fileName}
            />
          </div>
        </div>

        {/* Upload Area when model is loaded */}
        {modelData && (
          <div className="mt-6">
            <div className="text-center">
              <p className="text-muted-foreground mb-4">
                {t('differentModel')}
              </p>
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