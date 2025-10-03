import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MapPin, Search, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface ParcelLocker {
  code: string;
  name: string;
  address: string;
  city: string;
  postal_code: string;
  lat: number;
  lng: number;
}

interface ParcelLockerPickerProps {
  userAddress?: string;
  userCity?: string;
  userPostalCode?: string;
  onLockerSelect: (locker: ParcelLocker) => void;
  selectedLocker?: ParcelLocker | null;
}

// Type for InPost Geowidget
declare global {
  interface Window {
    easyPackAsyncInit?: () => void;
    easyPack?: {
      mapWidget: (containerId: string, callback: (point: any) => void, config?: any) => void;
    };
  }
}

export const ParcelLockerPicker = ({
  userAddress,
  userCity,
  userPostalCode,
  onLockerSelect,
  selectedLocker
}: ParcelLockerPickerProps) => {
  const widgetContainer = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const widgetInitialized = useRef(false);

  useEffect(() => {
    // Load InPost Geowidget script
    if (!document.getElementById('inpost-geowidget-script')) {
      const script = document.createElement('script');
      script.id = 'inpost-geowidget-script';
      script.src = 'https://geowidget.easypack24.net/js/sdk-for-javascript.js';
      script.async = true;
      
      script.onload = () => {
        initializeWidget();
      };
      
      document.body.appendChild(script);
    } else {
      initializeWidget();
    }

    return () => {
      // Cleanup
      widgetInitialized.current = false;
    };
  }, []);

  const initializeWidget = () => {
    if (widgetInitialized.current || !widgetContainer.current) return;

    const initWidget = () => {
      if (!window.easyPack) {
        setTimeout(initWidget, 100);
        return;
      }

      try {
        widgetInitialized.current = true;
        
        // Initialize the widget with Polish language and configuration
        window.easyPack.mapWidget('inpost-map', (point: any) => {
          if (point && point.name) {
            const locker: ParcelLocker = {
              code: point.name,
              name: `Paczkomat ${point.name}`,
              address: point.address?.line1 || point.location_description || '',
              city: point.address?.line2 || '',
              postal_code: '',
              lat: point.location?.latitude || 0,
              lng: point.location?.longitude || 0
            };
            
            onLockerSelect(locker);
            toast.success(`Wybrano paczkomat: ${locker.name}`);
          }
        }, {
          width: '100%',
          height: '500px',
          language: 'pl',
          searchType: 'osm',
          mapType: 'osm',
          // Set initial position based on user's city/postal code if available
          ...(userPostalCode && { initialPostCode: userPostalCode }),
          points: {
            types: ['parcel_locker']
          }
        });
        
        setIsLoading(false);
      } catch (error) {
        console.error('Error initializing InPost widget:', error);
        toast.error('Błąd podczas ładowania mapy paczkomatów');
        setIsLoading(false);
      }
    };

    initWidget();
  };

  // Filter selected locker display based on search
  const shouldShowSelected = !searchQuery || 
    selectedLocker?.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
    selectedLocker?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    selectedLocker?.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
    selectedLocker?.city.toLowerCase().includes(searchQuery.toLowerCase());

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="w-5 h-5" />
          Wybierz paczkomat InPost
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search */}
        <div>
          <Label htmlFor="locker-search">Wyszukaj paczkomat</Label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              id="locker-search"
              placeholder="Wpisz kod, adres lub miasto i kliknij na mapie..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            💡 Wpisz lokalizację w pole wyszukiwania powyżej, a następnie kliknij wybrany paczkomat na mapie
          </p>
        </div>

        {/* Selected locker display */}
        {selectedLocker && shouldShowSelected && (
          <div className="p-4 bg-primary/10 border border-primary/20 rounded-lg">
            <p className="font-semibold text-primary">{selectedLocker.name}</p>
            <p className="text-sm">{selectedLocker.address}</p>
            {selectedLocker.city && (
              <p className="text-sm text-muted-foreground">{selectedLocker.city}</p>
            )}
          </div>
        )}

        {/* InPost Map Widget Container */}
        <div className="relative">
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10 rounded-lg">
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Ładowanie mapy paczkomatów...</p>
              </div>
            </div>
          )}
          <div 
            ref={widgetContainer}
            id="inpost-map" 
            className="w-full rounded-lg border overflow-hidden"
            style={{ minHeight: '500px' }}
          />
        </div>

        <p className="text-xs text-muted-foreground">
          💡 Kliknij marker na mapie aby wybrać paczkomat
        </p>
      </CardContent>
    </Card>
  );
};
