import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MapPin, Search, Package } from 'lucide-react';
import { toast } from 'sonner';

// Mock data for InPost parcel lockers - In production, this would come from InPost API
const MOCK_LOCKERS = [
  { code: 'KRA01M', name: 'Paczkomat KRA01M', address: 'ul. Floriańska 55, 31-019 Kraków', city: 'Kraków', postal_code: '31-019', lat: 50.064650, lng: 19.936180 },
  { code: 'PIE05M', name: 'Paczkomat PIE05M', address: 'ul. Puławska 4, 05-500 Piaseczno', city: 'Piaseczno', postal_code: '05-500', lat: 52.081889, lng: 21.027222 },
  { code: 'PIE12M', name: 'Paczkomat PIE12M', address: 'ul. Warszawska 10, 05-500 Piaseczno', city: 'Piaseczno', postal_code: '05-500', lat: 52.084444, lng: 21.025556 },
  { code: 'WAW123M', name: 'Paczkomat WAW123M', address: 'ul. Marszałkowska 142, 00-061 Warszawa', city: 'Warszawa', postal_code: '00-061', lat: 52.228833, lng: 21.007778 },
  { code: 'WAW234M', name: 'Paczkomat WAW234M', address: 'ul. Nowy Świat 64, 00-363 Warszawa', city: 'Warszawa', postal_code: '00-363', lat: 52.232222, lng: 21.017778 },
  { code: 'GDA10M', name: 'Paczkomat GDA10M', address: 'ul. Długa 81, 80-831 Gdańsk', city: 'Gdańsk', postal_code: '80-831', lat: 54.349722, lng: 18.653611 },
  { code: 'GDA22M', name: 'Paczkomat GDA22M', address: 'ul. Grunwaldzka 82, 80-244 Gdańsk', city: 'Gdańsk', postal_code: '80-244', lat: 54.372222, lng: 18.613333 },
  { code: 'POZ45M', name: 'Paczkomat POZ45M', address: 'Stary Rynek 78, 61-772 Poznań', city: 'Poznań', postal_code: '61-772', lat: 52.408333, lng: 16.933889 },
  { code: 'POZ67M', name: 'Paczkomat POZ67M', address: 'ul. Święty Marcin 29, 61-806 Poznań', city: 'Poznań', postal_code: '61-806', lat: 52.406667, lng: 16.928889 },
  { code: 'WRO88M', name: 'Paczkomat WRO88M', address: 'Rynek 50, 50-106 Wrocław', city: 'Wrocław', postal_code: '50-106', lat: 51.110000, lng: 17.033333 },
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
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredLockers, setFilteredLockers] = useState<ParcelLocker[]>(MOCK_LOCKERS);

  // Filter lockers based on search query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredLockers(MOCK_LOCKERS);
      return;
    }

    const query = searchQuery.toLowerCase().trim();
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

  // Sort lockers by proximity to user's city if available
  useEffect(() => {
    if (userCity) {
      const userCityLower = userCity.toLowerCase();
      const sorted = [...filteredLockers].sort((a, b) => {
        const aMatch = a.city.toLowerCase() === userCityLower;
        const bMatch = b.city.toLowerCase() === userCityLower;
        if (aMatch && !bMatch) return -1;
        if (!aMatch && bMatch) return 1;
        return 0;
      });
      setFilteredLockers(sorted);
    }
  }, [userCity]);

  const handleLockerSelect = (locker: ParcelLocker) => {
    onLockerSelect(locker);
    toast.success(`Wybrano paczkomat: ${locker.name}`);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package className="w-5 h-5" />
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
          {searchQuery && (
            <p className="text-xs text-muted-foreground mt-1">
              Znaleziono: {filteredLockers.length} {filteredLockers.length === 1 ? 'paczkomat' : 'paczkomatów'}
            </p>
          )}
        </div>

        {/* Selected locker display */}
        {selectedLocker && (
          <div className="p-4 bg-primary/10 border border-primary/20 rounded-lg">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="font-semibold text-primary">{selectedLocker.name}</p>
                <p className="text-sm">{selectedLocker.address}</p>
                <p className="text-sm text-muted-foreground">
                  {selectedLocker.postal_code} {selectedLocker.city}
                </p>
              </div>
              <MapPin className="w-5 h-5 text-primary flex-shrink-0 mt-1" />
            </div>
          </div>
        )}

        {/* InPost Map Widget - iframe version */}
        <div className="border rounded-lg overflow-hidden">
          <iframe
            src={`https://geowidget.inpost.pl/?${new URLSearchParams({
              search_type: 'osm',
              map_type: 'osm',
              language: 'pl',
              ...(selectedLocker && { point: selectedLocker.code }),
              ...(userPostalCode && { post_code: userPostalCode })
            })}`}
            width="100%"
            height="500"
            className="border-0"
            title="Mapa paczkomatów InPost"
            loading="lazy"
          />
        </div>

        {/* Locker list */}
        <div className="space-y-2">
          <Label>Najbliższe paczkomaty:</Label>
          <div className="max-h-96 overflow-y-auto space-y-2 border rounded-lg p-2">
            {filteredLockers.length === 0 ? (
              <div className="text-center py-8">
                <Package className="w-12 h-12 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">
                  Nie znaleziono paczkomatów dla "{searchQuery}"
                </p>
                <Button
                  variant="link"
                  size="sm"
                  onClick={() => setSearchQuery('')}
                  className="mt-2"
                >
                  Wyczyść wyszukiwanie
                </Button>
              </div>
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
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <p className="font-semibold">{locker.name}</p>
                      <p className="text-sm opacity-90">{locker.address}</p>
                      <p className="text-xs opacity-75">
                        {locker.postal_code} {locker.city}
                      </p>
                    </div>
                    {selectedLocker?.code === locker.code && (
                      <MapPin className="w-4 h-4 flex-shrink-0 mt-1" />
                    )}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        <p className="text-xs text-muted-foreground">
          💡 Wybierz paczkomat z listy lub kliknij na mapie
        </p>
      </CardContent>
    </Card>
  );
};
