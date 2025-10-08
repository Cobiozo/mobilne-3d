import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { FileUpload } from '@/components/FileUpload';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useApp } from '@/contexts/AppContext';
import { getText } from '@/lib/i18n';
import { toast } from 'sonner';
import { Upload, Save } from 'lucide-react';

interface ModelUploadProps {
  onUploadComplete?: () => void;
}

export const ModelUpload = ({ onUploadComplete }: ModelUploadProps) => {
  const { user } = useAuth();
  const { language } = useApp();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [modelName, setModelName] = useState('');
  const [description, setDescription] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const handleFileSelect = (file: File) => {
    console.log('[ModelUpload] File selected:', file.name, file.size);
    setSelectedFile(file);
    if (!modelName) {
      // Auto-fill name from filename
      const nameWithoutExtension = file.name.replace(/\.[^/.]+$/, '');
      setModelName(nameWithoutExtension);
      console.log('[ModelUpload] Auto-filled model name:', nameWithoutExtension);
    }
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

      // Extract string value from jsonb field - handle both direct string and nested object
      let storageFolder = '';
      if (settingsData?.setting_value) {
        if (typeof settingsData.setting_value === 'string') {
          storageFolder = settingsData.setting_value;
        } else if (typeof settingsData.setting_value === 'object') {
          // Check if it's a nested object with 'value' property
          const valueObj = settingsData.setting_value as any;
          storageFolder = valueObj.value || valueObj.folder || '';
        }
      }
      
      console.log('[ModelUpload] Storage folder:', storageFolder);
      
      // Upload file to Supabase Storage
      const fileExt = selectedFile.name.split('.').pop();
      const basePath = storageFolder ? `${storageFolder}/${user.id}` : user.id;
      const fileName = `${basePath}/${Date.now()}.${fileExt}`;
      
      console.log('[ModelUpload] Uploading to path:', fileName);
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('models')
        .upload(fileName, selectedFile);

      console.log('[ModelUpload] Upload result:', uploadData, 'Error:', uploadError);

      if (uploadError) {
        throw uploadError;
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('models')
        .getPublicUrl(uploadData.path);

      console.log('[ModelUpload] Public URL:', publicUrl);

      // Save model metadata to database
      console.log('[ModelUpload] Saving metadata to database...');
      const { error: dbError } = await supabase
        .from('models')
        .insert({
          user_id: user.id,
          name: modelName.trim(),
          description: description.trim() || null,
          file_url: publicUrl,
          file_size: selectedFile.size,
          file_type: fileExt,
          is_public: isPublic
        });

      console.log('[ModelUpload] DB insert error:', dbError);

      if (dbError) {
        throw dbError;
      }

      toast.success(getText('modelUploadedSuccessfully', language));
      
      // Reset form
      setSelectedFile(null);
      setModelName('');
      setDescription('');
      setIsPublic(false);
      
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
        {/* File Upload */}
        <div className="space-y-2">
          <Label>{getText('selectFile', language)}</Label>
          <FileUpload onFileSelect={handleFileSelect} />
          {selectedFile && (
            <p className="text-sm text-muted-foreground">
              {getText('selectedFile', language)}: {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
            </p>
          )}
        </div>

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