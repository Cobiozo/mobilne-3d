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
import { UserWallet } from '@/components/UserWallet';
import { AdminSidebar } from '@/components/AdminSidebar';
import { CustomersManagement } from '@/components/CustomersManagement';
import { OrdersManagement } from '@/components/OrdersManagement';
import { SiteSettings } from '@/components/SiteSettings';
import { SitePersonalization } from '@/components/SitePersonalization';
import { AdminOverview } from '@/components/AdminOverview';
import { EmailSettings } from '@/components/EmailSettings';
import { EmailTemplates } from '@/components/EmailTemplates';
import { EmailLogs } from '@/components/EmailLogs';
import { OrderHistory } from '@/components/OrderHistory';
import { ShippingAddresses } from '@/components/ShippingAddresses';
import { ChangePassword } from '@/components/ChangePassword';
import { ShoppingCartComponent, CartItem } from '@/components/ShoppingCart';
import { NotesManagement } from '@/components/NotesManagement';
import { NotificationsManagement } from '@/components/NotificationsManagement';
import { SecuritySettings } from '@/components/SecuritySettings';
import { ColorsManagement } from '@/components/ColorsManagement';
import PaymentMethodsManagement from '@/components/PaymentMethodsManagement';
import { MonetizationManagement } from '@/components/MonetizationManagement';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { User, LogOut, Upload, Settings, Home, Package, MapPin, Lock } from 'lucide-react';

