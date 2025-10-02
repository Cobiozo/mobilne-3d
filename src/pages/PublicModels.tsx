import { PublicModels as PublicModelsComponent } from '@/components/PublicModels';
import { Button } from '@/components/ui/button';
import { ShoppingCartComponent, CartItem } from '@/components/ShoppingCart';
import { LanguageSelector } from '@/components/LanguageSelector';
import { ThemeSelector } from '@/components/ThemeSelector';
import { LanguageThemeSelector } from '@/components/LanguageThemeSelector';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { User, LogIn, Layers3, ArrowLeft } from 'lucide-react';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';

const PublicModelsPage = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [cartItems, setCartItems] = useState<CartItem[]>([]);

  // Load cart from localStorage on mount
  useEffect(() => {
    const loadCart = () => {
      const savedCart = localStorage.getItem('cartItems');
      if (savedCart) {
        try {
          const items = JSON.parse(savedCart);
          setCartItems(items);
        } catch (error) {
          console.error('Error loading cart from localStorage:', error);
          localStorage.removeItem('cartItems');
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

  const handleUpdateCartQuantity = (id: string, quantity: number) => {
    if (quantity <= 0) {
      handleRemoveFromCart(id);
      return;
    }

    const updatedItems = cartItems.map(item =>
      item.id === id ? { ...item, quantity } : item
    );
    
    setCartItems(updatedItems);
    localStorage.setItem('cartItems', JSON.stringify(updatedItems));
    window.dispatchEvent(new CustomEvent('cartUpdated', { 
      detail: { cartItems: updatedItems } 
    }));
  };

  const handleRemoveFromCart = (id: string) => {
    const item = cartItems.find(item => item.id === id);
    if (item) {
      toast.success(`Usunięto "${item.name}" z koszyka`);
    }
    
    const updatedItems = cartItems.filter(item => item.id !== id);
    setCartItems(updatedItems);
    localStorage.setItem('cartItems', JSON.stringify(updatedItems));
    window.dispatchEvent(new CustomEvent('cartUpdated', { 
      detail: { cartItems: updatedItems } 
    }));
  };

  const handleClearCart = () => {
    setCartItems([]);
    localStorage.removeItem('cartItems');
    window.dispatchEvent(new CustomEvent('cartUpdated', { 
      detail: { cartItems: [] } 
    }));
    toast.success('Wyczyszczono koszyk');
  };

  return (
    <div className="min-h-screen bg-gradient-secondary">
      {/* Header */}
      <header className="border-b border-border/50 bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 sm:gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/')}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                <span className="hidden sm:inline">Powrót</span>
              </Button>
              <div className="p-1.5 sm:p-2 rounded-lg bg-gradient-primary">
                <Layers3 className="w-5 h-5 sm:w-6 sm:h-6 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-lg sm:text-xl lg:text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                  Publiczne Modele 3D
                </h1>
              </div>
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              {/* Shopping Cart */}
              <ShoppingCartComponent
                items={cartItems}
                onUpdateQuantity={handleUpdateCartQuantity}
                onRemoveItem={handleRemoveFromCart}
                onClearCart={handleClearCart}
              />
              
              {/* Authentication */}
              {!loading && (
                <div className="flex items-center gap-2">
                  {user ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => navigate('/dashboard')}
                      className="flex items-center gap-2"
                    >
                      <User className="w-4 h-4" />
                      <span className="hidden sm:inline">Dashboard</span>
                    </Button>
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => navigate('/auth')}
                      className="flex items-center gap-2"
                    >
                      <LogIn className="w-4 h-4" />
                      <span className="hidden sm:inline">Zaloguj się</span>
                    </Button>
                  )}
                </div>
              )}
              
              {/* Theme/Language selectors */}
              <div className="flex gap-1 sm:gap-2">
                {/* Mobile: Separate buttons */}
                <div className="flex gap-1 sm:gap-2 lg:hidden">
                  <LanguageSelector />
                  <ThemeSelector />
                </div>
                {/* Desktop: Combined selector */}
                <div className="hidden lg:block">
                  <LanguageThemeSelector />
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="mb-6">
          <p className="text-muted-foreground">
            Przeglądaj dostępne modele 3D, personalizuj kolory i dodawaj do koszyka
          </p>
        </div>
        
        <PublicModelsComponent />
      </main>
    </div>
  );
};

export default PublicModelsPage;
