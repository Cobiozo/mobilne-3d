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
    modelInfo: 'Nazwa',
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
    fileName: 'Nazwa',
    
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
    adminDashboard: 'Panel Administratora',
    clientPanel: 'Panel klienta',
    profile: 'Profil',
    myModels: 'Moje modele',
    settings: 'Ustawienia',
    adminPanel: 'Panel administratora',
    signOut: 'Wyloguj się',
    upload3DModel: 'Wgraj model 3D',
    homePage: 'Strona główna',
    
    // Admin Management
    customerManagement: 'Zarządzanie klientami',
    ordersManagement: 'Zarządzanie zamówieniami',
    siteCustomization: 'Personalizacja strony',
    adminOverview: 'Przegląd administratora',
    customers: 'Klienci',
    orders: 'Zamówienia',
    notes: 'Notatki',
    personalization: 'Personalizacja',
    siteSettings: 'Ustawienia strony',
    notifications: 'Powiadomienia',
    security: 'Bezpieczeństwo',
    colors: 'Kolory',
    paymentMethods: 'Metody płatności',
    monetization: 'Monetyzacja',
    payu_settings: 'Ustawienia PayU',
    priceCoefficient: 'Współczynnik ceny',
    email_settings: 'Ustawienia Email',
    email_templates: 'Szablony Email',
    email_logs: 'Historia Email',
    cookieSettings: 'Cookie i Polityka Prywatności',
    
    // Customer Management
    viewAndManageCustomers: 'Przeglądaj i zarządzaj wszystkimi klientami',
    customersList: 'Lista klientów',
    searchCustomers: 'Szukaj klientów...',
    selectCustomer: 'Wybierz klienta',
    selectCustomerDetails: 'Wybierz klienta z listy aby zobaczyć szczegóły',
    customerDetails: 'Szczegóły klienta',
    customerNotes: 'Notatki klienta',
    orderHistory: 'Historia zamówień',
    addNote: 'Dodaj notatkę',
    generalNote: 'Ogólne',
    supportNote: 'Wsparcie',
    billingNote: 'Płatności',
    technicalNote: 'Techniczne',
    changeRole: 'Zmień rolę',
    noNotesForCustomer: 'Brak notatek dla tego klienta',
    orderHistoryComingSoon: 'Historia zamówień zostanie wkrótce dodana',
    
    // Orders Management
    viewAndManageOrders: 'Przeglądaj i zarządzaj wszystkimi zamówieniami',
    ordersList: 'Lista zamówień',
    searchOrders: 'Szukaj zamówień...',
    selectOrder: 'Wybierz zamówienie',
    selectOrderDetails: 'Wybierz zamówienie z listy aby zobaczyć szczegóły',
    orderDetails: 'Szczegóły zamówienia',
    orderNumber: 'Numer zamówienia',
    customer: 'Klient',
    quantity: 'Ilość',
    price: 'Cena',
    material: 'Materiał',
    estimatedDelivery: 'Szacowana dostawa',
    specialInstructions: 'Uwagi specjalne',
    created: 'Utworzone',
    updated: 'Zaktualizowane',
    pending: 'Oczekujące',
    processing: 'W trakcie',
    completed: 'Zakończone',
    cancelled: 'Anulowane',
    shipped: 'Wysłane',
    all: 'Wszystkie',
    revenue: 'Przychód',
    noOrdersMatchingCriteria: 'Brak zamówień spełniających kryteria',
    statusChanged: 'Status zamówienia zmieniony na',
    
    // Site Customization
    customizePageAppearance: 'Dostosuj wygląd i zawartość strony głównej',
    content: 'Treść',
    branding: 'Branding',
    features: 'Funkcje',
    advanced: 'Zaawansowane',
    homepageContent: 'Treść strony głównej',
    customizeTitlesAndDescriptions: 'Dostosuj tytuły i opisy wyświetlane na stronie głównej',
    titlePolish: 'Tytuł (Polski)',
    titleEnglish: 'Tytuł (Angielski)',
    subtitlePolish: 'Podtytuł (Polski)',
    subtitleEnglish: 'Podtytuł (Angielski)',
    heroImageUrl: 'URL obrazu tła',
    leaveEmptyForGradient: 'Pozostaw puste aby używać domyślnego gradientu',
    brandingAndIdentity: 'Branding i identyfikacja',
    setCompanyAndContact: 'Ustaw nazwę firmy i informacje kontaktowe',
    companyName: 'Nazwa firmy',
    contactEmail: 'Email kontaktowy',
    platformFeatures: 'Funkcje platformy',
    enableOrDisableFeatures: 'Włącz lub wyłącz różne funkcje platformy',
    enablePaymentSystem: 'Włącz system płatności',
    allowsCustomersToOrder: 'Pozwala klientom składać zamówienia z cenami',
    maintenanceMode: 'Tryb konserwacji',
    showsMaintenancePage: 'Wyświetla stronę konserwacji dla wszystkich użytkowników',
    advancedSettings: 'Zaawansowane ustawienia',
    configurationForAdvanced: 'Konfiguracja dla zaawansowanych użytkowników',
    featuredModels: 'Polecane modele (ID oddzielone przecinkami)',
    enterModelIds: 'Wprowadź ID modeli które mają być wyróżnione na stronie głównej',
    jsonPreview: 'Podgląd ustawień JSON',
    refresh: 'Odśwież',
    saveAll: 'Zapisz wszystko',
    allSettingsSaved: 'Wszystkie ustawienia zostały zapisane',
    
    // Overview
    overviewDescription: 'Główne statystyki i aktywność na platformie',
    allUsers: 'Wszyscy użytkownicy',
    thisMonth: 'w tym miesiącu',
    totalRevenue: 'Łączny przychód ze wszystkich zamówień',
    recentActivity: 'Ostatnia aktywność',
    latestEvents: 'Najnowsze wydarzenia na platformie',
    monthlyStats: 'Statystyki miesięczne',
    currentMonthSummary: 'Podsumowanie aktywności w bieżącym miesiącu',
    newUsers: 'Nowi użytkownicy',
    newOrders: 'Nowe zamówienia',
    newModels: 'Nowe modele',
    conversionRate: 'Współczynnik konwersji',
    newUserRegistered: 'Nowy użytkownik zarejestrował się',
    newOrderCreated: 'Nowe zamówienie zostało złożone',
    newModelUploaded: 'Nowy model 3D został wgrany',
    minutesAgo: 'min temu',
    hoursAgo: 'godz. temu',
    daysAgo: 'dni temu',
    failedToLoadStats: 'Nie udało się załadować statystyk',
    
    // Security
    cannotSelfDemote: 'Nie możesz usunąć sobie uprawnień administratora',
    lastAdminWarning: 'Nie można usunąć ostatniego administratora w systemie',
    
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
    uploadModelDescription: 'Wgraj swoje modele 3D do biblioteki',
    selectFile: 'Wybierz Plik',
    selectedFile: 'Wybrany plik',
    modelName: 'Nazwa Modelu',
    enterModelName: 'Wprowadź nazwę modelu',
    enterDescription: 'Wprowadź opis (opcjonalnie)',
    makeModelPublic: 'Udostępnij model publicznie',
    uploading: 'Wgrywanie...',
    modelUploadedSuccessfully: 'Model został pomyślnie wgrany!',
    fillAllFields: 'Proszę wypełnić wszystkie wymagane pola',
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
    
    // Analytics
    siteAnalytics: 'Statystyki strony',
    analyticsDescription: 'Przegląd ruchu i aktywności użytkowników na stronie',
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
    
    // Checkout
    availableVirtualPLN: 'Dostępne wirtualne PLN',
    useVirtualPLN: 'Użyj wirtualnych PLN',
    discount: 'Rabat (wirtualne PLN)',
    max: 'Max',
    
    // Buttons and Actions
    addToCart: 'Dodaj do koszyka',
    adding: 'Dodawanie...',
    edit: 'Edytuj',
    save: 'Zapisz',
    cancel: 'Anuluj',
    description: 'Opis',
    editModel: 'Edytuj model',
    editModelDescription: 'Zmień nazwę i opis swojego modelu',
    modelDescription: 'Opis modelu',
    addModelDescription: 'Dodaj opis modelu...',
    noDescription: 'Brak opisu',
    selectColor: 'Wybierz kolor',
    buyFor: 'Kup za',
    coins: 'monet',
    rate: 'Oceń',
    editRating: 'Edytuj',
    rateModel: 'Oceń model',
    editYourRating: 'Edytuj ocenę',
    saveRating: 'Zapisz ocenę',
    saveSettings: 'Zapisz ustawienia',
    loading: 'Ładowanie...',
    clickToView: 'Kliknij aby zobaczyć',
    yourRating: 'Twoja ocena',
    rateThisModel: 'Oceń ten model',
    yourRatingHelps: 'Twoja ocena pomoże innym użytkownikom',
    writeWhatYouThink: 'Napisz co sądzisz o tym modelu...',
    noRatings: 'Brak ocen',
    
    // Cart
    cart: 'Koszyk',
    cartEmpty: 'Koszyk jest pusty',
    cartEmptyDesc: 'Dodaj modele 3D do koszyka, aby kontynuować',
    cartItems: 'elementy',
    cartItem: 'element',
    clearCart: 'Wyczyść koszyk',
    proceedToPayment: 'Przejdź do płatności',
    totalPrice: 'Całkowita wartość',
    priceCalculated: 'Cena zostanie obliczona w checkout',
    priceNote: 'Ceny zostaną obliczone na podstawie wymiarów i materiału w następnym kroku',
    
    // Colors
    white: 'Biały',
    black: 'Czarny',
    red: 'Czerwony',
    green: 'Zielony',
    blue: 'Niebieski',
    yellow: 'Żółty',
    magenta: 'Magenta',
    cyan: 'Cyjan',
    customColor: 'Niestandardowy',
    
    // User
    myAccount: 'Moje konto',
    addresses: 'Adresy',
    admin: 'Admin',
    
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
    modelInfo: 'Name',
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
    fileName: 'Name',
    
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
    adminDashboard: 'Admin Panel',
    clientPanel: 'Client Panel',
    profile: 'Profile',
    myModels: 'My Models',
    settings: 'Settings',
    adminPanel: 'Admin Panel',
    signOut: 'Sign Out',
    upload3DModel: 'Upload 3D Model',
    homePage: 'Home Page',
    
    // Admin Management
    customerManagement: 'Customer Management',
    ordersManagement: 'Orders Management',
    siteCustomization: 'Site Customization',
    adminOverview: 'Admin Overview',
    customers: 'Customers',
    orders: 'Orders',
    notes: 'Notes',
    personalization: 'Personalization',
    siteSettings: 'Site Settings',
    notifications: 'Notifications',
    security: 'Security',
    colors: 'Colors',
    paymentMethods: 'Payment Methods',
    monetization: 'Monetization',
    payu_settings: 'PayU Settings',
    priceCoefficient: 'Price Coefficient',
    email_settings: 'Email Settings',
    email_templates: 'Email Templates',
    email_logs: 'Email History',
    cookieSettings: 'Cookie & Privacy Policy',
    
    // Customer Management
    viewAndManageCustomers: 'View and manage all customers',
    customersList: 'Customers List',
    searchCustomers: 'Search customers...',
    selectCustomer: 'Select Customer',
    selectCustomerDetails: 'Select a customer from the list to view details',
    customerDetails: 'Customer Details',
    customerNotes: 'Customer Notes',
    orderHistory: 'Order History',
    addNote: 'Add Note',
    generalNote: 'General',
    supportNote: 'Support',
    billingNote: 'Billing',
    technicalNote: 'Technical',
    changeRole: 'Change Role',
    noNotesForCustomer: 'No notes for this customer',
    orderHistoryComingSoon: 'Order history will be added soon',
    
    // Orders Management
    viewAndManageOrders: 'View and manage all orders',
    ordersList: 'Orders List',
    searchOrders: 'Search orders...',
    selectOrder: 'Select Order',
    selectOrderDetails: 'Select an order from the list to view details',
    orderDetails: 'Order Details',
    orderNumber: 'Order Number',
    customer: 'Customer',
    quantity: 'Quantity',
    price: 'Price',
    material: 'Material',
    estimatedDelivery: 'Estimated Delivery',
    specialInstructions: 'Special Instructions',
    created: 'Created',
    updated: 'Updated',
    pending: 'Pending',
    processing: 'Processing',
    completed: 'Completed',
    cancelled: 'Cancelled',
    shipped: 'Shipped',
    all: 'All',
    revenue: 'Revenue',
    noOrdersMatchingCriteria: 'No orders matching criteria',
    statusChanged: 'Order status changed to',
    
    // Site Customization
    customizePageAppearance: 'Customize homepage appearance and content',
    content: 'Content',
    branding: 'Branding',
    features: 'Features',
    advanced: 'Advanced',
    homepageContent: 'Homepage Content',
    customizeTitlesAndDescriptions: 'Customize titles and descriptions displayed on homepage',
    titlePolish: 'Title (Polish)',
    titleEnglish: 'Title (English)',
    subtitlePolish: 'Subtitle (Polish)',
    subtitleEnglish: 'Subtitle (English)',
    heroImageUrl: 'Hero Image URL',
    leaveEmptyForGradient: 'Leave empty to use default gradient',
    brandingAndIdentity: 'Branding and Identity',
    setCompanyAndContact: 'Set company name and contact information',
    companyName: 'Company Name',
    contactEmail: 'Contact Email',
    platformFeatures: 'Platform Features',
    enableOrDisableFeatures: 'Enable or disable various platform features',
    enablePaymentSystem: 'Enable Payment System',
    allowsCustomersToOrder: 'Allows customers to place orders with pricing',
    maintenanceMode: 'Maintenance Mode',
    showsMaintenancePage: 'Shows maintenance page for all users',
    advancedSettings: 'Advanced Settings',
    configurationForAdvanced: 'Configuration for advanced users',
    featuredModels: 'Featured Models (comma-separated IDs)',
    enterModelIds: 'Enter model IDs that should be featured on homepage',
    jsonPreview: 'JSON Settings Preview',
    refresh: 'Refresh',
    saveAll: 'Save All',
    allSettingsSaved: 'All settings have been saved',
    
    // Overview
    overviewDescription: 'Main statistics and platform activity',
    allUsers: 'All Users',
    thisMonth: 'this month',
    totalRevenue: 'Total revenue from all orders',
    recentActivity: 'Recent Activity',
    latestEvents: 'Latest events on the platform',
    monthlyStats: 'Monthly Statistics',
    currentMonthSummary: 'Summary of activity in the current month',
    newUsers: 'New Users',
    newOrders: 'New Orders',
    newModels: 'New Models',
    conversionRate: 'Conversion Rate',
    newUserRegistered: 'New user registered',
    newOrderCreated: 'New order was placed',
    newModelUploaded: 'New 3D model was uploaded',
    minutesAgo: 'min ago',
    hoursAgo: 'hours ago',
    daysAgo: 'days ago',
    failedToLoadStats: 'Failed to load statistics',
    
    // Security
    cannotSelfDemote: 'You cannot remove your own admin privileges',
    lastAdminWarning: 'Cannot remove the last administrator in the system',
    
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
    uploadModelDescription: 'Upload your 3D models to your library',
    selectFile: 'Select File',
    selectedFile: 'Selected file',
    modelName: 'Model Name',
    enterModelName: 'Enter model name',
    enterDescription: 'Enter description (optional)',
    makeModelPublic: 'Make model public',
    uploading: 'Uploading...',
    modelUploadedSuccessfully: 'Model uploaded successfully!',
    fillAllFields: 'Please fill in all required fields',
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
    
    // Checkout
    availableVirtualPLN: 'Available virtual PLN',
    useVirtualPLN: 'Use virtual PLN',
    discount: 'Discount (virtual PLN)',
    max: 'Max',
    
    // Buttons and Actions
    addToCart: 'Add to Cart',
    adding: 'Adding...',
    edit: 'Edit',
    save: 'Save',
    cancel: 'Cancel',
    description: 'Description',
    editModel: 'Edit Model',
    editModelDescription: 'Change your model name and description',
    modelDescription: 'Model Description',
    addModelDescription: 'Add model description...',
    noDescription: 'No description',
    selectColor: 'Select Color',
    buyFor: 'Buy for',
    coins: 'coins',
    rate: 'Rate',
    editRating: 'Edit',
    rateModel: 'Rate Model',
    editYourRating: 'Edit Rating',
    saveRating: 'Save Rating',
    saveSettings: 'Save Settings',
    loading: 'Loading...',
    clickToView: 'Click to view',
    yourRating: 'Your Rating',
    rateThisModel: 'Rate This Model',
    yourRatingHelps: 'Your rating will help other users',
    writeWhatYouThink: 'Write what you think about this model...',
    noRatings: 'No ratings',
    
    // Cart
    cart: 'Cart',
    cartEmpty: 'Cart is empty',
    cartEmptyDesc: 'Add 3D models to cart to continue',
    cartItems: 'items',
    cartItem: 'item',
    clearCart: 'Clear Cart',
    proceedToPayment: 'Proceed to Payment',
    totalPrice: 'Total Value',
    priceCalculated: 'Price will be calculated at checkout',
    priceNote: 'Prices will be calculated based on dimensions and material in the next step',
    
    // Colors
    white: 'White',
    black: 'Black',
    red: 'Red',
    green: 'Green',
    blue: 'Blue',
    yellow: 'Yellow',
    magenta: 'Magenta',
    cyan: 'Cyan',
    customColor: 'Custom',
    
    // User
    myAccount: 'My Account',
    addresses: 'Addresses',
    admin: 'Admin',
    
    // General
    error: 'Error',
    success: 'Success',
    
    // Analytics
    siteAnalytics: 'Site Analytics',
    analyticsDescription: 'Overview of traffic and user activity on the site'
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