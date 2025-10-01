import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { ModelUpload } from '@/components/ModelUpload';
import { ModelPreviewDialog } from '@/components/ModelPreviewDialog';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useApp } from '@/contexts/AppContext';
import { getText } from '@/lib/i18n';
import { Eye, Download, Trash2, Globe, Lock, Plus, Package } from 'lucide-react';

interface Model {
  id: string;
  name: string;
  file_url: string;
  file_size: number | null;
  file_type: string | null;
  description: string | null;
  is_public: boolean;
  created_at: string;
}

interface ModelLibraryProps {
  userId: string;
}

export const ModelLibrary = ({ userId }: ModelLibraryProps) => {
  const [models, setModels] = useState<Model[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const [selectedModel, setSelectedModel] = useState<Model | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const { toast } = useToast();
  const { language } = useApp();

  const fetchModels = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('models')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      toast({
        title: getText('error', language),
        description: error.message,
        variant: "destructive",
      });
    } else {
      setModels(data || []);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchModels();
  }, [userId, toast, language]);

  const handleUploadComplete = () => {
    setShowUpload(false);
    fetchModels(); // Refresh the models list
  };

  const deleteModel = async (modelId: string) => {
    const { error } = await supabase
      .from('models')
      .delete()
      .eq('id', modelId);

    if (error) {
      toast({
        title: getText('error', language),
        description: error.message,
        variant: "destructive",
      });
    } else {
      setModels(models.filter(m => m.id !== modelId));
      toast({
        title: getText('success', language),
        description: getText('modelDeleted', language),
      });
    }
  };

  const togglePublic = async (modelId: string, isPublic: boolean) => {
    const { error } = await supabase
      .from('models')
      .update({ is_public: !isPublic })
      .eq('id', modelId);

    if (error) {
      toast({
        title: getText('error', language),
        description: error.message,
        variant: "destructive",
      });
    } else {
      setModels(models.map(m => 
        m.id === modelId ? { ...m, is_public: !isPublic } : m
      ));
      toast({
        title: getText('success', language),
        description: getText('modelVisibilityUpdated', language),
      });
    }
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return 'N/A';
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(2)} MB`;
  };

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (showUpload) {
    return <ModelUpload onUploadComplete={handleUploadComplete} />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">{getText('myModels', language)}</h2>
          <p className="text-muted-foreground">
            {getText('manageUploaded3DModels', language)}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Badge variant="outline">
            {models.length} {getText('models', language)}
          </Badge>
          <Button onClick={() => setShowUpload(true)}>
            <Plus className="w-4 h-4 mr-2" />
            {getText('uploadModel', language)}
          </Button>
        </div>
      </div>

      {models.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <h3 className="text-lg font-semibold mb-2">
              {getText('noModelsYet', language)}
            </h3>
            <p className="text-muted-foreground text-center mb-4">
              {getText('uploadFirstModel', language)}
            </p>
            <Button onClick={() => setShowUpload(true)}>
              <Plus className="w-4 h-4 mr-2" />
              {getText('uploadModel', language)}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {models.map((model) => (
            <Card key={model.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg truncate">{model.name}</CardTitle>
                  <div className="flex items-center gap-1">
                    {model.is_public ? (
                      <Globe className="w-4 h-4 text-green-500" />
                    ) : (
                      <Lock className="w-4 h-4 text-gray-500" />
                    )}
                  </div>
                </div>
                <CardDescription>
                  {model.file_type} • {formatFileSize(model.file_size)}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {/* Model thumbnail preview */}
                <div className="mb-4 w-full h-40 bg-muted rounded-lg border overflow-hidden relative flex items-center justify-center">
                  <Package className="w-12 h-12 text-muted-foreground z-10" />
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <p className="text-xs text-muted-foreground">Miniaturka dostępna po otwarciu</p>
                  </div>
                </div>
                
                {model.description && (
                  <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                    {model.description}
                  </p>
                )}
                <div className="flex flex-wrap gap-2">
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => {
                      setSelectedModel(model);
                      setShowPreview(true);
                    }}
                  >
                    <Eye className="w-4 h-4 mr-1" />
                    {getText('view', language)}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => togglePublic(model.id, model.is_public)}
                  >
                    {model.is_public ? (
                      <>
                        <Lock className="w-4 h-4 mr-1" />
                        {getText('makePrivate', language)}
                      </>
                    ) : (
                      <>
                        <Globe className="w-4 h-4 mr-1" />
                        {getText('makePublic', language)}
                      </>
                    )}
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => deleteModel(model.id)}
                  >
                    <Trash2 className="w-4 h-4 mr-1" />
                    {getText('delete', language)}
                  </Button>
                </div>
                <div className="mt-2 text-xs text-muted-foreground">
                  {getText('uploaded', language)}: {new Date(model.created_at).toLocaleDateString()}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      
      <ModelPreviewDialog
        model={selectedModel}
        isOpen={showPreview}
        onClose={() => {
          setShowPreview(false);
          setSelectedModel(null);
        }}
      />
    </div>
  );
};