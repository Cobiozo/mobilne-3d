import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useApp } from '@/contexts/AppContext';
import { getText } from '@/lib/i18n';
import { Users, FileText, Shield, Trash2 } from 'lucide-react';

interface User {
  id: string;
  email: string;
  created_at: string;
  display_name: string | null;
  role: 'admin' | 'user';
}

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
  const [users, setUsers] = useState<User[]>([]);
  const [models, setModels] = useState<Model[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const { language } = useApp();

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      
      // Fetch users with their profiles and roles
      const { data: usersData, error: usersError } = await supabase
        .from('profiles')
        .select(`
          user_id,
          display_name
        `);

      // Fetch user roles separately
      const { data: rolesData, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role');

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

      if (usersError || rolesError || modelsError || profilesDataError) {
        toast({
          title: getText('error', language),
          description: 'Failed to load data',
          variant: "destructive",
        });
      }

      if (usersData && rolesData) {
        const formattedUsers = usersData.map(user => {
          const userRole = rolesData.find(role => role.user_id === user.user_id);
          return {
            id: user.user_id,
            email: '', // We don't have direct access to auth.users email
            created_at: new Date().toISOString(),
            display_name: user.display_name,
            role: (userRole?.role || 'user') as 'admin' | 'user'
          };
        });
        setUsers(formattedUsers);
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
  }, [toast, language]);

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

  const toggleUserRole = async (userId: string, currentRole: 'admin' | 'user') => {
    const newRole = currentRole === 'admin' ? 'user' : 'admin';
    
    const { error } = await supabase
      .from('user_roles')
      .update({ role: newRole })
      .eq('user_id', userId);

    if (error) {
      toast({
        title: getText('error', language),
        description: error.message,
        variant: "destructive",
      });
    } else {
      setUsers(users.map(u => 
        u.id === userId ? { ...u, role: newRole } : u
      ));
      toast({
        title: getText('success', language),
        description: getText('userRoleUpdated', language),
      });
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

      <div className="grid gap-6 md:grid-cols-2">
        {/* Users Management */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              {getText('users', language)}
            </CardTitle>
            <CardDescription>
              {getText('manageUserRoles', language)}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {users.map((user) => (
                <div key={user.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">
                      {user.display_name || getText('unnamedUser', language)}
                    </p>
                    <p className="text-sm text-muted-foreground">{user.email}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                      {user.role}
                    </Badge>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => toggleUserRole(user.id, user.role)}
                    >
                      <Shield className="w-4 h-4 mr-1" />
                      {user.role === 'admin' ? getText('removeAdmin', language) : getText('makeAdmin', language)}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

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
    </div>
  );
};