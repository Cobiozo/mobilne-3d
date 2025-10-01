# ✅ Checklist wdrożenia aplikacji 3D Printing Platform

## 📋 Przed wdrożeniem

### Środowisko lokalne
- [ ] Aplikacja działa lokalnie (`npm run dev`)
- [ ] Build produkcyjny przechodzi bez błędów (`npm run build`)
- [ ] Wszystkie funkcjonalności przetestowane
- [ ] Żadnych błędów w konsoli przeglądarki
- [ ] Żadnych błędów w logach serwera dev

### Konfiguracja projektu
- [ ] Plik `.env.example` zaktualizowany z wszystkimi wymaganymi zmiennymi
- [ ] `README.md` zawiera aktualne instrukcje
- [ ] `DEPLOYMENT.md` jest dostępny
- [ ] Dokumentacja API/funkcji jest aktualna

---

## 🖥️ Przygotowanie serwera

### System operacyjny
- [ ] Ubuntu 20.04 LTS+ / CentOS 8+ / Debian 11+ zainstalowany
- [ ] System zaktualizowany (`apt update && apt upgrade`)
- [ ] Firewall skonfigurowany (porty 80, 443, 8080)
- [ ] SSH access skonfigurowany
- [ ] Użytkownik z sudo privileges utworzony

### Oprogramowanie bazowe
- [ ] Node.js v18+ zainstalowany
- [ ] npm v9+ zainstalowany
- [ ] Git zainstalowany
- [ ] PM2 zainstalowany globalnie (`npm install -g pm2`)
- [ ] nginx zainstalowany (`apt install nginx`)
- [ ] certbot zainstalowany (`apt install certbot python3-certbot-nginx`)

### Bezpieczeństwo
- [ ] Firewall włączony (ufw/firewalld)
- [ ] Tylko niezbędne porty otwarte
- [ ] SSH konfiguracja zabezpieczona (klucze, wyłączony root login)
- [ ] Automatyczne aktualizacje bezpieczeństwa włączone
- [ ] Fail2ban zainstalowany (opcjonalnie)

---

## 📦 Deployment aplikacji

### Kod aplikacji
- [ ] Repozytorium sklonowane do `/var/www/3d-print-app`
- [ ] Właściciel plików ustawiony poprawnie (`chown -R user:user`)
- [ ] `npm install` wykonany bez błędów
- [ ] `npm run build` wykonany pomyślnie
- [ ] Folder `dist/` zawiera zbudowane pliki
- [ ] Uprawnienia do plików ustawione poprawnie (644 dla plików, 755 dla katalogów)

### Serwer Node.js
- [ ] Plik `server.js` istnieje i działa
- [ ] Zależności serwera zainstalowane (`express`, `compression`)
- [ ] Port 8080 dostępny i nie jest zajęty
- [ ] Aplikacja uruchamia się ręcznie (`node server.js`)
- [ ] Brak błędów w logach serwera

### PM2 Configuration
- [ ] PM2 zainstalowany globalnie
- [ ] Aplikacja uruchomiona przez PM2 (`pm2 start server.js`)
- [ ] Aplikacja widoczna w `pm2 status`
- [ ] Auto-restart skonfigurowany (`pm2 startup`)
- [ ] Konfiguracja PM2 zapisana (`pm2 save`)
- [ ] PM2 loguje do plików (sprawdź `pm2 logs`)
- [ ] Limit pamięci ustawiony (opcjonalnie)

### nginx Reverse Proxy
- [ ] nginx zainstalowany i działa
- [ ] Plik konfiguracyjny utworzony w `/etc/nginx/sites-available/`
- [ ] Symlink utworzony w `/etc/nginx/sites-enabled/`
- [ ] Test konfiguracji nginx przeszedł (`nginx -t`)
- [ ] nginx przeładowany (`systemctl reload nginx`)
- [ ] Proxy przekierowuje poprawnie na localhost:8080
- [ ] Gzip compression włączony
- [ ] Security headers skonfigurowane

---

## 🔐 SSL/HTTPS

### Certyfikat SSL
- [ ] Domena wskazuje na serwer (A record w DNS)
- [ ] Certbot zainstalowany
- [ ] Certyfikat SSL wygenerowany (`certbot --nginx -d domena.pl`)
- [ ] HTTPS działa poprawnie
- [ ] Automatyczne przekierowanie HTTP → HTTPS włączone
- [ ] Auto-renewal certyfikatu skonfigurowany
- [ ] Test renewal działa (`certbot renew --dry-run`)

---

## 🗄️ Konfiguracja Supabase

### Podstawowa konfiguracja
- [ ] Projekt Supabase dostępny i działa
- [ ] Wszystkie tabele utworzone (sprawdź migracje)
- [ ] RLS policies włączone na wszystkich tabelach
- [ ] RLS policies przetestowane
- [ ] Storage buckets utworzone
- [ ] Storage policies skonfigurowane

