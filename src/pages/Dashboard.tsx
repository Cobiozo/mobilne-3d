import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { useAuth } from '@/hooks/useAuth';
import { useApp } from '@/contexts/AppContext';
import { getText } from '@/lib/i18n';
import { supabase } from '@/integrations/supabase/client';
import { UserProfile } from '@/components/UserProfile';
import { ModelLibrary } from '@/components/ModelLibrary';
import { AdminPanel } from '@/components/AdminPanel';
import { User, LogOut, Upload, Settings } from 'lucide-react';

interface UserRole {
  role: 'admin' | 'user';
}

const Dashboard = () => {
  const { user, loading, signOut } = useAuth();
  const { language } = useApp();
  const navigate = useNavigate();
  const [userRole, setUserRole] = useState<'admin' | 'user'>('user');
  const [isLoadingRole, setIsLoadingRole] = useState(true);

  useEffect(() => {
    if (!user && !loading) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    const fetchUserRole = async () => {
      if (user) {
        const { data, error } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .single();

        if (data && !error) {
          setUserRole(data.role);
        }
        setIsLoadingRole(false);
      }
    };

    fetchUserRole();
  }, [user]);

  if (loading || isLoadingRole) {
    return <LoadingSpinner />;
  }

  if (!user) {
    return null;
  }

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold">
              {getText('dashboard', language)}
            </h1>
            {userRole === 'admin' && (
              <Badge variant="secondary">Admin</Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => navigate('/')}
            >
              <Upload className="w-4 h-4 mr-2" />
              {getText('upload3DModel', language)}
            </Button>
            <Button
              variant="ghost"
              onClick={handleSignOut}
            >
              <LogOut className="w-4 h-4 mr-2" />
              {getText('signOut', language)}
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <Tabs defaultValue="profile" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="profile">
              <User className="w-4 h-4 mr-2" />
              {getText('profile', language)}
            </TabsTrigger>
            <TabsTrigger value="models">
              {getText('myModels', language)}
            </TabsTrigger>
            <TabsTrigger value="settings">
              <Settings className="w-4 h-4 mr-2" />
              {getText('settings', language)}
            </TabsTrigger>
            {userRole === 'admin' && (
              <TabsTrigger value="admin">
                {getText('adminPanel', language)}
              </TabsTrigger>
            )}
          </TabsList>
          
          <TabsContent value="profile">
            <UserProfile user={user} />
          </TabsContent>
          
          <TabsContent value="models">
            <ModelLibrary userId={user.id} />
          </TabsContent>
          
          <TabsContent value="settings">
            <Card>
              <CardHeader>
                <CardTitle>{getText('settings', language)}</CardTitle>
                <CardDescription>
                  {getText('manageAccountSettings', language)}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  {getText('settingsComingSoon', language)}
                </p>
              </CardContent>
            </Card>
          </TabsContent>
          
          {userRole === 'admin' && (
            <TabsContent value="admin">
              <AdminPanel />
            </TabsContent>
          )}
        </Tabs>
      </main>
    </div>
  );
};

export default Dashboard;