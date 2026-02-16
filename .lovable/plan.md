

# Plan: Usunięcie Solana + dodanie Multer do uploadu plików powyzej 2MB

## Problem 1: Błąd buildu - pakiet `usb` (Solana)

Pakiety `@solana/*` nie są nigdzie używane w kodzie (`src/`), ale ich zależność `usb` wymaga kompilacji natywnej (C++), co nie działa w środowisku sandbox. Rozwiązanie: **usunięcie wszystkich 5 pakietów Solana z `package.json`**.

Pakiety do usunięcia:
- `@solana/wallet-adapter-base`
- `@solana/wallet-adapter-react`
- `@solana/wallet-adapter-react-ui`
- `@solana/wallet-adapter-wallets`
- `@solana/web3.js`

## Problem 2: Dodanie Multer do server.js

Multer to middleware Express do obsługi `multipart/form-data` (uploadu plików). Pliki powyzej 2MB będą zapisywane na dysku hostingu w folderze `uploads/`.

### Zmiany w `package.json`:
- Dodanie `multer` jako zależność

### Zmiany w `server.js`:

1. Import multer i konfiguracja storage:

```javascript
import multer from 'multer';
import fs from 'fs';

// Upewnij się że folder uploads istnieje
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Konfiguracja Multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, uniqueSuffix + ext);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 }, // max 100MB
  fileFilter: (req, file, cb) => {
    const allowed = ['.stl', '.3mf'];
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, allowed.includes(ext));
  }
});
```

2. Endpoint POST `/api/upload`:

```javascript
app.post('/api/upload', upload.single('model'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }
  const fileUrl = `/uploads/${req.file.filename}`;
  res.json({
    success: true,
    fileName: req.file.originalname,
    filePath: fileUrl,
    fileSize: req.file.size
  });
});
```

3. Serwowanie folderu `uploads/` jako statyczny:

```javascript
app.use('/uploads', express.static(uploadsDir));
```

### Zmiany w `src/components/ModelUpload.tsx`:

Dodanie logiki warunkowej w `handleUpload`:
- Pliki **powyzej 2MB** -- upload przez Multer (`POST /api/upload`), URL z odpowiedzi zapisywany do bazy
- Pliki **ponizej 2MB** -- upload bezpośrednio do Supabase Storage (jak dotychczas)

```typescript
const MULTER_THRESHOLD = 2 * 1024 * 1024; // 2MB

// W handleUpload:
let fileUrl: string;

if (selectedFile.size > MULTER_THRESHOLD) {
  // Upload przez Multer na hosting
  const formData = new FormData();
  formData.append('model', selectedFile);
  const response = await fetch('/api/upload', { method: 'POST', body: formData });
  const result = await response.json();
  fileUrl = result.filePath; // np. /uploads/1234567890-model.3mf
} else {
  // Upload do Supabase Storage (istniejąca logika)
  // ...
  fileUrl = publicUrl;
}
```

### Zmiany w `src/components/FileUpload.tsx`:

Brak zmian - komponent obsługuje tylko wybór pliku, logika uploadu jest w `ModelUpload.tsx`.

## Kolejność implementacji

1. Usunięcie pakietów `@solana/*` z `package.json`
2. Dodanie `multer` do `package.json`
3. Rozbudowa `server.js` o konfigurację Multer i endpoint `/api/upload`
4. Modyfikacja `ModelUpload.tsx` - warunkowy upload przez Multer vs Supabase
5. Dodanie `/uploads` do `.gitignore`

## Szczegóły techniczne

| Element | Wartość |
|---------|---------|
| Próg Multer | 2MB |
| Max rozmiar pliku | 100MB |
| Dozwolone rozszerzenia | .stl, .3mf |
| Folder na hostingu | `./uploads/` |
| Endpoint API | `POST /api/upload` |
| Serwowanie plików | `GET /uploads/:filename` |

