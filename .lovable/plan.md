

# Pełny audyt aplikacji Mobilne-3D Platform

## 1. Stack techniczny i architektura

**Frontend:** React 18 + Vite 5 + TypeScript + TailwindCSS + shadcn/ui  
**3D:** Three.js 0.168 + @react-three/fiber + drei  
**Backend:** Supabase (Postgres + Auth + Storage + Edge Functions)  
**Hosting:** Cyber-Folks (Passenger) + Express + Multer  
**Płatności:** PayU (sandbox/production)

---

## 2. KRYTYCZNE problemy (wymagają natychmiastowej naprawy)

### 🔴 P1: Pakiety Solana wciąż w `package.json` (linie 44-48)
Mimo wielokrotnych prób usunięcia, 5 pakietów `@solana/*` jest nadal obecnych. Powodują **blokadę buildu** (`usb` wymaga `node-gyp` + `make`, niedostępne w sandbox). W kodzie `src/` nie ma żadnego importu `@solana`.

**Fix:** Trwałe usunięcie z `package.json` przez tool `lov-remove-dependency`.

### 🔴 P2: Multer endpoint nie zadziała na Lovable preview
`POST /api/upload` istnieje tylko w `server.js` (production na Cyber-Folks). W trybie dev (Vite) endpoint nie istnieje → upload plików > 2MB **rzuci błąd 404** w preview.

**Fix:** Dodać warunek `if (import.meta.env.DEV)` → fallback do Supabase Storage, lub Vite proxy/middleware.

### 🔴 P3: Konflikt logiki zapisu adresu w Checkout (linie 537-577)
Po naprawie ładowania profilu nadal **dwa razy** zapisujemy do `profiles` (upsert + update), co marnuje requesty i może nadpisać dobre dane.

### 🟡 P4: `cartItems[i].id` ≠ `models.id` w bazie
Założenie z poprzedniej naprawy (linia 466, 513) jest **błędne** dla modeli wgranych przez `QuickModelUpload` (główna strona) - tam ID jest generowane lokalnie (np. `Date.now()`), nie jest UUID z tabeli `models`. Zamówienie zostanie utworzone z nieistniejącym `model_id` → FK violation lub dane nieczytelne dla admina.

---

## 3. Problemy wydajnościowe / UX

| # | Problem | Lokalizacja |
|---|---------|-------------|
| 1 | `console.log` w produkcji (setki) | `ModelUpload.tsx`, `Checkout.tsx`, `Index.tsx` |
| 2 | `Index.tsx` ma 1012 linii - powinien być rozbity | `src/pages/Index.tsx` |
| 3 | `Checkout.tsx` ma 1546 linii - mega-komponent | `src/pages/Checkout.tsx` |
| 4 | Brak memoizacji ciężkich obliczeń ceny | `Checkout.tsx::calculatePrice` |
| 5 | localStorage cart + DB cart bez synchronizacji | `Dashboard.tsx`, `ShoppingCart.tsx` |

---

## 4. Bezpieczeństwo

✅ **Dobre:** RLS włączone na wszystkich tabelach, role w osobnej tabeli `user_roles`, użycie `has_role()` SECURITY DEFINER, encrypted SMTP/PayU/Google credentials.

⚠️ **Do poprawy:**
- Endpoint `POST /api/upload` w `server.js` **nie ma autoryzacji** - każdy może wgrać 100MB plik
- Brak rate-limiting na `/api/upload`
- Folder `/uploads` serwowany publicznie bez kontroli dostępu
- `customerIp: '127.0.0.1'` hardcoded w PayU (linia 695) - zła praktyka

---

## 5. Obszary funkcjonalne - status

| Moduł | Status | Uwagi |
|-------|--------|-------|
| Upload 3MF/STL | ⚠️ | działa lokalnie/Supabase, dev nie ma /api/upload |
| Koszyk + thumbnails | ✅ | działa, ale dual-storage (localStorage + DB) |
| Checkout | ⚠️ | model_id mapping problem (P4) |
| PayU | ✅ | webhook OK, customerIp hardcoded |
| Email (SMTP) | ✅ | szyfrowane, logi w bazie |
| Admin panel | ✅ | kompletny, dobry RLS |
| Galeria publiczna modeli | ✅ | RLS poprawne |
| Wallet/coins | ✅ | funkcje DB poprawne |
| Sesje użytkowników | ✅ | tracking + cleanup |
| Cookie consent | ✅ | konfigurowalny |
| Server (Passenger) | ✅ | po ostatnich optymalizacjach NPROC |

---

## 6. Plan napraw (priorytetowo)

### Etap 1 - Odblokowanie buildu (CRITICAL)
1. Usunąć 5 pakietów `@solana/*` z `package.json`

### Etap 2 - Naprawa krytycznych bugów
2. `ModelUpload.tsx`: warunek `import.meta.env.DEV` → zawsze Supabase w dev
3. `Checkout.tsx`: usunąć duplikat zapisu profilu (linie 555-577 vs 538-553)
4. `Checkout.tsx`: walidacja czy `item.id` jest UUID + lookup w `models` jeśli nie

### Etap 3 - Bezpieczeństwo
5. `server.js`: middleware sprawdzający JWT Supabase przed `/api/upload`
6. `Checkout.tsx`: pobierać prawdziwe IP klienta dla PayU
7. Rate-limiting na `/api/upload` (np. `express-rate-limit`)

### Etap 4 - Czystość kodu
8. Wprowadzić `logger.ts` zamiast `console.log` w produkcji
9. Rozbić `Checkout.tsx` na: `CheckoutForm`, `OrderSummary`, `PaymentSection`, `DeliverySection`
10. Memoizacja `calculatePrice` przez `useMemo`

---

## 7. Co działa dobrze

- Architektura Supabase + RLS jest solidna
- Hybrydowy storage (Multer >2MB / Supabase <2MB) to dobry pomysł
- PayU integration jest dobrze zaprojektowana
- Email system z szyfrowanymi hasłami
- Admin sidebar dobrze zorganizowany
- Server.js ma poprawne optymalizacje pod Passenger (po ostatnich zmianach)

---

## Co chcesz naprawić jako pierwsze?

Sugerowana kolejność: **Etap 1 → 2 → 3 → 4**. Etap 1 odblokuje build, Etap 2 naprawi flow zamówień, Etap 3 zabezpieczy upload, Etap 4 to długoterminowa jakość kodu.