### Authentication
- [ ] Email provider włączony
- [ ] Google OAuth skonfigurowany (jeśli używany)
- [ ] Site URL ustawiony na domenę produkcyjną
- [ ] Redirect URLs zawierają:
  - [ ] `https://twoja-domena.pl/*`
  - [ ] `http://localhost:8080/*` (dla dev)
- [ ] "Confirm Email" skonfigurowany według potrzeb
- [ ] Email templates dostosowane (opcjonalnie)

### Edge Functions
- [ ] Wszystkie Edge Functions wdrożone
- [ ] Sekrety skonfigurowane:
  - [ ] `SMTP_PASSWORD`
  - [ ] `MESHY_API_KEY` (jeśli używany)
  - [ ] `FAL_AI_API_KEY` (jeśli używany)
  - [ ] Inne wymagane sekrety
- [ ] Edge Functions testowane i działają
- [ ] Logi Edge Functions czyste (bez błędów)

### Database Security
- [ ] Wszystkie sensitive tabele mają RLS
- [ ] Admin role functions działają poprawnie
- [ ] User permissions przetestowane
- [ ] Żadnych publicznych tabeli bez RLS (chyba że zamierzone)
- [ ] Database backups włączone (automatyczne w Supabase)

---

## 📧 System emailowy

### Konfiguracja SMTP
- [ ] SMTP host, port, user skonfigurowany w panelu admin
- [ ] `SMTP_PASSWORD` dodany do Supabase Secrets
- [ ] Test połączenia SMTP przeszedł pomyślnie
- [ ] Email nadawcy (from_email) poprawnie skonfigurowany
- [ ] Nazwa nadawcy (from_name) ustawiona

### Email Templates
- [ ] Wszystkie szablony emaili sprawdzone
- [ ] Szablony w języku polskim działają
- [ ] Szablony w języku angielskim działają (jeśli używane)
- [ ] Zmienne w szablonach {{variable}} działają poprawnie
- [ ] Testowy email wysłany i otrzymany

### Powiadomienia
- [ ] Email rejestracyjny działa
- [ ] Email potwierdzenia zamówienia działa
- [ ] Email zmiany statusu zamówienia działa
- [ ] Email zmiany hasła działa
- [ ] Powiadomienia admin działają

---

## 👤 Użytkownicy i role

### Konto administratora
- [ ] Pierwsze konto admin utworzone
- [ ] Rola admin przypisana poprawnie
- [ ] Dostęp do panelu administratora działa
- [ ] Wszystkie funkcje admin dostępne

### Testowi użytkownicy
- [ ] Testowe konto użytkownika utworzone
- [ ] Zwykły użytkownik NIE ma dostępu do panelu admin
- [ ] Permissions działają poprawnie
- [ ] Użytkownik może składać zamówienia
- [ ] Użytkownik może zarządzać profilem

---

## 🎨 Personalizacja

### Ustawienia strony
- [ ] Nazwa firmy ustawiona
- [ ] Logo firmy wgrane
- [ ] Favicon ustawiony
- [ ] Kolory motywu skonfigurowane
- [ ] Meta description dla SEO
- [ ] Social media og:image ustawiony
- [ ] Informacje kontaktowe uzupełnione

### Kolory druku
- [ ] Dostępne kolory druku 3D dodane
- [ ] Każdy kolor ma nazwę i hex code
- [ ] Kolory są aktywne i widoczne

---

## 🧪 Testy funkcjonalne

### Funkcjonalność użytkownika
- [ ] Rejestracja nowego użytkownika działa
- [ ] Logowanie działa
- [ ] Wylogowanie działa
- [ ] Reset hasła działa
- [ ] Upload modelu 3D działa
- [ ] Przeglądanie modeli działa
- [ ] Konfiguracja zamówienia działa
- [ ] Dodawanie do koszyka działa
- [ ] Składanie zamówienia działa
- [ ] Historia zamówień wyświetla się poprawnie
- [ ] Zarządzanie adresami dostawy działa
- [ ] Edycja profilu działa

### Funkcjonalność administratora
- [ ] Dostęp do panelu admin działa
- [ ] Zarządzanie użytkownikami działa
- [ ] Zarządzanie zamówieniami działa
- [ ] Zmiana statusu zamówienia działa i wysyła email
- [ ] Zarządzanie kolorami działa
- [ ] System notatek działa
- [ ] Powiadomienia systemowe działają
- [ ] Personalizacja strony działa
- [ ] Ustawienia SMTP działają
- [ ] Szablony emaili można edytować
- [ ] Historia emaili wyświetla się

### Testy wydajnościowe
- [ ] Strona ładuje się < 3 sekundy
- [ ] Obrazki są zoptymalizowane
- [ ] Gzip compression działa
- [ ] Cache działa dla statycznych zasobów
- [ ] Brak memory leaks (sprawdź PM2 monit)
- [ ] Aplikacja stabilna pod obciążeniem

