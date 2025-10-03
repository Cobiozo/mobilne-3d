import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { MapPin, Search, Package } from 'lucide-react';
import { toast } from 'sonner';

// Mock data for InPost parcel lockers
const MOCK_LOCKERS = [
  { code: 'KRA01M', name: 'Paczkomat KRA01M', address: 'ul. Floriańska 55', city: 'Kraków', postal_code: '31-019' },
  { code: 'KRA12M', name: 'Paczkomat KRA12M', address: 'ul. Dietla 68', city: 'Kraków', postal_code: '31-054' },
  { code: 'PIE05M', name: 'Paczkomat PIE05M', address: 'ul. Puławska 4', city: 'Piaseczno', postal_code: '05-500' },
  { code: 'PIE12M', name: 'Paczkomat PIE12M', address: 'ul. Warszawska 10', city: 'Piaseczno', postal_code: '05-500' },
  { code: 'PIE23M', name: 'Paczkomat PIE23M', address: 'ul. Kilińskiego 1', city: 'Piaseczno', postal_code: '05-500' },
  { code: 'WAW123M', name: 'Paczkomat WAW123M', address: 'ul. Marszałkowska 142', city: 'Warszawa', postal_code: '00-061' },
  { code: 'WAW234M', name: 'Paczkomat WAW234M', address: 'ul. Nowy Świat 64', city: 'Warszawa', postal_code: '00-363' },
  { code: 'WAW345M', name: 'Paczkomat WAW345M', address: 'ul. Puławska 2', city: 'Warszawa', postal_code: '02-566' },
  { code: 'GDA10M', name: 'Paczkomat GDA10M', address: 'ul. Długa 81', city: 'Gdańsk', postal_code: '80-831' },
  { code: 'GDA22M', name: 'Paczkomat GDA22M', address: 'ul. Grunwaldzka 82', city: 'Gdańsk', postal_code: '80-244' },
  { code: 'POZ45M', name: 'Paczkomat POZ45M', address: 'Stary Rynek 78', city: 'Poznań', postal_code: '61-772' },
  { code: 'POZ67M', name: 'Paczkomat POZ67M', address: 'ul. Święty Marcin 29', city: 'Poznań', postal_code: '61-806' },
  { code: 'WRO88M', name: 'Paczkomat WRO88M', address: 'Rynek 50', city: 'Wrocław', postal_code: '50-106' },
  { code: 'WRO99M', name: 'Paczkomat WRO99M', address: 'ul. Świdnicka 40', city: 'Wrocław', postal_code: '50-028' },
];

interface ParcelLocker {
  code: string;
  name: string;
  address: string;
  city: string;
  postal_code: string;
}

interface ParcelLockerPickerProps {
  userAddress?: string;
  userCity?: string;
  userPostalCode?: string;
  onLockerSelect: (locker: ParcelLocker & { lat: number; lng: number }) => void;
  selectedLocker?: (ParcelLocker & { lat: number; lng: number }) | null;
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

  // Smart filtering and sorting based on search query
  useEffect(() => {
    if (!searchQuery.trim()) {
      // If no search, prioritize user's city
      if (userCity) {
        const userCityLower = userCity.toLowerCase();
        const sorted = [...MOCK_LOCKERS].sort((a, b) => {
          const aMatch = a.city.toLowerCase() === userCityLower;
          const bMatch = b.city.toLowerCase() === userCityLower;
          if (aMatch && !bMatch) return -1;
          if (!aMatch && bMatch) return 1;
          return 0;
        });
        setFilteredLockers(sorted);
      } else {
        setFilteredLockers(MOCK_LOCKERS);
      }
      return;
    }

    const query = searchQuery.toLowerCase().trim();
    
    // Filter and rank lockers
    const scored = MOCK_LOCKERS.map(locker => {
      let score = 0;
      const lockerCode = locker.code.toLowerCase();
      const lockerCity = locker.city.toLowerCase();
      const lockerPostal = locker.postal_code.toLowerCase();
      const lockerAddress = locker.address.toLowerCase();

      // Exact code match - highest priority
      if (lockerCode === query) {
        score += 1000;
      } else if (lockerCode.includes(query)) {
        score += 500;
      }

      // City match - high priority
      if (lockerCity === query) {
        score += 200;
      } else if (lockerCity.includes(query)) {
        score += 100;
      }

      // Postal code match
      if (lockerPostal.includes(query)) {
        score += 150;
      }

      // Address match
      if (lockerAddress.includes(query)) {
        score += 50;
      }

      return { locker, score };
    });

    // Filter out lockers with no match (score = 0) and sort by score
    const filtered = scored
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .map(item => item.locker);

    setFilteredLockers(filtered);
  }, [searchQuery, userCity]);

