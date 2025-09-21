export type Language = 'pl' | 'en';

export const translations = {
  pl: {
    // Header
    appTitle: '3D Model Viewer',
    appSubtitle: 'Wczytaj i wyświetl pliki STL i 3MF z interaktywnymi kontrolkami',
    
    // File Upload
    uploadTitle: 'Przeciągnij i upuść pliki 3D tutaj',
    uploadSubtitle: 'Obsługiwane formaty: STL, 3MF',
    uploadButton: 'Wybierz pliki',
    uploadFileSelected: 'Plik wybrany:',
    uploadSuccess: 'Model "{fileName}" załadowany pomyślnie!',
    uploadError: 'Nie udało się załadować pliku modelu',
    
    // Control Panel
    modelInfo: 'Informacje o modelu',
    color: 'Kolor',
    controls: 'Kontrolki',
    reset: 'Resetuj',
    export: 'Eksportuj',
    exportPNG: 'Eksportuj jako PNG',
    exportJPG: 'Eksportuj jako JPG',
    exportPDF: 'Eksportuj jako PDF',
    
    // Settings
    language: 'Język',
    theme: 'Motyw',
    themeLight: 'Jasny',
    themeDark: 'Ciemny',
    themeSystem: 'Dostosowany do urządzenia',
    
    // Instructions
    instructionRotate: '• Lewy przycisk + przeciągnij aby obrócić',
    instructionPan: '• Prawy przycisk + przeciągnij aby przesunąć',
    instructionZoom: '• Scroll aby powiększyć/pomniejszyć',
    
    // Model Viewer
    readyTitle: 'Wczytaj plik poniżej',
    readySubtitle: 'Wczytaj plik aby rozpocząć wyświetlanie modelu 3D',
    differentModel: 'Chcesz wyświetlić inny model?',
    
    // Export messages
    exportPreparing: 'Przygotowywanie eksportu {format}...',
    exportSuccess: 'Model wyeksportowany jako {format} pomyślnie!',
    exportError: 'Eksport nie powiódł się. Spróbuj ponownie.',
    exportNoModel: 'Brak modelu 3D do eksportu',
    exportConfigError: 'Canvas nie skonfigurowany do eksportu. Proszę przeładować model.',
    
    // Reset
    resetMessage: 'Przeglądarka zresetowana'
  },
  en: {
    // Header
    appTitle: '3D Model Viewer',
    appSubtitle: 'Upload and view STL & 3MF files with interactive controls',
    
    // File Upload
    uploadTitle: 'Drag & drop 3D files here',
    uploadSubtitle: 'Supported formats: STL, 3MF',
    uploadButton: 'Choose Files',
    uploadFileSelected: 'File selected:',
    uploadSuccess: 'Model "{fileName}" loaded successfully!',
    uploadError: 'Failed to load the model file',
    
    // Control Panel
    modelInfo: 'Model Info',
    color: 'Color',
    controls: 'Controls',
    reset: 'Reset',
    export: 'Export',
    exportPNG: 'Export as PNG',
    exportJPG: 'Export as JPG',
    exportPDF: 'Export as PDF',
    
    // Settings
    language: 'Language',
    theme: 'Theme',
    themeLight: 'Light',
    themeDark: 'Dark',
    themeSystem: 'System',
    
    // Instructions
    instructionRotate: '• Left click + drag to rotate',
    instructionPan: '• Right click + drag to pan',
    instructionZoom: '• Scroll to zoom in/out',
    
    // Model Viewer
    readyTitle: 'Load file below',
    readySubtitle: 'Upload a file to start viewing your 3D model',
    differentModel: 'Want to view a different model?',
    
    // Export messages
    exportPreparing: 'Preparing {format} export...',
    exportSuccess: 'Model exported as {format} successfully!',
    exportError: 'Export failed. Please try again.',
    exportNoModel: 'No 3D model to export',
    exportConfigError: 'Canvas not configured for export. Please reload the model.',
    
    // Reset
    resetMessage: 'Viewer reset'
  }
};

export const useTranslation = (language: Language = 'pl') => {
  const t = (key: keyof typeof translations.pl, params?: Record<string, string>) => {
    let text = translations[language][key] || translations.pl[key];
    
    if (params) {
      Object.entries(params).forEach(([param, value]) => {
        text = text.replace(`{${param}}`, value);
      });
    }
    
    return text;
  };
  
  return { t };
};