---

## 📊 Monitoring i logi

### PM2 Monitoring
- [ ] `pm2 status` pokazuje aplikację jako "online"
- [ ] `pm2 logs` nie pokazuje błędów
- [ ] `pm2 monit` pokazuje normalne zużycie zasobów
- [ ] Auto-restart działa po crash

### nginx Logs
- [ ] Access logs działają (`/var/log/nginx/3d-print-app-access.log`)
- [ ] Error logs działają (`/var/log/nginx/3d-print-app-error.log`)
- [ ] Logi nie pokazują błędów 5xx
- [ ] Logi nie pokazują błędów 4xx (poza normalnymi 404)

### Supabase Monitoring
- [ ] Database queries działają bez błędów
- [ ] Edge Functions logs czyste
- [ ] Auth logs bez błędów
- [ ] Storage działa poprawnie
- [ ] API rate limits nie są przekroczone

---

## 🔄 Backup i recovery

### Backup Strategy
- [ ] Plan backupu określony
- [ ] Supabase automatic backups włączone
- [ ] Backup plików aplikacji skonfigurowany
- [ ] Backup testowany (restore działa)
- [ ] Backup schedule ustalony
- [ ] Off-site backup skonfigurowany (opcjonalnie)

### Disaster Recovery
- [ ] Plan recovery udokumentowany
- [ ] Kontakty awaryjne zapisane
- [ ] Procedury restore przetestowane
- [ ] RTO/RPO zdefiniowane

---

## 📱 Responsywność i przeglądarki

### Urządzenia
- [ ] Desktop (1920x1080) - działa poprawnie
- [ ] Laptop (1366x768) - działa poprawnie
- [ ] Tablet (768x1024) - działa poprawnie
- [ ] Mobile (375x667) - działa poprawnie
- [ ] Mobile landscape - działa poprawnie

### Przeglądarki
- [ ] Chrome - działa poprawnie
- [ ] Firefox - działa poprawnie
- [ ] Safari - działa poprawnie
- [ ] Edge - działa poprawnie
- [ ] Mobile Safari - działa poprawnie
- [ ] Chrome Mobile - działa poprawnie

---

## 📚 Dokumentacja

### Dokumentacja techniczna
- [ ] README.md kompletny i aktualny
- [ ] DEPLOYMENT.md dostępny
- [ ] QUICK_START.md dostępny
- [ ] API dokumentacja (jeśli dotyczy)
- [ ] Diagramy architektury (opcjonalnie)

### Dokumentacja użytkownika
- [ ] Instrukcja dla użytkowników
- [ ] FAQ przygotowane
- [ ] Screenshoty funkcjonalności
- [ ] Video tutorial (opcjonalnie)

### Dokumentacja operacyjna
- [ ] Procedury deployment
- [ ] Procedury aktualizacji
- [ ] Procedury rollback
- [ ] Troubleshooting guide
- [ ] Kontakty do zespołu

---

## 🎯 Go-Live Checklist

### Dzień przed launch
- [ ] Wszystkie powyższe checklisty completed
- [ ] Zespół poinformowany o launch
- [ ] Backup wykonany
- [ ] Plan rollback przygotowany
- [ ] Monitoring włączony
- [ ] Zespół support gotowy

### Dzień launch
- [ ] Ostatni test wszystkich funkcjonalności
- [ ] DNS propagated (jeśli zmiana)
- [ ] SSL certyfikat ważny
- [ ] Monitoring aktywny
- [ ] Pierwsza rejestracja testowa
- [ ] Pierwsze zamówienie testowe
- [ ] Email powiadomienia działają

### Po launch
- [ ] Monitoring przez pierwsze 24h
- [ ] Sprawdzanie logów co kilka godzin
- [ ] Performance monitoring
- [ ] User feedback collection
- [ ] Bug tracking rozpoczęty

---

## ✅ Final Sign-off

- [ ] Wszystkie critical checklisty completed
- [ ] Wszystkie known issues udokumentowane
- [ ] Zespół przeszkolony
- [ ] Go-live approval otrzymany
- [ ] Production environment oznaczony jako "LIVE"

---

**Data deployment:** _______________

**Osoba odpowiedzialna:** _______________

**Sign-off:** _______________

---

## 🆘 W razie problemów

**Kontakt awaryjny:**
- DevOps: _______________
- Backend: _______________
- Frontend: _______________

**Supabase Dashboard:** https://supabase.com/dashboard/project/rzupsyhyoztaekcwmels

**PM2 Commands:**
```bash
pm2 restart 3d-print-app  # Restart
pm2 logs 3d-print-app      # Logi
pm2 monit                  # Monitor
```

**Rollback procedure:** Zobacz DEPLOYMENT.md sekcja "Rollback"