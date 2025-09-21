import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { useAuth } from '@/hooks/useAuth';
import { useApp } from '@/contexts/AppContext';
import { getText } from '@/lib/i18n';
import { supabase } from '@/integrations/supabase/client';
import { UserProfile } from '@/components/UserProfile';
import { ModelLibrary } from '@/components/ModelLibrary';
import { AdminSidebar } from '@/components/AdminSidebar';
import { CustomersManagement } from '@/components/CustomersManagement';
import { OrdersManagement } from '@/components/OrdersManagement';
import { SiteCustomization } from '@/components/SiteCustomization';
import { AdminOverview } from '@/components/AdminOverview';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { User, LogOut, Upload, Settings, Home } from 'lucide-react';

const Dashboard = () => {
  const { user, loading, signOut } = useAuth();
  const { language } = useApp();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [userRole, setUserRole] = useState<'admin' | 'user'>('user');
  const [isLoadingRole, setIsLoadingRole] = useState(true);
  const [currentTab, setCurrentTab] = useState(searchParams.get('tab') || 'overview');

  useEffect(() => {
    if (!user && !loading) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab) {
      setCurrentTab(tab);
    }
  }, [searchParams]);

  useEffect(() => {
    const fetchUserRole = async () => {
      if (user) {
        console.log('Fetching role for user:', user.email);
        const { data, error } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .single();

        console.log('Role data:', data, 'Error:', error);
        if (data && !error) {
          console.log('Setting user role to:', data.role);
          setUserRole(data.role);
        } else {
          console.log('No role found, defaulting to user');
          setUserRole('user');
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

  const handleTabChange = (tab: string) => {
    setCurrentTab(tab);
    navigate(`/dashboard?tab=${tab}`, { replace: true });
  };

  const renderTabContent = () => {
    if (userRole !== 'admin') {
      // Regular user dashboard
      switch (currentTab) {
        case 'profile':
          return <UserProfile user={user} />;
        case 'models':
          return <ModelLibrary userId={user.id} />;
        default:
          return <UserProfile user={user} />;
      }
    }

    // Admin dashboard
    switch (currentTab) {
      case 'overview':
        return <AdminOverview />;
      case 'customers':
        return <CustomersManagement />;
      case 'orders':
        return <OrdersManagement />;
      case 'models':
        return <ModelLibrary userId={user.id} />;
      case 'customization':
        return <SiteCustomization />;
      case 'site-settings':
        return <SiteCustomization />;
      case 'profile':
        return <UserProfile user={user} />;
      case 'settings':
        return (
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
        );
      default:
        return <AdminOverview />;
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  if (userRole === 'admin') {
    console.log('Rendering admin dashboard for user:', user.email);
    return (
      <SidebarProvider>
        <div className="min-h-screen flex w-full">
          <AdminSidebar currentTab={currentTab} onTabChange={handleTabChange} />
          
          <div className="flex-1 flex flex-col">
            {/* Header */}
            <header className="border-b bg-card/50 backdrop-blur-sm">
              <div className="flex items-center justify-between px-6 py-4">
                <div className="flex items-center gap-4">
                  <SidebarTrigger />
                  <div>
                    <h1 className="text-xl font-bold">
                      {getText('dashboard', language)}
                    </h1>
                    <Badge variant="secondary">Admin</Badge>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    onClick={() => navigate('/')}
                  >
                    <Home className="w-4 h-4 mr-2" />
                    Strona główna
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

            {/* Main Content */}
            <main className="flex-1 p-6">
              {renderTabContent()}
            </main>
          </div>
        </div>
      </SidebarProvider>
    );
  }

  // Regular user dashboard (non-admin)
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold">
              {getText('dashboard', language)}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => navigate('/')}
            >
              <Home className="w-4 h-4 mr-2" />
              Strona główna
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
        <div className="grid w-full grid-cols-2 mb-6">
          <Button
            variant={currentTab === 'profile' ? 'default' : 'outline'}
            onClick={() => handleTabChange('profile')}
          >
            <User className="w-4 h-4 mr-2" />
            {getText('profile', language)}
          </Button>
          <Button
            variant={currentTab === 'models' ? 'default' : 'outline'}
            onClick={() => handleTabChange('models')}
          >
            {getText('myModels', language)}
          </Button>
        </div>
        
        {renderTabContent()}
      </main>
    </div>
  );
};

export default Dashboard;