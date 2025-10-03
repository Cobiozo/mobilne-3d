import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MapPin, Search, Loader2 } from 'lucide-react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { toast } from 'sonner';

// Mock data for InPost parcel lockers - In production, this would come from InPost API
const MOCK_LOCKERS = [
  { code: 'KRA01M', name: 'Paczkomat KRA01M', address: 'ul. Floriańska 55, 31-019 Kraków', city: 'Kraków', postal_code: '31-019', lat: 50.064650, lng: 19.936180 },
  { code: 'PIE05M', name: 'Paczkomat PIE05M', address: 'ul. Puławska 4, 05-500 Piaseczno', city: 'Piaseczno', postal_code: '05-500', lat: 52.081889, lng: 21.027222 },
  { code: 'WAW123M', name: 'Paczkomat WAW123M', address: 'ul. Marszałkowska 142, 00-061 Warszawa', city: 'Warszawa', postal_code: '00-061', lat: 52.228833, lng: 21.007778 },
  { code: 'GDA10M', name: 'Paczkomat GDA10M', address: 'ul. Długa 81, 80-831 Gdańsk', city: 'Gdańsk', postal_code: '80-831', lat: 54.349722, lng: 18.653611 },
  { code: 'POZ45M', name: 'Paczkomat POZ45M', address: 'Stary Rynek 78, 61-772 Poznań', city: 'Poznań', postal_code: '61-772', lat: 52.408333, lng: 16.933889 },
];

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

export const ParcelLockerPicker = ({
  userAddress,
  userCity,
  userPostalCode,
  onLockerSelect,
  selectedLocker
}: ParcelLockerPickerProps) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markers = useRef<mapboxgl.Marker[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredLockers, setFilteredLockers] = useState<ParcelLocker[]>(MOCK_LOCKERS);
  const [isLoading, setIsLoading] = useState(false);

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    // Note: Users need to add their own Mapbox token
    // For production, this should be stored in Supabase secrets
    mapboxgl.accessToken = 'pk.eyJ1IjoibG92YWJsZSIsImEiOiJjbTg1eDR0bGEwM3djMm1zYWQ3ZnJ4ZGYzIn0.example'; 

    // Find closest locker to user's address (default to Piaseczno for now)
    const defaultLat = 52.081889;
    const defaultLng = 21.027222;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [defaultLng, defaultLat],
      zoom: 12,
    });

    // Add navigation controls
    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

    // Add markers for all lockers
    MOCK_LOCKERS.forEach((locker) => {
      const el = document.createElement('div');
      el.className = 'cursor-pointer';
      el.innerHTML = `
        <div class="bg-primary text-primary-foreground w-8 h-8 rounded-full flex items-center justify-center shadow-lg hover:scale-110 transition-transform">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>
        </div>
      `;
      
      const marker = new mapboxgl.Marker(el)
        .setLngLat([locker.lng, locker.lat])
        .setPopup(
          new mapboxgl.Popup({ offset: 25 })
            .setHTML(`
              <div class="p-2">
                <p class="font-semibold">${locker.name}</p>
                <p class="text-sm text-muted-foreground">${locker.address}</p>
              </div>
            `)
        )
        .addTo(map.current!);

      el.addEventListener('click', () => {
        handleLockerSelect(locker);
      });

      markers.current.push(marker);
    });

    return () => {
      markers.current.forEach(marker => marker.remove());
      markers.current = [];
      map.current?.remove();
      map.current = null;
    };
  }, []);

  // Update map when selected locker changes
  useEffect(() => {
    if (map.current && selectedLocker) {
      map.current.flyTo({
        center: [selectedLocker.lng, selectedLocker.lat],
        zoom: 15,
        duration: 1000
      });
    }
  }, [selectedLocker]);

  // Filter lockers based on search
  useEffect(() => {
    const query = searchQuery.toLowerCase();
    const filtered = MOCK_LOCKERS.filter(
      locker =>
        locker.code.toLowerCase().includes(query) ||
        locker.name.toLowerCase().includes(query) ||
        locker.address.toLowerCase().includes(query) ||
        locker.city.toLowerCase().includes(query) ||
        locker.postal_code.includes(query)
    );
    setFilteredLockers(filtered);
  }, [searchQuery]);

  const handleLockerSelect = (locker: ParcelLocker) => {
    onLockerSelect(locker);
    toast.success(`Wybrano paczkomat: ${locker.name}`);
  };

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
              placeholder="Kod, adres lub miasto..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        {/* Selected locker display */}
        {selectedLocker && (
          <div className="p-4 bg-primary/10 border border-primary/20 rounded-lg">
            <p className="font-semibold text-primary">{selectedLocker.name}</p>
            <p className="text-sm">{selectedLocker.address}</p>
            <p className="text-sm text-muted-foreground">
              {selectedLocker.postal_code} {selectedLocker.city}
            </p>
          </div>
        )}

        {/* Map */}
        <div ref={mapContainer} className="w-full h-96 rounded-lg border" />

        {/* Locker list */}
        <div className="max-h-64 overflow-y-auto space-y-2 border rounded-lg p-2">
          {filteredLockers.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Nie znaleziono paczkomatów
            </p>
          ) : (
            filteredLockers.map((locker) => (
              <button
                key={locker.code}
                onClick={() => handleLockerSelect(locker)}
                className={`w-full text-left p-3 rounded-lg transition-colors ${
                  selectedLocker?.code === locker.code
                    ? 'bg-primary text-primary-foreground'
                    : 'hover:bg-muted'
                }`}
              >
                <p className="font-semibold">{locker.name}</p>
                <p className="text-sm opacity-90">{locker.address}</p>
                <p className="text-xs opacity-75">
                  {locker.postal_code} {locker.city}
                </p>
              </button>
            ))
          )}
        </div>

        <p className="text-xs text-muted-foreground">
          💡 Kliknij marker na mapie lub wybierz z listy aby wybrać paczkomat
        </p>
      </CardContent>
    </Card>
  );
};
