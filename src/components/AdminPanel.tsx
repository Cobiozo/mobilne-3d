import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useApp } from '@/contexts/AppContext';
import { getText } from '@/lib/i18n';
import { FileText, Trash2 } from 'lucide-react';
import { UsersManagement } from '@/components/UsersManagement';
import { ColorsManagement } from '@/components/ColorsManagement';
import PaymentMethodsManagement from '@/components/PaymentMethodsManagement';
import { PriceCoefficientManagement } from '@/components/PriceCoefficientManagement';


interface Model {
  id: string;
  name: string;
  user_id: string;
  is_public: boolean;
  created_at: string;
  profiles: {
    display_name: string | null;
  } | null;
}

export const AdminPanel = () => {
  const [models, setModels] = useState<Model[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { language } = useApp();

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      
      // Fetch all models with user info
      const { data: modelsData, error: modelsError } = await supabase
        .from('models')
        .select(`
          id,
          name,
          user_id,
          is_public,
          created_at
        `)
        .order('created_at', { ascending: false });

      // Fetch profiles for models
      const { data: profilesData, error: profilesDataError } = await supabase
        .from('profiles')
        .select('user_id, display_name');

      if (modelsError || profilesDataError) {
        toast.error('Błąd ładowania danych');
      }

      if (modelsData && profilesData) {
        const formattedModels = modelsData.map(model => {
          const userProfile = profilesData.find(profile => profile.user_id === model.user_id);
          return {
            ...model,
            profiles: userProfile ? { display_name: userProfile.display_name } : null
          };
        });
        setModels(formattedModels);
      }

      setIsLoading(false);
    };

    fetchData();
  }, []);

  const deleteModel = async (modelId: string) => {
    const { error } = await supabase
      .from('models')
      .delete()
      .eq('id', modelId);

    if (error) {
      toast.error(error.message);
    } else {
      setModels(models.filter(m => m.id !== modelId));
      toast.success('Model został usunięty');
    }
  };

  if (isLoading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">{getText('adminPanel', language)}</h2>
        <p className="text-muted-foreground">
          {getText('manageUsersAndContent', language)}
        </p>
      </div>

      <UsersManagement />

      {/* Colors Management */}
      <ColorsManagement />

      {/* Payment Methods Management */}
      <PaymentMethodsManagement />

      {/* Price Coefficient Management */}
      <PriceCoefficientManagement />

      {/* Models Management */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            {getText('allModels', language)}
          </CardTitle>
          <CardDescription>
            {getText('manageAllUploaded3DModels', language)}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {models.slice(0, 5).map((model) => (
              <div key={model.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <p className="font-medium">{model.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {getText('by', language)} {model.profiles?.display_name || getText('unnamedUser', language)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={model.is_public ? 'default' : 'secondary'}>
                    {model.is_public ? getText('public', language) : getText('private', language)}
                  </Badge>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => deleteModel(model.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
            {models.length > 5 && (
              <p className="text-sm text-muted-foreground text-center pt-2">
                {getText('andMore', language).replace('{count}', (models.length - 5).toString())}
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};