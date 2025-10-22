import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { FileUpload } from '@/components/FileUpload';
import { ModelViewer } from '@/components/ModelViewer';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useApp } from '@/contexts/AppContext';
import { getText } from '@/lib/i18n';
import { toast } from 'sonner';
import { Upload, Save } from 'lucide-react';
import { loadModelFile, Model3MFInfo } from '@/utils/modelLoader';
import * as THREE from 'three';

interface ModelUploadProps {
  onUploadComplete?: () => void;
}

export const ModelUpload = ({ onUploadComplete }: ModelUploadProps) => {
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

  console.log('[ModelUpload] Component rendered');
  console.log('[ModelUpload] State:', { selectedFile: selectedFile?.name, modelName, user: user?.email });

  const handleFileSelect = async (file: File) => {
    console.log('[ModelUpload] File selected:', file.name, file.size);
    setSelectedFile(file);
    setFileName(file.name);
    
    // Load model data
    const arrayBuffer = await file.arrayBuffer();
    setModelData(arrayBuffer);
    
    // Load models for 3MF support
    try {
      const models = await loadModelFile(arrayBuffer, file.name);
      setAvailableModels(models);
      setSelectedModelIndex(0);
      if (models.length > 0 && models[0].geometry) {
        setCurrentGeometry(models[0].geometry);
      }
    } catch (error) {
      console.error('[ModelUpload] Error loading models:', error);
      setAvailableModels([]);
      setCurrentGeometry(null);
    }
    
    if (!modelName) {
      // Auto-fill name from filename
      const nameWithoutExtension = file.name.replace(/\.[^/.]+$/, '');
      setModelName(nameWithoutExtension);
      console.log('[ModelUpload] Auto-filled model name:', nameWithoutExtension);
    }
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
    console.log('[ModelUpload] handleUpload called');
    console.log('[ModelUpload] selectedFile:', selectedFile);
    console.log('[ModelUpload] user:', user);
    console.log('[ModelUpload] modelName:', modelName);
    
    if (!selectedFile || !user || !modelName.trim()) {
      console.log('[ModelUpload] Validation failed');
      toast.error(getText('fillAllFields', language));
      return;
    }

    // For multi-model 3MF, validate that at least one model is selected
    if (availableModels.length > 1 && selectedModelsToUpload.length === 0) {
      toast.error('Wybierz przynajmniej jeden model do uploadu');
      return;
    }

    console.log('[ModelUpload] Starting upload...');
    setIsUploading(true);

    try {
      // Fetch storage folder setting
      console.log('[ModelUpload] Fetching storage folder setting...');
      const { data: settingsData, error: settingsError } = await supabase
        .from('site_settings')
        .select('setting_value')
        .eq('setting_key', 'models_storage_folder')
        .maybeSingle();

      console.log('[ModelUpload] Settings data:', settingsData, 'Error:', settingsError);

      // Extract string value from jsonb field
      let storageFolder = '';
      if (settingsData?.setting_value) {
        // setting_value is JSONB, so it's already parsed by Supabase
        if (typeof settingsData.setting_value === 'string') {
          storageFolder = settingsData.setting_value.trim();
        } else if (typeof settingsData.setting_value === 'object') {
          // Handle nested object if exists
          const valueObj = settingsData.setting_value as any;
          storageFolder = (valueObj.value || valueObj.folder || '').toString().trim();
        }
      }
      
      console.log('[ModelUpload] Parsed storage folder:', storageFolder);
      
      // Upload file to Supabase Storage
      const fileExt = selectedFile.name.split('.').pop();
      const basePath = storageFolder ? `${storageFolder}/${user.id}` : user.id;
      const filePath = `${basePath}/${Date.now()}_${selectedFile.name}`;
      
      console.log('[ModelUpload] Uploading to path:', filePath);
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('models')
        .upload(filePath, selectedFile);

      console.log('[ModelUpload] Upload result:', uploadData, 'Error:', uploadError);

      if (uploadError) {
        throw uploadError;
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('models')
        .getPublicUrl(uploadData.path);

      console.log('[ModelUpload] Public URL:', publicUrl);

      // Handle multi-model 3MF uploads
      const modelsToUpload = uploadMode === 'all' && availableModels.length > 1 
        ? availableModels.map(m => m.index)
        : selectedModelsToUpload;

      // Save model metadata to database
      console.log('[ModelUpload] Saving metadata to database...');
      
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

        console.log('[ModelUpload] DB insert error for model', modelIndex, ':', dbError);

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
      
      // Reset form
      setSelectedFile(null);
      setModelName('');
      setDescription('');
      setIsPublic(false);
      setAvailableModels([]);
      setCurrentGeometry(null);
      setSelectedModelsToUpload([0]);
      setUploadMode('single');
      
      console.log('[ModelUpload] Upload completed successfully');
      onUploadComplete?.();

    } catch (error) {
      console.error('[ModelUpload] Upload error:', error);
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
        {/* File Upload - only show when no file selected */}
        {!selectedFile && (
          <div className="space-y-2">
            <Label>{getText('selectFile', language)}</Label>
            <FileUpload onFileSelect={handleFileSelect} />
          </div>
        )}

        {/* Model Preview */}
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

        {/* Model Name */}
        <div className="space-y-2">
          <Label htmlFor="modelName">{getText('modelName', language)} *</Label>
          <Input
            id="modelName"
            value={modelName}
            onChange={(e) => setModelName(e.target.value)}
            placeholder={getText('enterModelName', language)}
          />
        </div>

        {/* Description */}
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

        {/* Public/Private Toggle */}
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

        {/* Upload Button */}
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