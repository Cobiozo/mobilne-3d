# 🚀 Szybki Start - 5 minut do uruchomienia

## Wymagania

✅ Node.js v18+ ([pobierz tutaj](https://nodejs.org/))  
✅ npm v9+ (instalowany razem z Node.js)  
✅ Git (opcjonalnie)

## Krok 1: Pobierz kod (1 min)

### Opcja A: Git
```bash
git clone <YOUR_REPOSITORY_URL>
cd <PROJECT_NAME>
```

### Opcja B: ZIP
1. Pobierz ZIP z GitHub
2. Rozpakuj
3. Otwórz terminal w folderze projektu

## Krok 2: Instalacja (2 min)

```bash
npm install
```

## Krok 3: Uruchomienie (1 min)

```bash
npm run dev
```

🎉 **Gotowe!** Aplikacja działa na: **http://localhost:8080**

---

## 🔐 Pierwsze logowanie

1. Otwórz **http://localhost:8080/auth**
2. Kliknij "Zarejestruj się"
3. Utwórz konto - **pierwszy użytkownik automatycznie dostaje rolę administratora**
4. Sprawdź email (jeśli Confirm Email jest włączone w Supabase)

## ⚙️ Podstawowa konfiguracja (opcjonalnie)

### Wyłączenie potwierdzania email (dla testów)

1. Przejdź do: [Supabase Auth Settings](https://supabase.com/dashboard/project/rzupsyhyoztaekcwmels/auth/providers)
2. Znajdź "Email Auth"
3. Wyłącz "Confirm email"

### Konfiguracja SMTP (do wysyłki emaili)

1. Zaloguj się jako admin
2. Przejdź do: **Panel administratora → Ustawienia Email**
3. Wypełnij dane SMTP:
   - **Host**: np. `smtp.gmail.com`
   - **Port**: `587`
   - **User**: twój email
   - **From Email**: email nadawcy
   - **From Name**: nazwa nadawcy
4. W [Supabase Secrets](https://supabase.com/dashboard/project/rzupsyhyoztaekcwmels/settings/functions) dodaj: `SMTP_PASSWORD`
5. Kliknij "Testuj połączenie"

---

## 🎨 Pierwsze kroki w aplikacji

### Jako użytkownik:
1. **Dodaj model 3D**: Dashboard → Moje modele → Dodaj model
2. **Złóż zamówienie**: Wybierz model → Konfiguruj (kolor, materiał) → Dodaj do koszyka
3. **Zarządzaj profilem**: Dashboard → Profil

### Jako administrator:
1. **Dodaj kolory**: Panel admin → Kolory → Dodaj nowy kolor
2. **Zarządzaj zamówieniami**: Panel admin → Zamówienia
3. **Dodaj użytkowników**: Panel admin → Użytkownicy
4. **Personalizuj stronę**: Panel admin → Personalizacja

---

## 📦 Produkcja (5 min)

### Build aplikacji
```bash
npm run build
```

### Uruchomienie (wybierz jedną metodę):

#### Opcja 1: Serve (najprostsze)
```bash
npm install -g serve
serve -s dist -l 8080
```

#### Opcja 2: Node.js server
```bash
npm install express compression
node server.js
```

#### Opcja 3: PM2 (zalecane dla produkcji)
```bash
npm install -g pm2
pm2 start server.js --name "3d-print-app"
pm2 save
pm2 startup
```

---

## 🆘 Problemy?

### Problem: Port 8080 zajęty
```bash
# Zmień port w vite.config.ts (development) lub server.js (production)
```

### Problem: Błąd podczas instalacji
```bash
# Wyczyść cache i zainstaluj ponownie
rm -rf node_modules package-lock.json
npm install
```

### Problem: Aplikacja nie startuje
```bash
# Sprawdź wersję Node.js (musi być 18+)
node --version

# Sprawdź logi
npm run dev
```

### Problem: Nie mogę się zalogować
1. Sprawdź w [Supabase Dashboard](https://supabase.com/dashboard/project/rzupsyhyoztaekcwmels/auth/users) czy użytkownik istnieje
2. Sprawdź czy "Confirm Email" jest wyłączone (dla testów)
3. Sprawdź URL przekierowań w [Auth Settings](https://supabase.com/dashboard/project/rzupsyhyoztaekcwmels/auth/url-configuration)

---

## 📚 Więcej informacji

- **Pełna dokumentacja**: [README.md](README.md)
- **Przewodnik wdrożenia**: [DEPLOYMENT.md](DEPLOYMENT.md)
- **Lovable Docs**: https://docs.lovable.dev
- **Supabase Docs**: https://supabase.com/docs

---

## 🎯 Checklist pierwszego uruchomienia

- [ ] Node.js v18+ zainstalowany
- [ ] `npm install` wykonany
- [ ] `npm run dev` działa
- [ ] Aplikacja otwiera się w przeglądarce (localhost:8080)
- [ ] Utworzono pierwsze konto (admin)
- [ ] Zalogowano się do panelu
- [ ] (Opcjonalnie) SMTP skonfigurowany
- [ ] (Opcjonalnie) Dodano pierwszy kolor druku
- [ ] (Opcjonalnie) Dodano pierwszy model 3D

**Wszystko działa? Gratulacje! 🎉**

Teraz możesz przejść do [DEPLOYMENT.md](DEPLOYMENT.md) aby dowiedzieć się jak wdrożyć aplikację na serwer produkcyjny.

---

**Potrzebujesz pomocy?**
- Sprawdź dokumentację w [README.md](README.md)
- Zobacz [DEPLOYMENT.md](DEPLOYMENT.md) dla zaawansowanej konfiguracji