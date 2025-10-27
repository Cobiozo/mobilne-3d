import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileUpload } from "@/components/FileUpload";
import { ModelViewer } from "@/components/ModelViewer";
import { ModelSelector } from "@/components/ModelSelector";
import { loadModelFile, Model3MFInfo } from "@/utils/modelLoader";
import { toast } from "sonner";
import * as THREE from 'three';

interface QuickModelUploadProps {
  onFileSelect: (file: File, arrayBuffer: ArrayBuffer, models: Model3MFInfo[], selectedIndex: number, geometry: THREE.BufferGeometry | null) => void;
  modelColor: string;
  currentGeometry: THREE.BufferGeometry | null;
}

export const QuickModelUpload = ({ onFileSelect, modelColor, currentGeometry }: QuickModelUploadProps) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [availableModels, setAvailableModels] = useState<Model3MFInfo[]>([]);
  const [selectedModelIndex, setSelectedModelIndex] = useState(0);

  const handleFileSelect = async (file: File) => {
    try {
      setSelectedFile(file);
      const arrayBuffer = await file.arrayBuffer();
      
      // Load models using the unified loader
      const models = await loadModelFile(arrayBuffer, file.name);
      setAvailableModels(models);
      setSelectedModelIndex(0);
      
      // Set current geometry for rendering
      const geometry = models.length > 0 && models[0].geometry ? models[0].geometry : null;
      
      // Call parent handler
      onFileSelect(file, arrayBuffer, models, 0, geometry);
      
      if (models.length > 1) {
        toast.success(`Wczytano plik ${file.name} (${models.length} modeli dostępnych)`);
      } else {
        toast.success(`Wczytano plik ${file.name}`);
      }
    } catch (error) {
      console.error("Error loading file:", error);
      toast.error('Błąd podczas wczytywania pliku');
      setAvailableModels([]);
      setSelectedModelIndex(0);
    }
  };

  const handleModelSelect = (index: number) => {
    setSelectedModelIndex(index);
    if (selectedFile && availableModels[index]?.geometry) {
      // Notify parent about model change
      selectedFile.arrayBuffer().then(arrayBuffer => {
        onFileSelect(selectedFile, arrayBuffer, availableModels, index, availableModels[index].geometry);
      });
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Szybkie wczytywanie modelu</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <FileUpload onFileSelect={handleFileSelect} />
          
          {selectedFile && currentGeometry && (
            <>
              <ModelViewer
                currentGeometry={currentGeometry}
                modelColor={modelColor}
                fileName={selectedFile.name}
              />
              
              {availableModels.length > 1 && (
                <ModelSelector
                  models={availableModels}
                  selectedModelIndex={selectedModelIndex}
                  onModelSelect={handleModelSelect}
                />
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
