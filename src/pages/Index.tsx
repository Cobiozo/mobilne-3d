import { useState } from "react";
import { FileUpload } from "@/components/FileUpload";
import { ModelViewer } from "@/components/ModelViewer";
import { ControlPanel } from "@/components/ControlPanel";
import { toast } from "sonner";
import { Box, Layers3 } from "lucide-react";
import { exportCanvasAs, captureCanvasFromThreeJS } from "@/utils/exportUtils";
import { useApp } from "@/contexts/AppContext";
import { useTranslation } from "@/lib/i18n";
import { LanguageThemeSelector } from "@/components/LanguageThemeSelector";

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

  const handleExport = async (format: 'png' | 'jpg' | 'pdf') => {
    try {
      toast.info(t('exportPreparing', { format: format.toUpperCase() }));
      
      // Wait a moment for the scene to fully render
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Find the Three.js canvas
      const canvasElements = document.querySelectorAll('canvas');
      let canvas: HTMLCanvasElement | null = null;
      
      // Look for the Three.js canvas (should be the one with WebGL context)
      for (const canvasEl of canvasElements) {
        const gl = canvasEl.getContext('webgl') || canvasEl.getContext('webgl2');
        if (gl) {
          canvas = canvasEl;
          break;
        }
      }
      
      if (!canvas) {
        toast.error(t('exportNoModel'));
        return;
      }

      // Ensure the canvas has preserveDrawingBuffer enabled for capture
      const gl = canvas.getContext('webgl') || canvas.getContext('webgl2');
      if (gl && !gl.getContextAttributes()?.preserveDrawingBuffer) {
        toast.error(t('exportConfigError'));
        return;
      }

      // Capture the canvas content
      const captureCanvas = captureCanvasFromThreeJS(canvas);
      
      // Export with filename based on the loaded model
      const baseFileName = fileName ? fileName.replace(/\.[^/.]+$/, '') : 'model-export';
      await exportCanvasAs(captureCanvas, format, baseFileName);
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
            <LanguageThemeSelector />
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