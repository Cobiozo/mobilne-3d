import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useApp } from '@/contexts/AppContext';
import { getText } from '@/lib/i18n';
import { toast } from 'sonner';
import { Upload, Save } from 'lucide-react';
import { loadModelFile, Model3MFInfo } from '@/utils/modelLoader';
import * as THREE from 'three';
import { ModelViewer } from '@/components/ModelViewer';

interface DashboardModelUploadProps {
  onUploadComplete?: () => void;
}

export const DashboardModelUpload = ({ onUploadComplete }: DashboardModelUploadProps) => {
  const { user } = useAuth();
  const { language } = useApp();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [modelData, setModelData] = useState<ArrayBuffer | null>(null);
  const [modelName, setModelName] = useState('');
  const [description, setDescription] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [fileName, setFileName] = useState<string>('');
  const [modelColor] = useState('#00aaff');
  const [availableModels, setAvailableModels] = useState<Model3MFInfo[]>([]);
  const [selectedModelIndex, setSelectedModelIndex] = useState(0);
  const [currentGeometry, setCurrentGeometry] = useState<THREE.BufferGeometry | null>(null);
  const [uploadMode, setUploadMode] = useState<'single' | 'all'>('single');
  const [selectedModelsToUpload, setSelectedModelsToUpload] = useState<number[]>([0]);

  console.log('[DashboardModelUpload] Component rendered');

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    console.log('[DashboardModelUpload] File selected:', file.name, file.size);
    
    const isValidFile = file.name.toLowerCase().endsWith('.stl') || 
                       file.name.toLowerCase().endsWith('.3mf');
    
    if (!isValidFile) {
      console.error('[DashboardModelUpload] Invalid file type:', file.name);
      toast.error('Proszę wybrać plik .STL lub .3MF');
      e.target.value = '';
      return;
    }

    setSelectedFile(file);
    setFileName(file.name);
    
    const arrayBuffer = await file.arrayBuffer();
    setModelData(arrayBuffer);
    
    try {
      const models = await loadModelFile(arrayBuffer, file.name);
      setAvailableModels(models);
      setSelectedModelIndex(0);
      if (models.length > 0 && models[0].geometry) {
        setCurrentGeometry(models[0].geometry);
      }
    } catch (error) {
      console.error('[DashboardModelUpload] Error loading models:', error);
      setAvailableModels([]);
      setCurrentGeometry(null);
    }
    
    if (!modelName) {
      const nameWithoutExtension = file.name.replace(/\.[^/.]+$/, '');
      setModelName(nameWithoutExtension);
    }
    
    e.target.value = '';
  };

  const handleModelSelect = (index: number) => {
    setSelectedModelIndex(index);
    if (availableModels[index] && availableModels[index].geometry) {
      setCurrentGeometry(availableModels[index].geometry);
    }
  };

  const toggleModelSelection = (index: number) => {
    setSelectedModelsToUpload(prev => {
      if (prev.includes(index)) {
        return prev.filter(i => i !== index);
      } else {
        return [...prev, index];
      }
    });
  };

  const handleUpload = async () => {
    if (!selectedFile || !user || !modelName.trim()) {
      toast.error(getText('fillAllFields', language));
      return;
    }

    if (availableModels.length > 1 && selectedModelsToUpload.length === 0) {
      toast.error('Wybierz przynajmniej jeden model do uploadu');
      return;
    }

    setIsUploading(true);

    try {
      const { data: settingsData } = await supabase
        .from('site_settings')
        .select('setting_value')
        .eq('setting_key', 'models_storage_folder')
        .maybeSingle();

      let storageFolder = '';
      if (settingsData?.setting_value) {
        if (typeof settingsData.setting_value === 'string') {
          storageFolder = settingsData.setting_value.trim();
        } else if (typeof settingsData.setting_value === 'object') {
          const valueObj = settingsData.setting_value as any;
          storageFolder = (valueObj.value || valueObj.folder || '').toString().trim();
        }
      }
      
      const fileExt = selectedFile.name.split('.').pop();
      const basePath = storageFolder ? `${storageFolder}/${user.id}` : user.id;
      const filePath = `${basePath}/${Date.now()}_${selectedFile.name}`;
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('models')
        .upload(filePath, selectedFile);

      if (uploadError) {
        throw uploadError;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('models')
        .getPublicUrl(uploadData.path);

      const modelsToUpload = uploadMode === 'all' && availableModels.length > 1 
        ? availableModels.map(m => m.index)
        : selectedModelsToUpload;

      for (const modelIndex of modelsToUpload) {
        const modelSuffix = availableModels.length > 1 ? ` - Model ${modelIndex + 1}` : '';
        const { error: dbError } = await supabase
          .from('models')
          .insert({
            user_id: user.id,
            name: modelName.trim() + modelSuffix,
            description: description.trim() || null,
            file_url: publicUrl,
            file_size: selectedFile.size,
            file_type: fileExt,
            is_public: isPublic,
            model_index: availableModels.length > 1 ? modelIndex : null,
            parent_file: availableModels.length > 1 ? selectedFile.name : null
          });

        if (dbError) {
          throw dbError;
        }
      }

      const uploadedCount = modelsToUpload.length;
      toast.success(
        uploadedCount > 1 
          ? `Pomyślnie wgrano ${uploadedCount} modeli` 
          : getText('modelUploadedSuccessfully', language)
      );
      
      setSelectedFile(null);
      setModelName('');
      setDescription('');
      setIsPublic(false);
      setAvailableModels([]);
      setCurrentGeometry(null);
      setSelectedModelsToUpload([0]);
      setUploadMode('single');
      setModelData(null);
      
      onUploadComplete?.();

    } catch (error) {
      console.error('[DashboardModelUpload] Upload error:', error);
      toast.error(getText('uploadError', language));
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="w-5 h-5" />
          {getText('uploadModel', language)}
        </CardTitle>
        <CardDescription>
          {getText('uploadModelDescription', language)}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {!selectedFile && (
          <div className="space-y-2">
            <Label>{getText('selectFile', language)}</Label>
            <div className="relative border-2 border-dashed border-border rounded-lg text-center bg-gradient-upload hover:bg-viewer-upload-hover transition-all duration-300 hover:border-primary group p-4 sm:p-6 lg:p-8">
              <input
                type="file"
                accept=".stl,.3mf"
                onChange={handleFileChange}
                className="hidden"
                id="dashboard-file-upload-input"
              />
              
              <label 
                htmlFor="dashboard-file-upload-input" 
                className="flex flex-col items-center gap-3 sm:gap-4 cursor-pointer"
              >
                <div className="p-3 sm:p-4 rounded-full bg-muted group-hover:bg-primary/20 transition-colors">
                  <Upload className="w-6 h-6 sm:w-8 sm:h-8 text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
                
                <div className="space-y-1 sm:space-y-2">
                  <h3 className="text-base sm:text-lg font-semibold">{getText('uploadTitle', language)}</h3>
                  <p className="text-muted-foreground text-sm sm:text-base">
                    {getText('uploadSubtitle', language)}
                  </p>
                </div>
              </label>
            </div>
          </div>
        )}

        {selectedFile && modelData && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Podgląd modelu</Label>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSelectedFile(null);
                  setModelData(null);
                  setModelName('');
                  setAvailableModels([]);
                  setCurrentGeometry(null);
                }}
              >
                Zmień model
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
              {availableModels.length > 1 && ` - ${availableModels.length} modeli`}
            </p>
            <div className="w-full h-[400px]">
              <ModelViewer 
                modelData={modelData} 
                modelColor={modelColor}
                fileName={fileName}
                currentGeometry={currentGeometry}
              />
            </div>
            {availableModels.length > 1 && (
              <>
                <div className="flex items-center gap-2 pt-2">
                  <span className="text-sm font-medium">Podgląd:</span>
                  {availableModels.map((model, index) => (
                    <Button
                      key={model.index}
                      variant={selectedModelIndex === model.index ? "default" : "outline"}
                      size="sm"
                      onClick={() => handleModelSelect(model.index)}
                    >
                      {index + 1}
                    </Button>
                  ))}
                </div>
                
                <div className="border rounded-lg p-4 space-y-3 mt-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">Tryb uploadu:</Label>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant={uploadMode === 'single' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => {
                          setUploadMode('single');
                          if (selectedModelsToUpload.length === 0) {
                            setSelectedModelsToUpload([0]);
                          }
                        }}
                      >
                        Wybrane
                      </Button>
                      <Button
                        type="button"
                        variant={uploadMode === 'all' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setUploadMode('all')}
                      >
                        Wszystkie
                      </Button>
                    </div>
                  </div>
                  
                  {uploadMode === 'single' && (
                    <div className="space-y-2">
                      <Label className="text-sm">Wybierz modele do uploadu:</Label>
                      <div className="grid grid-cols-4 gap-2">
                        {availableModels.map((model, index) => (
                          <label
                            key={model.index}
                            className={`flex items-center justify-center gap-2 p-3 border rounded cursor-pointer transition-all ${
                              selectedModelsToUpload.includes(model.index)
                                ? 'border-primary bg-primary/10'
                                : 'border-border hover:border-primary/50'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={selectedModelsToUpload.includes(model.index)}
                              onChange={() => toggleModelSelection(model.index)}
                              className="w-4 h-4"
                            />
                            <span className="text-sm font-medium">Model {index + 1}</span>
                          </label>
                        ))}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Wybrano: {selectedModelsToUpload.length} / {availableModels.length}
                      </p>
                    </div>
                  )}
                  
                  {uploadMode === 'all' && (
                    <p className="text-sm text-muted-foreground">
                      Zostanie wgranych {availableModels.length} modeli jako osobne wpisy
                    </p>
                  )}
                </div>
              </>
            )}
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="modelName">{getText('modelName', language)} *</Label>
          <Input
            id="modelName"
            value={modelName}
            onChange={(e) => setModelName(e.target.value)}
            placeholder={getText('enterModelName', language)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Opis</Label>
          <Textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={getText('enterDescription', language)}
            rows={3}
          />
        </div>

        <div className="flex items-center space-x-2">
          <Switch
            id="isPublic"
            checked={isPublic}
            onCheckedChange={setIsPublic}
          />
          <Label htmlFor="isPublic">
            {getText('makeModelPublic', language)}
          </Label>
        </div>

        <Button
          onClick={handleUpload}
          disabled={!selectedFile || !modelName.trim() || isUploading}
          className="w-full"
        >
          {isUploading ? (
            <>
              <div className="w-4 h-4 mr-2 border-2 border-current border-t-transparent rounded-full animate-spin" />
              {getText('uploading', language)}
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              {getText('uploadModel', language)}
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
};
