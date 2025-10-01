# 🚀 Przewodnik wdrożenia (Deployment Guide)

## Spis treści

1. [Przygotowanie serwera](#przygotowanie-serwera)
2. [Instalacja aplikacji](#instalacja-aplikacji)
3. [Konfiguracja](#konfiguracja)
4. [Uruchomienie produkcyjne](#uruchomienie-produkcyjne)
5. [Monitoring i utrzymanie](#monitoring-i-utrzymanie)
6. [Rozwiązywanie problemów](#rozwiązywanie-problemów)

---

## 1. Przygotowanie serwera

### Wymagania systemowe

- **System operacyjny**: Ubuntu 20.04 LTS lub nowszy (zalecane) / CentOS 8+ / Debian 11+
- **RAM**: minimum 2GB (zalecane 4GB)
- **Procesor**: 2 rdzenie (zalecane 4 rdzenie)
- **Dysk**: minimum 10GB wolnego miejsca
- **Node.js**: v18+ lub v20 LTS
- **nginx**: najnowsza wersja stabilna (opcjonalnie, ale zalecane)

### Instalacja Node.js na Ubuntu/Debian

```bash
# Aktualizacja systemu
sudo apt update && sudo apt upgrade -y

# Instalacja nvm (Node Version Manager)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.5/install.sh | bash

# Załadowanie nvm
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

# Instalacja Node.js LTS
nvm install --lts
nvm use --lts

# Weryfikacja instalacji
node --version  # powinno pokazać v20.x.x
npm --version   # powinno pokazać v10.x.x
```

### Instalacja dodatkowych narzędzi

```bash
# Git (jeśli nie zainstalowany)
sudo apt install git -y

# PM2 (manager procesów Node.js)
npm install -g pm2

# nginx (serwer proxy)
sudo apt install nginx -y

# Certbot (SSL/HTTPS)
sudo apt install certbot python3-certbot-nginx -y
```

---

## 2. Instalacja aplikacji

### Metoda A: Klonowanie z GitHub (zalecane)

```bash
# Przejdź do katalogu dla aplikacji webowych
cd /var/www

# Sklonuj repozytorium
sudo git clone <YOUR_REPOSITORY_URL> 3d-print-app

# Zmień właściciela katalogu
sudo chown -R $USER:$USER 3d-print-app

# Przejdź do katalogu projektu
cd 3d-print-app

# Zainstaluj zależności
npm install

# Zbuduj aplikację dla produkcji
npm run build
```

### Metoda B: Upload ręczny

```bash
# Na lokalnym komputerze zbuduj aplikację
npm run build

# Spakuj folder dist
tar -czf dist.tar.gz dist/

# Prześlij na serwer (użyj SCP, FTP lub innej metody)
scp dist.tar.gz user@your-server:/var/www/3d-print-app/

# Na serwerze rozpakuj
cd /var/www/3d-print-app
tar -xzf dist.tar.gz
```

---

## 3. Konfiguracja

### Konfiguracja zmiennych środowiskowych

```bash
# Utwórz plik .env (jeśli potrzebny dla serwera produkcyjnego)
cp .env.example .env

# Edytuj plik .env
nano .env
```

### Konfiguracja Supabase

1. **Skonfiguruj URL przekierowań**:
   - Przejdź do: https://supabase.com/dashboard/project/rzupsyhyoztaekcwmels/auth/url-configuration
   - **Site URL**: `https://twoja-domena.pl`
   - **Redirect URLs**: Dodaj:
     ```
     https://twoja-domena.pl/*
     http://localhost:8080/*
     ```

2. **Skonfiguruj sekrety Edge Functions**:
   - Przejdź do: https://supabase.com/dashboard/project/rzupsyhyoztaekcwmels/settings/functions
   - Dodaj:
     - `SMTP_PASSWORD`: hasło do SMTP
     - Inne sekrety według potrzeb

### Konfiguracja SMTP w aplikacji

Po uruchomieniu aplikacji:
1. Zaloguj się jako administrator (pierwszy użytkownik automatycznie dostaje rolę admin)
2. Przejdź do: **Panel administratora → Ustawienia Email**
3. Skonfiguruj parametry SMTP
4. Przetestuj połączenie

---

## 4. Uruchomienie produkcyjne

### Opcja 1: PM2 (zalecane dla produkcji)

#### Uruchomienie z niestandardowym serwerem Node.js:

```bash
# Zainstaluj zależności serwera
npm install express compression

# Uruchom serwer z PM2
pm2 start server.js --name "3d-print-app"

# Skonfiguruj automatyczne uruchamianie po restarcie
pm2 startup systemd
pm2 save

# Sprawdź status
pm2 status
pm2 logs 3d-print-app
```

#### Konfiguracja PM2 ecosystem (opcjonalnie):

Utwórz plik `ecosystem.config.js`:

```javascript
module.exports = {
  apps: [{
    name: '3d-print-app',
    script: './server.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 8080,
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss',
  }],
};
```

Uruchom:
```bash
pm2 start ecosystem.config.js
pm2 save
```

### Opcja 2: Serve (prostsze, bez PM2)

```bash
# Instalacja serve
npm install -g serve

# Uruchomienie
serve -s dist -l 8080

# Dla działania w tle (nohup)
nohup serve -s dist -l 8080 > server.log 2>&1 &
```

### Opcja 3: systemd service

Utwórz plik `/etc/systemd/system/3d-print-app.service`:

```ini
[Unit]
Description=3D Printing Platform
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/var/www/3d-print-app
ExecStart=/usr/bin/node /var/www/3d-print-app/server.js
Restart=always
RestartSec=10
StandardOutput=syslog
StandardError=syslog
SyslogIdentifier=3d-print-app
Environment=NODE_ENV=production
Environment=PORT=8080

[Install]
WantedBy=multi-user.target
```

Aktywuj:
```bash
sudo systemctl daemon-reload
sudo systemctl enable 3d-print-app
sudo systemctl start 3d-print-app
sudo systemctl status 3d-print-app
```

### Konfiguracja nginx jako reverse proxy

Utwórz plik `/etc/nginx/sites-available/3d-print-app`:

```nginx
upstream app_backend {
    server 127.0.0.1:8080;
    keepalive 64;
}

server {
    listen 80;
    server_name twoja-domena.pl www.twoja-domena.pl;

    # Limity
    client_max_body_size 100M;
    
    # Logi
    access_log /var/log/nginx/3d-print-app-access.log;
    error_log /var/log/nginx/3d-print-app-error.log;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1000;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;

    location / {
        proxy_pass http://app_backend;
        proxy_http_version 1.1;
        
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 300;
        proxy_connect_timeout 300;
    }

    # Cache static assets
    location ~* \.(jpg|jpeg|png|gif|ico|css|js|svg|woff|woff2|ttf|eot)$ {
        proxy_pass http://app_backend;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

Aktywuj konfigurację:
```bash
# Testuj konfigurację
sudo nginx -t

# Jeśli test OK, aktywuj
sudo ln -s /etc/nginx/sites-available/3d-print-app /etc/nginx/sites-enabled/
sudo systemctl reload nginx
```

### Konfiguracja SSL/HTTPS z Certbot

```bash
# Automatyczna konfiguracja SSL
sudo certbot --nginx -d twoja-domena.pl -d www.twoja-domena.pl

# Certbot automatycznie:
# - Pobierze certyfikat
# - Skonfiguruje nginx
# - Ustawi automatyczne odnawianie

# Test automatycznego odnawiania
sudo certbot renew --dry-run
```

---

## 5. Monitoring i utrzymanie

### Monitoring z PM2

```bash
# Status aplikacji
pm2 status

# Logi w czasie rzeczywistym
pm2 logs 3d-print-app --lines 100

# Monit (dashboard w terminalu)
pm2 monit

# Lista procesów z detalami
pm2 describe 3d-print-app

# Restart po aktualizacji
pm2 restart 3d-print-app
```

### Monitoring nginx

```bash
# Status nginx
sudo systemctl status nginx

# Logi dostępu
sudo tail -f /var/log/nginx/3d-print-app-access.log

# Logi błędów
sudo tail -f /var/log/nginx/3d-print-app-error.log
```

### Aktualizacja aplikacji

```bash
# Przejdź do katalogu projektu
cd /var/www/3d-print-app

# Pobierz najnowszy kod
git pull origin main

# Zainstaluj nowe zależności (jeśli są)
npm install

# Zbuduj nową wersję
npm run build

# Restart aplikacji
pm2 restart 3d-print-app

# Lub jeśli używasz systemd
sudo systemctl restart 3d-print-app
```

### Backup

```bash
# Backup plików aplikacji
tar -czf backup-$(date +%Y%m%d).tar.gz /var/www/3d-print-app

# Backup bazy danych Supabase
# (wykonywany automatycznie przez Supabase, możesz też zrobić export ręczny)
```

---

## 6. Rozwiązywanie problemów

### Problem: Aplikacja nie startuje

```bash
# Sprawdź logi PM2
pm2 logs 3d-print-app --err

# Sprawdź czy port jest zajęty
sudo lsof -i :8080

# Sprawdź uprawnienia do plików
ls -la /var/www/3d-print-app

# Sprawdź wersję Node.js
node --version
```

### Problem: Nginx 502 Bad Gateway

```bash
# Sprawdź czy aplikacja działa
pm2 status

# Sprawdź logi nginx
sudo tail -f /var/log/nginx/error.log

# Sprawdź czy nginx może połączyć się z aplikacją
curl http://localhost:8080
```

### Problem: SSL nie działa

```bash
# Sprawdź certyfikaty
sudo certbot certificates

# Odnów certyfikat ręcznie
sudo certbot renew

# Sprawdź konfigurację nginx
sudo nginx -t
```

### Problem: Aplikacja używa za dużo pamięci

```bash
# Sprawdź zużycie zasobów
pm2 monit

# Restart aplikacji
pm2 restart 3d-print-app

# Ogranicz pamięć (np. do 512MB)
pm2 restart 3d-print-app --max-memory-restart 512M
```

### Problem: Wolne ładowanie

```bash
# Sprawdź czy gzip działa w nginx
curl -H "Accept-Encoding: gzip" -I https://twoja-domena.pl

# Sprawdź cache w nginx
sudo nginx -T | grep cache

# Zoptymalizuj build
npm run build -- --minify
```

---

## Przydatne komendy

### PM2
```bash
pm2 start server.js --name app    # Start
pm2 restart app                    # Restart
pm2 stop app                       # Stop
pm2 delete app                     # Usuń
pm2 logs app                       # Logi
pm2 monit                          # Monitor
pm2 save                           # Zapisz konfigurację
pm2 resurrect                      # Przywróć zapisane
```

### systemctl (dla systemd service)
```bash
sudo systemctl start 3d-print-app      # Start
sudo systemctl stop 3d-print-app       # Stop
sudo systemctl restart 3d-print-app    # Restart
sudo systemctl status 3d-print-app     # Status
sudo systemctl enable 3d-print-app     # Auto-start
```

### nginx
```bash
sudo nginx -t                      # Test config
sudo systemctl reload nginx        # Reload config
sudo systemctl restart nginx       # Restart
sudo systemctl status nginx        # Status
```

---

## Checklist wdrożenia

- [ ] Node.js v18+ zainstalowany
- [ ] Kod aplikacji sklonowany/przesłany
- [ ] `npm install` wykonany
- [ ] `npm run build` wykonany
- [ ] PM2 zainstalowany i skonfigurowany
- [ ] Aplikacja działa na localhost:8080
- [ ] nginx zainstalowany
- [ ] Reverse proxy skonfigurowany w nginx
- [ ] Domena wskazuje na serwer
- [ ] SSL certyfikat zainstalowany (Certbot)
- [ ] Supabase URL przekierowania skonfigurowane
- [ ] SMTP skonfigurowany w panelu admin
- [ ] Backup skonfigurowany
- [ ] Monitoring działa

---

## Wsparcie

W razie problemów:
1. Sprawdź logi: `pm2 logs` lub `journalctl -u 3d-print-app`
2. Sprawdź dokumentację Supabase
3. Skontaktuj się z zespołem DevOps

**Powodzenia w deploymencie! 🚀**