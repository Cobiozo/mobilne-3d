

# Plan dodatkowych optymalizacji server.js dla Passenger

## Zidentyfikowane problemy do naprawy

### Problem 1: Brak obsługi SIGHUP
Passenger czasami wysyła SIGHUP przy restarcie aplikacji - obecny kod nie obsługuje tego sygnału.

### Problem 2: Timer blokuje zamknięcie procesu
Obecny `setTimeout()` w gracefulShutdown utrzymuje proces przy życiu nawet gdy server.close() nie może się wykonać. Potrzebne jest użycie `timer.unref()`.

### Problem 3: Zbyt długi timeout (10s)
Na shared hostingu 10 sekund to za długo - Passenger może wysłać SIGKILL wcześniej.

### Problem 4: Połączenia keep-alive blokują zamknięcie
Middleware sprawdza tylko `req.headers.connection === 'close'`, ale większość połączeń HTTP/1.1 używa keep-alive.

---

## Plan zmian w server.js

### 1. Wymuszenie Connection: close na wszystkich odpowiedziach

Zmiana middleware (linie 35-43):
```javascript
// Force Connection: close dla Passenger - szybsze zwalnianie zasobów
app.use((req, res, next) => {
  // Wymusz zamknięcie połączenia po każdej odpowiedzi
  res.setHeader('Connection', 'close');
  
  res.on('finish', () => {
    // Zniszcz socket natychmiast po zakończeniu
    if (req.socket && !req.socket.destroyed) {
      req.socket.destroy();
    }
  });
  next();
});
```

**Dlaczego:** Na shared hostingu z Passenger, utrzymywanie połączeń keep-alive nie ma sensu - Passenger i tak zarządza poolem procesów. Wymuszenie `Connection: close` pozwala szybciej zwalniać zasoby.

### 2. Dodanie SIGHUP i użycie timer.unref()

Zmiana gracefulShutdown (linie 95-116):
```javascript
// Graceful shutdown dla Passenger
const gracefulShutdown = (signal) => {
  console.log(`${signal} received: closing HTTP server`);
  
  // Zatrzymaj przyjmowanie nowych połączeń
  server.close((err) => {
    if (err) {
      console.error('Error during server close:', err);
      process.exit(1);
    }
    console.log('HTTP server closed successfully');
    process.exit(0);
  });
  
  // Force close po 5 sekundach (krótszy timeout dla shared hosting)
  // .unref() pozwala procesowi zakończyć się nawet jeśli timer jest aktywny
  const forceExitTimer = setTimeout(() => {
    console.error('Forcing shutdown after timeout');
    process.exit(1);
  }, 5000);
  forceExitTimer.unref();
};

// Obsługa wszystkich sygnałów używanych przez Passenger
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGHUP', () => gracefulShutdown('SIGHUP'));
```

**Dlaczego:**
- `timer.unref()` - timer nie będzie blokował zamknięcia procesu
- SIGHUP - Passenger może używać tego sygnału przy restarcie
- 5s zamiast 10s - szybsze zwolnienie zasobów

### 3. Dodanie aktywnego zamykania połączeń przy shutdown

Dodatkowa logika w gracefulShutdown:
```javascript
const gracefulShutdown = (signal) => {
  console.log(`${signal} received: closing HTTP server`);
  
  // Zamknij wszystkie aktywne połączenia
  server.closeAllConnections();
  
  server.close((err) => {
    // ...
  });
  
  // ...
};
```

**Uwaga:** `server.closeAllConnections()` jest dostępne od Node.js 18.2.0. Jeśli hosting używa starszej wersji, ta metoda nie zadziała (ale nie spowoduje błędu).

---

## Podsumowanie zmian

| Zmiana | Lokalizacja | Wpływ |
|--------|-------------|-------|
| `Connection: close` na wszystkich odpowiedziach | linie 35-43 | Szybsze zwalnianie połączeń |
| `timer.unref()` | linia 109 | Proces może się zamknąć mimo aktywnego timera |
| Timeout 5s zamiast 10s | linia 108 | Szybsze zwolnienie przy SIGTERM |
| Obsługa SIGHUP | nowa linia | Passenger restart handling |
| `server.closeAllConnections()` | gracefulShutdown | Natychmiastowe zamknięcie połączeń |

## Szacowany wpływ
- Szybsze zwalnianie procesów przy restart
- Mniejsza akumulacja "zombie" połączeń
- Lepsze współdziałanie z Passenger pool management

## Czas implementacji: ~10 minut

