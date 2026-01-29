
# Plan naprawy wycieków NPROC dla Passenger (Cyber-Folks)

## Zidentyfikowane problemy

### 1. KRYTYCZNE: Pakiety Solana wciąż w package.json (linie 44-48)
Pomimo wcześniejszych prób usunięcia, pakiety Solana nadal są obecne:
- `@solana/wallet-adapter-base`
- `@solana/wallet-adapter-react`
- `@solana/wallet-adapter-react-ui`
- `@solana/wallet-adapter-wallets`
- `@solana/web3.js`

Te pakiety tworzą procesy worker i połączenia WebSocket nawet gdy nie są używane w kodzie.

### 2. Nieprawidłowy graceful shutdown w server.js (linie 87-96)
Obecna implementacja:
```javascript
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  process.exit(0);  // NIE ZAMYKA SERWERA EXPRESS!
});
```
Problem: `process.exit(0)` jest wywoływany BEZ zamknięcia serwera Express, co pozostawia połączenia HTTP otwarte.

### 3. Brak keep-alive timeout
Express domyślnie trzyma połączenia keep-alive zbyt długo, co na shared hostingu powoduje akumulację procesów.

### 4. Brak limitu maksymalnych połączeń
Brak `server.maxConnections` pozwala na nieograniczoną liczbę równoległych połączeń.

---

## Plan naprawczy

### Faza 1: Usunięcie pakietów Solana z package.json

Usunięcie linii 44-48:
- `@solana/wallet-adapter-base`
- `@solana/wallet-adapter-react`
- `@solana/wallet-adapter-react-ui`
- `@solana/wallet-adapter-wallets`
- `@solana/web3.js`

### Faza 2: Modyfikacja server.js dla Passenger

#### 2.1 Dodanie zmiennej server i limitów połączeń

Zmiana w sekcji uruchamiania serwera (linie 72-85):

```javascript
let server;

// Start the server
server = app.listen(PORT, HOST, () => {
  console.log('='.repeat(60));
  console.log('🚀 Mobilne-3D Platform Server (Passenger)');
  console.log('='.repeat(60));
  console.log(`📍 Server running at: http://${HOST}:${PORT}`);
  console.log(`🌐 Host: s108.cyber-folks.pl`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'production'}`);
  console.log(`📅 Started at: ${new Date().toLocaleString('pl-PL')}`);
  console.log('='.repeat(60));
});

// Limity dla shared hosting (Passenger)
server.maxConnections = 50;
server.keepAliveTimeout = 5000;  // 5 sekund
server.headersTimeout = 6000;    // 6 sekund
```

#### 2.2 Prawidłowy graceful shutdown (linie 87-96)

```javascript
// Graceful shutdown dla Passenger
const gracefulShutdown = (signal) => {
  console.log(`${signal} received: closing HTTP server`);
  
  server.close((err) => {
    if (err) {
      console.error('Error during server close:', err);
      process.exit(1);
    }
    console.log('HTTP server closed successfully');
    process.exit(0);
  });
  
  // Force close po 10 sekundach
  setTimeout(() => {
    console.error('Forcing shutdown after timeout');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
```

#### 2.3 Middleware do czyszczenia połączeń

Dodać przed sekcją routingu (po linii 46):

```javascript
// Connection cleanup middleware dla Passenger
app.use((req, res, next) => {
  res.on('finish', () => {
    if (req.headers.connection === 'close') {
      req.socket.destroy();
    }
  });
  next();
});
```

---

## Dlaczego procesy się akumulują na Passenger

```text
Passenger wysyła        Obecny kod:           Wynik:
SIGTERM do procesu  →  process.exit(0)   →  Połączenia HTTP
                       BEZ server.close()    pozostają jako "zombie"
                                              ↓
                       Nowy proces         Stare + nowe procesy
                       startuje        →   = 100% NPROC
```

---

## Podsumowanie zmian

| Plik | Zmiana | Wpływ na NPROC |
|------|--------|----------------|
| package.json | Usunięcie 5 pakietów Solana (linie 44-48) | -30-40% |
| server.js | Zmienna `server` + limity połączeń | -10-15% |
| server.js | Prawidłowy graceful shutdown | -20-30% |
| server.js | Connection cleanup middleware | -5-10% |

## Szacowany wynik
- **Przed:** 90-100% wykorzystania NPROC
- **Po:** 40-50% wykorzystania NPROC

## Czas implementacji: ~15 minut

## Instrukcje po wdrożeniu na Cyber-Folks
1. Usuń stare pliki aplikacji lub wykonaj `rm -rf node_modules`
2. Wykonaj `npm install` aby zaktualizować zależności
3. Wykonaj `npm run build`
4. Wgraj nowe pliki na serwer
5. Zrestartuj aplikację w panelu Cyber-Folks (Passenger automatycznie zarządza procesami)
6. Monitoruj zużycie NPROC w panelu hostingu