  const handleLockerSelect = (locker: ParcelLocker) => {
    // Add mock coordinates (in production these would come from API)
    const lockerWithCoords = {
      ...locker,
      lat: 52.0 + Math.random(),
      lng: 21.0 + Math.random()
    };
    
    onLockerSelect(lockerWithCoords);
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
              placeholder="Wpisz kod paczkomatu, miasto lub kod pocztowy..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex items-center justify-between mt-1">
            <p className="text-xs text-muted-foreground">
              {searchQuery ? (
                <>Znaleziono: {filteredLockers.length} {filteredLockers.length === 1 ? 'paczkomat' : 'paczkomatów'}</>
              ) : (
                <>Pokazuję paczkomaty {userCity ? `w okolicy: ${userCity}` : 'wszystkie'}</>
              )}
            </p>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="text-xs text-primary hover:underline"
              >
                Wyczyść
              </button>
            )}
          </div>
        </div>

        {/* Selected locker display */}
        {selectedLocker && (
          <div className="p-4 bg-primary/10 border border-primary/20 rounded-lg">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="default" className="text-xs">
                    Wybrany
                  </Badge>
                  <p className="font-semibold text-primary">{selectedLocker.name}</p>
                </div>
                <p className="text-sm">{selectedLocker.address}</p>
                <p className="text-sm text-muted-foreground">
                  {selectedLocker.postal_code} {selectedLocker.city}
                </p>
              </div>
              <MapPin className="w-5 h-5 text-primary flex-shrink-0 mt-1" />
            </div>
          </div>
        )}

        {/* Locker list */}
        <div className="space-y-2">
          <Label>
            {searchQuery 
              ? 'Wyniki wyszukiwania:' 
              : userCity 
                ? `Paczkomaty w okolicy (${userCity}):`
                : 'Dostępne paczkomaty:'}
          </Label>
          <div className="max-h-[500px] overflow-y-auto space-y-2 border rounded-lg p-2">
            {filteredLockers.length === 0 ? (
              <div className="text-center py-8">
                <Package className="w-12 h-12 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground mb-1">
                  Nie znaleziono paczkomatów dla: "{searchQuery}"
                </p>
                <p className="text-xs text-muted-foreground">
                  Spróbuj wpisać kod paczkomatu (np. "WAW123M"), miasto lub kod pocztowy
                </p>
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
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-semibold">{locker.code}</p>
                        {!searchQuery && userCity && locker.city.toLowerCase() === userCity.toLowerCase() && (
                          <Badge variant="secondary" className="text-xs">
                            W pobliżu
                          </Badge>
                        )}
                      </div>
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

        <div className="bg-muted/50 p-3 rounded-lg">
          <p className="text-xs text-muted-foreground">
            💡 <strong>Wskazówka:</strong> Możesz wyszukać paczkomat wpisując:
          </p>
          <ul className="text-xs text-muted-foreground mt-1 ml-4 space-y-0.5">
            <li>• Kod paczkomatu (np. "PIE05M")</li>
            <li>• Nazwę miasta (np. "Piaseczno")</li>
            <li>• Kod pocztowy (np. "05-500")</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};
