import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { ShoppingCart, Trash2, Plus, Minus } from "lucide-react";
import { toast } from "sonner";
import { useApp } from "@/contexts/AppContext";
import { getText } from "@/lib/i18n";

export interface CartItem {
  id: string;
  name: string;
  color: string;
  quantity: number;
  price?: number;
  image?: string;
  dimensions?: { x: number; y: number; z: number }; // Optional dimensions from model
}

interface ShoppingCartProps {
  items: CartItem[];
  onUpdateQuantity: (id: string, quantity: number) => void;
  onRemoveItem: (id: string) => void;
  onClearCart: () => void;
  calculateItemPrice?: (item: CartItem) => number; // Optional price calculator
}

export const ShoppingCartComponent = ({ items, onUpdateQuantity, onRemoveItem, onClearCart, calculateItemPrice }: ShoppingCartProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();
  const { language } = useApp();
  
  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
  
  // Use dynamic price calculation if provided, otherwise fall back to item.price
  const getItemPrice = (item: CartItem) => {
    if (calculateItemPrice) {
      return calculateItemPrice(item);
    }
    return (item.price || 0) * item.quantity;
  };
  
  const totalPrice = items.reduce((sum, item) => sum + getItemPrice(item), 0);

  const getColorName = (color: string) => {
    const colorNames: { [key: string]: { pl: string; en: string } } = {
      '#FFFFFF': { pl: 'Biały', en: 'White' },
      '#000000': { pl: 'Czarny', en: 'Black' },
      '#FF0000': { pl: 'Czerwony', en: 'Red' },
      '#00FF00': { pl: 'Zielony', en: 'Green' },
      '#0000FF': { pl: 'Niebieski', en: 'Blue' },
      '#FFFF00': { pl: 'Żółty', en: 'Yellow' },
      '#FF00FF': { pl: 'Magenta', en: 'Magenta' },
      '#00FFFF': { pl: 'Cyjan', en: 'Cyan' }
    };
    const colorKey = color.toUpperCase();
    if (colorNames[colorKey]) {
      return colorNames[colorKey][language];
    }
    return `${getText('customColor', language)} (${color})`;
  };

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="sm" className="relative" data-cart-trigger>
          <ShoppingCart className="w-4 h-4" />
          {totalItems > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              {totalItems}
            </Badge>
          )}
          <span className="hidden sm:inline ml-2">{getText('cart', language)}</span>
        </Button>
      </SheetTrigger>
      
      <SheetContent className="w-full sm:max-w-lg">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <ShoppingCart className="w-5 h-5" />
            {getText('cart', language)} ({totalItems} {totalItems === 1 ? getText('cartItem', language) : getText('cartItems', language)})
          </SheetTitle>
        </SheetHeader>
        
        <div className="mt-6 space-y-4">
          {items.length === 0 ? (
            <div className="text-center py-8">
              <ShoppingCart className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">{getText('cartEmpty', language)}</p>
              <p className="text-sm text-muted-foreground mt-2">
                {getText('cartEmptyDesc', language)}
              </p>
            </div>
          ) : (
            <>
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {items.map((item) => (
                  <div key={item.id} className="flex items-center gap-3 p-3 border rounded-lg">
                    {item.image ? (
                      <img 
                        src={item.image}
                        alt={item.name}
                        className="w-12 h-12 object-cover rounded border border-border"
                        onError={(e) => {
                          console.error('Failed to load thumbnail for item:', item.name);
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    ) : (
                      <div 
                        className="w-12 h-12 rounded border border-border flex items-center justify-center"
                        style={{ backgroundColor: item.color }}
                      >
                        <span className="text-xs font-semibold" style={{ color: item.color === '#000000' ? '#fff' : '#000' }}>3D</span>
                      </div>
                    )}
                    
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium truncate">{item.name}</h4>
                      <p className="text-sm text-muted-foreground">
                        {getColorName(item.color)}
                      </p>
                      {calculateItemPrice ? (
                        <>
                          <p className="text-sm font-medium">
                            {(getItemPrice(item) / item.quantity).toFixed(2)} zł
                            {item.quantity > 1 && (
                              <span className="text-xs text-muted-foreground"> × {item.quantity}</span>
                            )}
                          </p>
                          <p className="text-sm font-semibold">
                            Razem: {getItemPrice(item).toFixed(2)} zł
                          </p>
                        </>
                      ) : (
                        <p className="text-xs text-muted-foreground italic">
                          Cena zostanie obliczona w checkout
                        </p>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => onUpdateQuantity(item.id, Math.max(0, item.quantity - 1))}
                      >
                        <Minus className="w-3 h-3" />
                      </Button>
                      
                      <span className="w-8 text-center text-sm">{item.quantity}</span>
                      
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
                      >
                        <Plus className="w-3 h-3" />
                      </Button>
                      
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive"
                        onClick={() => onRemoveItem(item.id)}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
              
              <Separator />
              
              <div className="space-y-4">
                {calculateItemPrice && totalPrice > 0 && (
                  <div className="flex justify-between items-center font-medium">
                    <span>{getText('totalPrice', language)}:</span>
                    <span>{totalPrice.toFixed(2)} zł</span>
                  </div>
                )}
                
                {!calculateItemPrice && (
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-sm text-muted-foreground text-center">
                      💡 {getText('priceNote', language)}
                    </p>
                  </div>
                )}
                
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      // Clear localStorage directly
                      localStorage.removeItem('cartItems');
                      
                      // Notify parent component
                      onClearCart();
                      
                      // Dispatch event to sync across all components
                      window.dispatchEvent(new CustomEvent('cartUpdated', { 
                        detail: { cartItems: [] } 
                      }));
                      
                      toast.success(language === 'pl' ? 'Koszyk został wyczyszczony' : 'Cart has been cleared');
                    }}
                  >
                    {getText('clearCart', language)}
                  </Button>
                  <Button 
                    className="flex-1"
                    onClick={() => {
                      if (items.length === 0) {
                        toast.error(getText('cartEmpty', language));
                        return;
                      }
                      // Cart is already saved to localStorage by parent component
                      console.log('Navigating to checkout with items:', items);
                      // Navigate to checkout
                      navigate('/checkout');
                      setIsOpen(false);
                    }}
                  >
                    {getText('proceedToPayment', language)}
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};