const Dashboard = () => {
  const { user, loading, signOut } = useAuth();
  const { language } = useApp();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [userRole, setUserRole] = useState<'admin' | 'user'>('user');
  const [isLoadingRole, setIsLoadingRole] = useState(true);
  const [currentTab, setCurrentTab] = useState(searchParams.get('tab') || 'overview');
  const [cartItems, setCartItems] = useState<CartItem[]>([]);

  // Load cart from localStorage
  useEffect(() => {
    const loadCart = () => {
      const savedCart = localStorage.getItem('cartItems');
      if (savedCart) {
        try {
          const items = JSON.parse(savedCart);
          setCartItems(items);
        } catch (error) {
          console.error('Error loading cart:', error);
        }
      }
    };

    loadCart();

    // Listen for cart updates from other components
    const handleCartUpdate = (event: CustomEvent) => {
      if (event.detail?.cartItems) {
        setCartItems(event.detail.cartItems);
      } else {
        loadCart();
      }
    };

    window.addEventListener('cartUpdated', handleCartUpdate as EventListener);
    
    return () => {
      window.removeEventListener('cartUpdated', handleCartUpdate as EventListener);
    };
  }, []);

  // Save cart to localStorage whenever it changes
  useEffect(() => {
    if (cartItems.length > 0) {
      localStorage.setItem('cartItems', JSON.stringify(cartItems));
      // Notify other components about the change
      window.dispatchEvent(new CustomEvent('cartUpdated', { 
        detail: { cartItems } 
      }));
    }
    // Don't remove from localStorage when empty - only when explicitly cleared
  }, [cartItems]);

  const handleUpdateQuantity = (id: string, quantity: number) => {
    if (quantity === 0) {
      setCartItems(cartItems.filter(item => item.id !== id));
    } else {
      setCartItems(cartItems.map(item => 
        item.id === id ? { ...item, quantity } : item
      ));
    }
  };

  const handleRemoveItem = (id: string) => {
    setCartItems(cartItems.filter(item => item.id !== id));
  };

  const handleClearCart = () => {
    setCartItems([]);
  };

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
        const { data, error } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .single();

        if (data && !error) {
          setUserRole(data.role);
        } else {
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
          return (
            <div className="space-y-6">
              <UserWallet userId={user.id} />
              <UserProfile user={user} />
            </div>
          );
        case 'orders':
          return <OrderHistory />;
        case 'addresses':
          return <ShippingAddresses />;
        case 'password':
          return <ChangePassword />;
        case 'models':
          return <ModelLibrary userId={user.id} />;
        default:
          return (
            <div className="space-y-6">
              <UserWallet userId={user.id} />
              <UserProfile user={user} />
            </div>
          );
      }
    }

  // Admin dashboard
    switch (currentTab) {
      case 'overview':
        return <AdminOverview onTabChange={handleTabChange} />;
      case 'customers':
        return <CustomersManagement />;
      case 'orders':
        return <OrdersManagement />;
      case 'models':
        return <ModelLibrary userId={user.id} />;
      case 'colors':
        return <ColorsManagement />;
      case 'payment-methods':
        return <PaymentMethodsManagement />;
      case 'notes':
        return <NotesManagement />;
      case 'notifications':
        return <NotificationsManagement />;
      case 'security':
        return <SecuritySettings />;
      case 'personalization':
        return <SitePersonalization />;
      case 'site-settings':
        return <SiteSettings />;
      case 'email-settings':
        return <EmailSettings />;
      case 'email-templates':
        return <EmailTemplates />;
      case 'email-logs':
        return <EmailLogs />;
      case 'monetization':
        return <MonetizationManagement />;
      case 'profile':
        return (
          <div className="space-y-6">
            <UserWallet userId={user.id} />
            <UserProfile user={user} />
          </div>
        );
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
    return (
      <SidebarProvider>
        <div className="min-h-screen flex w-full bg-background">
          <AdminSidebar currentTab={currentTab} onTabChange={handleTabChange} />
          
          <div className="flex-1 flex flex-col min-w-0">
            {/* Header */}
            <header className="border-b bg-card/50 backdrop-blur-sm px-4 md:px-6">
              <div className="flex items-center justify-between py-4">
                <div className="flex items-center gap-4">
                  <SidebarTrigger />
                  <div className="hidden sm:block">
                    <h1 className="text-xl font-bold">
                      Panel administratora
                    </h1>
                    <Badge variant="secondary" className="hidden sm:inline-flex">Admin</Badge>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <ShoppingCartComponent
                    items={cartItems}
                    onUpdateQuantity={handleUpdateQuantity}
                    onRemoveItem={handleRemoveItem}
                    onClearCart={handleClearCart}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="hidden sm:flex"
                    onClick={() => navigate('/')}
                  >
                    <Home className="w-4 h-4 md:mr-2" />
                    <span className="hidden md:inline">{getText('homePage', language)}</span>
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleSignOut}
                  >
                    <LogOut className="w-4 h-4 md:mr-2" />
                    <span className="hidden md:inline">{getText('signOut', language)}</span>
                  </Button>
                </div>
              </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 p-4 md:p-6 overflow-auto">
              {renderTabContent()}
            </main>
          </div>
        </div>
      </SidebarProvider>
    );
  }

  // Regular user dashboard (non-admin) - Made responsive
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-lg md:text-2xl font-bold">
              Moje konto
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <ShoppingCartComponent
              items={cartItems}
              onUpdateQuantity={handleUpdateQuantity}
              onRemoveItem={handleRemoveItem}
              onClearCart={handleClearCart}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="hidden sm:flex"
              onClick={() => navigate('/')}
            >
              <Home className="w-4 h-4 md:mr-2" />
              <span className="hidden md:inline">{getText('homePage', language)}</span>
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleSignOut}
            >
              <LogOut className="w-4 h-4 md:mr-2" />
              <span className="hidden md:inline">{getText('signOut', language)}</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 md:py-8">
        <div className="grid w-full grid-cols-2 md:grid-cols-5 gap-3 mb-6">
          <Button
            type="button"
            variant={currentTab === 'profile' ? 'default' : 'outline'}
            onClick={() => handleTabChange('profile')}
            className="flex-col h-auto py-3"
          >
            <User className="w-5 h-5 mb-1" />
            <span className="text-xs md:text-sm">{getText('profile', language)}</span>
          </Button>
          <Button
            type="button"
            variant={currentTab === 'orders' ? 'default' : 'outline'}
            onClick={() => handleTabChange('orders')}
            className="flex-col h-auto py-3"
          >
            <Package className="w-5 h-5 mb-1" />
            <span className="text-xs md:text-sm">Zamówienia</span>
          </Button>
          <Button
            type="button"
            variant={currentTab === 'addresses' ? 'default' : 'outline'}
            onClick={() => handleTabChange('addresses')}
            className="flex-col h-auto py-3"
          >
            <MapPin className="w-5 h-5 mb-1" />
            <span className="text-xs md:text-sm">Adresy</span>
          </Button>
          <Button
            type="button"
            variant={currentTab === 'password' ? 'default' : 'outline'}
            onClick={() => handleTabChange('password')}
            className="flex-col h-auto py-3"
          >
            <Lock className="w-5 h-5 mb-1" />
            <span className="text-xs md:text-sm">Hasło</span>
          </Button>
          <Button
            type="button"
            variant={currentTab === 'models' ? 'default' : 'outline'}
            onClick={() => handleTabChange('models')}
            className="flex-col h-auto py-3"
          >
            <Upload className="w-5 h-5 mb-1" />
            <span className="text-xs md:text-sm">{getText('myModels', language)}</span>
          </Button>
        </div>
        
        {renderTabContent()}
      </main>
    </div>
  );
};

export default Dashboard;