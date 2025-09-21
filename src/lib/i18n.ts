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
    modelInfo: 'Nazwa pliku',
    color: 'Kolor',
    controls: 'Kontrolki',
    reset: 'Resetuj',
    export: 'Eksportuj',
    exportPNG: 'Eksportuj jako PNG',
    exportJPG: 'Eksportuj jako JPG',
    exportPDF: 'Eksportuj jako PDF',
    exportSTL: 'Eksportuj jako STL',
    
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
    resetMessage: 'Przeglądarka zresetowana',
    
    // Model Selection
    modelSelection: 'Wybór modelu',
    modelsAvailable: 'modeli dostępnych',
    model: 'Model',
    meshes: 'siatki',
    previous: 'Poprzedni',
    next: 'Następny',
    
    // Color Panel
    currentlySelected: 'Aktualnie wybrany:',
    selectCustom: 'Wybierz niestandardowy:',
    clickHint: 'Kliknij',
    fileName: 'Nazwa pliku',
    
    // Tabs
    tabModel3D: 'Model 3D',
    tabImageTo3D: 'Obraz na 3D',
    
    // Image to 3D
    imageUploadTitle: 'Przeciągnij i upuść obraz tutaj',
    imageUploadSubtitle: 'Obsługiwane formaty: JPG, PNG',
    imageUploadButton: 'Wybierz obraz',
    imageSuccess: 'Obraz "{fileName}" załadowany pomyślnie!',
    imageError: 'Nie udało się załadować obrazu',
    imageGenerating: 'Generowanie modelu 3D z obrazu...',
    imageGenerated: 'Model 3D wygenerowany z obrazu!',
    
    // Export views
    exportViewFront: 'Widok z przodu (2D)',
    exportViewTop: 'Widok z góry (2D)', 
    exportViewSide: 'Widok z boku (2D)',
    front: 'Przód',
    top: 'Góra',
    side: 'Bok',
    
    // Auth
    welcome: 'Witamy',
    authDescription: 'Zaloguj się aby uzyskać dostęp do swoich modeli 3D i panelu',
    signIn: 'Zaloguj się',
    signUp: 'Zarejestruj się',
    password: 'Hasło',
    displayName: 'Nazwa wyświetlana',
    orContinueWith: 'lub kontynuuj z',
    continueWithGoogle: 'Kontynuuj z Google',
    
    // Dashboard
    dashboard: 'Panel główny',
    profile: 'Profil',
    myModels: 'Moje modele',
    settings: 'Ustawienia',
    adminPanel: 'Panel administratora',
    signOut: 'Wyloguj się',
    upload3DModel: 'Wgraj model 3D',
    
    // Profile
    userProfile: 'Profil użytkownika',
    manageProfileInfo: 'Zarządzaj informacjami w swoim profilu',
    bio: 'Opis',
    avatarUrl: 'URL awatara',
    enterDisplayName: 'Wprowadź swoją nazwę wyświetlaną',
    tellAboutYourself: 'Opowiedz o sobie',
    saveChanges: 'Zapisz zmiany',
    saving: 'Zapisywanie...',
    profileUpdated: 'Profil zaktualizowany pomyślnie',
    
    // Models
    manageUploaded3DModels: 'Zarządzaj swoimi wgranymi modelami 3D',
    noModelsYet: 'Nie masz jeszcze modeli',
    uploadFirstModel: 'Wgraj swój pierwszy model 3D aby rozpocząć',
    uploadModel: 'Wgraj model',
    models: 'modeli',
    view: 'Wyświetl',
    makePrivate: 'Ustaw jako prywatny',
    makePublic: 'Ustaw jako publiczny',
    delete: 'Usuń',
    uploaded: 'Wgrano',
    modelDeleted: 'Model usunięty pomyślnie',
    modelVisibilityUpdated: 'Widoczność modelu zaktualizowana',
    
    // Admin
    manageUsersAndContent: 'Zarządzaj użytkownikami i treścią na platformie',
    users: 'Użytkownicy',
    manageUserRoles: 'Zarządzaj rolami i uprawnieniami użytkowników',
    unnamedUser: 'Użytkownik bez nazwy',
    removeAdmin: 'Usuń uprawnienia administratora',
    makeAdmin: 'Nadaj uprawnienia administratora',
    allModels: 'Wszystkie modele',
    manageAllUploaded3DModels: 'Zarządzaj wszystkimi wgranymi modelami 3D',
    by: 'przez',
    public: 'Publiczny',
    private: 'Prywatny',
    andMore: 'i {count} więcej...',
    userRoleUpdated: 'Rola użytkownika zaktualizowana pomyślnie',
    
    // Settings
    manageAccountSettings: 'Zarządzaj ustawieniami konta',
    settingsComingSoon: 'Panel ustawień już wkrótce...',
    
    // General
    error: 'Błąd',
    success: 'Sukces'
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
    modelInfo: 'File name',
    color: 'Color',
    controls: 'Controls',
    reset: 'Reset',
    export: 'Export',
    exportPNG: 'Export as PNG',
    exportJPG: 'Export as JPG', 
    exportPDF: 'Export as PDF',
    exportSTL: 'Export as STL',
    
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
    resetMessage: 'Viewer reset',
    
    // Model Selection
    modelSelection: 'Model Selection',
    modelsAvailable: 'models available',
    model: 'Model',
    meshes: 'meshes',
    previous: 'Previous',
    next: 'Next',
    
    // Color Panel
    currentlySelected: 'Currently selected:',
    selectCustom: 'Select custom:',
    clickHint: 'Click',
    fileName: 'File name',
    
    // Tabs
    tabModel3D: '3D Model',
    tabImageTo3D: 'Image to 3D',
    
    // Image to 3D
    imageUploadTitle: 'Drag & drop image here',
    imageUploadSubtitle: 'Supported formats: JPG, PNG',
    imageUploadButton: 'Choose Image',
    imageSuccess: 'Image "{fileName}" loaded successfully!',
    imageError: 'Failed to load the image',
    imageGenerating: 'Generating 3D model from image...',
    imageGenerated: '3D model generated from image!',
    
    // Export views
    exportViewFront: 'Front View (2D)',
    exportViewTop: 'Top View (2D)',
    exportViewSide: 'Side View (2D)',
    front: 'Front',
    top: 'Top',
    side: 'Side',
    
    // Auth
    welcome: 'Welcome',
    authDescription: 'Sign in to access your 3D models and dashboard',
    signIn: 'Sign In',
    signUp: 'Sign Up',
    password: 'Password',
    displayName: 'Display Name',
    orContinueWith: 'or continue with',
    continueWithGoogle: 'Continue with Google',
    
    // Dashboard
    dashboard: 'Dashboard',
    profile: 'Profile',
    myModels: 'My Models',
    settings: 'Settings',
    adminPanel: 'Admin Panel',
    signOut: 'Sign Out',
    upload3DModel: 'Upload 3D Model',
    
    // Profile
    userProfile: 'User Profile',
    manageProfileInfo: 'Manage your profile information',
    bio: 'Bio',
    avatarUrl: 'Avatar URL',
    enterDisplayName: 'Enter your display name',
    tellAboutYourself: 'Tell us about yourself',
    saveChanges: 'Save Changes',
    saving: 'Saving...',
    profileUpdated: 'Profile updated successfully',
    
    // Models
    manageUploaded3DModels: 'Manage your uploaded 3D models',
    noModelsYet: 'No models yet',
    uploadFirstModel: 'Upload your first 3D model to get started',
    uploadModel: 'Upload Model',
    models: 'models',
    view: 'View',
    makePrivate: 'Make Private',
    makePublic: 'Make Public',
    delete: 'Delete',
    uploaded: 'Uploaded',
    modelDeleted: 'Model deleted successfully',
    modelVisibilityUpdated: 'Model visibility updated',
    
    // Admin
    manageUsersAndContent: 'Manage users and content across the platform',
    users: 'Users',
    manageUserRoles: 'Manage user roles and permissions',
    unnamedUser: 'Unnamed User',
    removeAdmin: 'Remove Admin',
    makeAdmin: 'Make Admin',
    allModels: 'All Models',
    manageAllUploaded3DModels: 'Manage all uploaded 3D models',
    by: 'by',
    public: 'Public',
    private: 'Private',
    andMore: 'and {count} more...',
    userRoleUpdated: 'User role updated successfully',
    
    // Settings
    manageAccountSettings: 'Manage your account settings',
    settingsComingSoon: 'Settings panel coming soon...',
    
    // General
    error: 'Error',
    success: 'Success'
  }
};

export const getText = (key: keyof typeof translations.pl, language: Language = 'pl', params?: Record<string, string>) => {
  let text = translations[language][key] || translations.pl[key];
  
  if (params) {
    Object.entries(params).forEach(([param, value]) => {
      text = text.replace(`{${param}}`, value);
    });
  }
  
  return text;
};

export const useTranslation = (language: Language = 'pl') => {
  const t = (key: keyof typeof translations.pl, params?: Record<string, string>) => {
    return getText(key, language, params);
  };
  
  return { t };
};