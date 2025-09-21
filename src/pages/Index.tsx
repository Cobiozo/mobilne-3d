import { useState } from "react";
import { FileUpload } from "@/components/FileUpload";
import { ModelViewer } from "@/components/ModelViewer";
import { ControlPanel } from "@/components/ControlPanel";
import { toast } from "sonner";
import { Box, Layers3 } from "lucide-react";
import { exportCanvasAs, captureCanvasFromThreeJS } from "@/utils/exportUtils";

const Index = () => {
  const [modelData, setModelData] = useState<ArrayBuffer | null>(null);
  const [modelColor, setModelColor] = useState("#FFFFFF");
  const [fileName, setFileName] = useState<string>();

  const handleFileSelect = async (file: File) => {
    try {
      const arrayBuffer = await file.arrayBuffer();
      setModelData(arrayBuffer);
      setFileName(file.name);
      toast.success(`Model "${file.name}" loaded successfully!`);
    } catch (error) {
      console.error("Error loading file:", error);
      toast.error("Failed to load the model file");
    }
  };

  const handleReset = () => {
    setModelData(null);
    setFileName(undefined);
    setModelColor("#FFFFFF");
    toast.info("Viewer reset");
  };

  const handleExport = async (format: 'png' | 'jpg' | 'pdf') => {
    try {
      // Find the Three.js canvas
      const canvas = document.querySelector('canvas') as HTMLCanvasElement;
      if (!canvas) {
        toast.error('No 3D model to export');
        return;
      }

      // Capture the canvas content
      const captureCanvas = captureCanvasFromThreeJS(canvas);
      
      // Export with filename based on the loaded model
      const baseFileName = fileName ? fileName.replace(/\.[^/.]+$/, '') : 'model-export';
      await exportCanvasAs(captureCanvas, format, baseFileName);
    } catch (error) {
      console.error('Export failed:', error);
      toast.error('Export failed. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-secondary">
      {/* Header */}
      <header className="border-b border-border/50 bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gradient-primary">
              <Layers3 className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                3D Model Viewer
              </h1>
              <p className="text-muted-foreground text-sm">
                Upload and view STL & 3MF files with interactive controls
              </p>
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
                Want to view a different model?
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