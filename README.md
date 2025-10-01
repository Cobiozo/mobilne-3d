# 3D Printing Platform - Aplikacja do druku 3D

## 📋 Spis treści

- [Opis projektu](#opis-projektu)
- [Wymagania systemowe](#wymagania-systemowe)
- [Szybki start](#szybki-start)
- [Konfiguracja](#konfiguracja)
- [Uruchomienie na serwerze produkcyjnym](#uruchomienie-na-serwerze-produkcyjnym)
- [Funkcjonalności](#funkcjonalności)
- [Technologie](#technologie)
- [Zarządzanie projektem](#zarządzanie-projektem)

## 🎯 Opis projektu

Kompleksowa platforma do zarządzania drukiem 3D z panelem administratora, systemem zamówień, zarządzaniem użytkownikami i integracją z systemem email SMTP.

**URL Lovable**: https://lovable.dev/projects/d31e7cd8-97dd-4e53-ba4e-61bfa7731e92

## 💻 Wymagania systemowe

### Minimalne wymagania:

- **Node.js**: v18.0.0 lub nowszy (zalecane v20 LTS)
- **npm**: v9.0.0 lub nowszy
- **RAM**: 2GB (4GB zalecane)
- **Miejsce na dysku**: 500MB

### Instalacja Node.js:

#### Linux/macOS (nvm):
```bash
# Instalacja nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

# Instalacja Node.js LTS
nvm install --lts
nvm use --lts
```

#### Windows:
Pobierz instalator z [nodejs.org](https://nodejs.org/) lub użyj [nvm-windows](https://github.com/coreybutler/nvm-windows)

## 🚀 Szybki start

### 1. Klonowanie repozytorium

```bash
git clone <YOUR_GIT_URL>
cd <YOUR_PROJECT_NAME>
```

### 2. Instalacja zależności

```bash
npm install
```

### 3. Konfiguracja środowiska

Skopiuj plik przykładowy:
```bash
cp .env.example .env
```

### 4. Uruchomienie w trybie deweloperskim

```bash
npm run dev
```

Aplikacja będzie dostępna pod adresem: `http://localhost:8080`

## ⚙️ Konfiguracja

### Konfiguracja Supabase

Aplikacja używa Supabase jako backendu. Wszystkie niezbędne dane są już wkonfigurowane w pliku `src/integrations/supabase/client.ts`.

**Ważne sekrety do skonfigurowania w Supabase Dashboard:**

1. Przejdź do: [Supabase Dashboard](https://supabase.com/dashboard/project/rzupsyhyoztaekcwmels/settings/functions)
2. Dodaj następujące sekrety:
   - `SMTP_PASSWORD` - hasło do serwera SMTP
   - `MESHY_API_KEY` - klucz API do Meshy (jeśli używany)
   - `FAL_AI_API_KEY` - klucz API do FAL AI (jeśli używany)

### Konfiguracja SMTP

Po uruchomieniu aplikacji:

1. Zaloguj się jako administrator
2. Przejdź do: **Panel administratora → Ustawienia Email**
3. Skonfiguruj:
   - Host SMTP (np. `smtp.gmail.com`)
   - Port SMTP (np. `587` dla TLS)
   - Użytkownik SMTP
   - Email nadawcy
   - Nazwa nadawcy
4. W Supabase Dashboard ustaw `SMTP_PASSWORD`
5. Przetestuj połączenie przyciskiem "Testuj połączenie"

### Konfiguracja URL przekierowań (Authentication)

Aby poprawnie działały emaile autoryzacyjne:

1. Przejdź do: [Supabase Auth Settings](https://supabase.com/dashboard/project/rzupsyhyoztaekcwmels/auth/url-configuration)
2. Ustaw:
   - **Site URL**: Twój URL produkcyjny (np. `https://twoja-domena.pl`)
   - **Redirect URLs**: Dodaj wszystkie URL gdzie aplikacja może działać:
     - `http://localhost:8080/*`
     - `https://twoja-domena.pl/*`
     - `https://*.lovableproject.com/*`

## 🏭 Uruchomienie na serwerze produkcyjnym

### Metoda 1: Statyczny hosting (zalecane)

#### Build aplikacji:
```bash
npm run build
```

Polecenie utworzy folder `dist/` z zoptymalizowanymi plikami.

#### Uruchomienie z serwerem HTTP:

##### Opcja A: Używając serve (najprostsze):
```bash
# Instalacja serve globalnie
npm install -g serve

# Uruchomienie serwera
serve -s dist -l 8080
```

##### Opcja B: Używając Node.js HTTP server:
```bash
# Instalacja http-server globalnie
npm install -g http-server

# Uruchomienie serwera
http-server dist -p 8080
```

##### Opcja C: Niestandardowy serwer Node.js:

Utwórz plik `server.js`:
```javascript
const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 8080;

// Serwowanie statycznych plików
app.use(express.static(path.join(__dirname, 'dist')));

// Obsługa routingu po stronie klienta (SPA)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
```

Następnie:
```bash
npm install express
node server.js
```

### Metoda 2: PM2 (zalecane dla produkcji)

PM2 zapewnia automatyczne restarty i zarządzanie procesami:

```bash
# Instalacja PM2
npm install -g pm2

# Uruchomienie aplikacji
pm2 start npm --name "3d-print-app" -- run build && pm2 serve dist 8080 --spa

# Lub z niestandardowym serwerem
pm2 start server.js --name "3d-print-app"

# Automatyczne uruchamianie po restarcie serwera
pm2 startup
pm2 save
```

Zarządzanie PM2:
```bash
# Status aplikacji
pm2 status

# Logi
pm2 logs 3d-print-app

# Restart
pm2 restart 3d-print-app

# Stop
pm2 stop 3d-print-app
```

### Metoda 3: Docker (opcjonalnie)

Utwórz `Dockerfile`:
```dockerfile
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

RUN npm install -g serve

EXPOSE 8080

CMD ["serve", "-s", "dist", "-l", "8080"]
```

Build i uruchomienie:
```bash
docker build -t 3d-print-app .
docker run -p 8080:8080 3d-print-app
```

### Konfiguracja Nginx (reverse proxy)

Przykładowa konfiguracja `/etc/nginx/sites-available/3d-print-app`:

```nginx
server {
    listen 80;
    server_name twoja-domena.pl;

    location / {
        proxy_pass http://localhost:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Aktywacja:
```bash
sudo ln -s /etc/nginx/sites-available/3d-print-app /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### SSL/HTTPS z Certbot:

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d twoja-domena.pl
```

## 🔧 Komendy NPM

```bash
# Tryb deweloperski
npm run dev

# Build produkcyjny
npm run build

# Podgląd buildu produkcyjnego
npm run preview

# Linting
npm run lint
```

## ✨ Funkcjonalności

### Dla użytkowników:
- ✅ Przeglądanie i wgrywanie modeli 3D
- ✅ Konfiguracja parametrów druku (kolor, materiał, rozmiar)
- ✅ System zamówień z historią
- ✅ Zarządzanie adresami dostawy
- ✅ Portfel użytkownika
- ✅ Profil użytkownika

### Dla administratorów:
- ✅ Panel administracyjny
- ✅ Zarządzanie użytkownikami i rolami
- ✅ Zarządzanie zamówieniami
- ✅ Zarządzanie kolorami druku
- ✅ System notatek i powiadomień
- ✅ Konfiguracja SMTP
- ✅ Zarządzanie szablonami emaili
- ✅ Historia wysłanych emaili
- ✅ Personalizacja strony
- ✅ Statystyki i przegląd

### System emailowy:
- ✅ Powiadomienia o rejestracji
- ✅ Potwierdzenia zamówień
- ✅ Powiadomienia o zmianach statusu
- ✅ Powiadomienia o zmianach na koncie
- ✅ Szablony emaili (PL/EN)

## 🛠 Technologie

### Frontend:
- **React 18** - biblioteka UI
- **TypeScript** - typowanie statyczne
- **Vite** - bundler i dev server
- **Tailwind CSS** - stylowanie
- **shadcn/ui** - komponenty UI
- **React Router** - routing
- **Three.js** - wizualizacja 3D
- **React Query** - zarządzanie stanem

### Backend:
- **Supabase** - backend as a service
  - PostgreSQL - baza danych
  - Row Level Security - bezpieczeństwo
  - Edge Functions - logika biznesowa
  - Storage - przechowywanie plików
  - Authentication - autoryzacja

### Email:
- **SMTP** - wysyłka emaili
- **nodemailer** - biblioteka Node.js do SMTP

## 📝 Zarządzanie projektem

### Edycja za pomocą Lovable

Odwiedź [Lovable Project](https://lovable.dev/projects/d31e7cd8-97dd-4e53-ba4e-61bfa7731e92) i zacznij promptować.

Zmiany wykonane przez Lovable są automatycznie commitowane do repozytorium.

### Edycja lokalna

Sklonuj repozytorium i pushuj zmiany. Zmiany będą automatycznie synchronizowane z Lovable.

### Edycja w GitHub

- Przejdź do pliku i kliknij "Edit" (ikona ołówka)
- Wprowadź zmiany i commituj

### GitHub Codespaces

- Kliknij "Code" → "Codespaces" → "New codespace"
- Edytuj pliki bezpośrednio w Codespaces

## 📚 Dodatkowa dokumentacja

- **[DEPLOYMENT.md](DEPLOYMENT.md)** - Szczegółowy przewodnik wdrożenia na serwer produkcyjny
- **[.env.example](.env.example)** - Przykładowy plik zmiennych środowiskowych
- **[Lovable Docs](https://docs.lovable.dev)** - Oficjalna dokumentacja Lovable
- **[Supabase Docs](https://supabase.com/docs)** - Dokumentacja Supabase

## 🔗 Przydatne linki

- **Lovable Project**: https://lovable.dev/projects/d31e7cd8-97dd-4e53-ba4e-61bfa7731e92
- **Supabase Dashboard**: https://supabase.com/dashboard/project/rzupsyhyoztaekcwmels
- **Custom Domain Setup**: https://docs.lovable.dev/features/custom-domain

## 📄 Licencja

Ten projekt został stworzony z Lovable i jest dostępny do użytku zgodnie z warunkami ustalonymi przez właściciela projektu.

---

**Stworzone z ❤️ używając [Lovable](https://lovable.dev)**
