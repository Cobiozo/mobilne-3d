import { Languages, Sun, Moon, Monitor, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { useTheme } from "next-themes";
import { useApp } from "@/contexts/AppContext";
import { useTranslation } from "@/lib/i18n";

export const LanguageThemeSelector = () => {
  const { theme, setTheme } = useTheme();
  const { language, setLanguage } = useApp();
  const { t } = useTranslation(language);

  const getThemeIcon = () => {
    switch (theme) {
      case 'light': return <Sun className="w-4 h-4" />;
      case 'dark': return <Moon className="w-4 h-4" />;
      default: return <Monitor className="w-4 h-4" />;
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Settings className="w-4 h-4" />
          <span className="hidden sm:inline">
            {language === 'pl' ? 'PL' : 'EN'}
          </span>
          {getThemeIcon()}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={5} className="w-48 bg-background border border-border shadow-lg z-50">
        <div className="px-2 py-1.5 text-sm font-semibold text-muted-foreground">
          {t('language')}
        </div>
        <DropdownMenuItem 
          onClick={() => setLanguage('pl')}
          className={language === 'pl' ? 'bg-accent' : ''}
        >
          <Languages className="w-4 h-4 mr-2" />
          Polski
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={() => setLanguage('en')}
          className={language === 'en' ? 'bg-accent' : ''}
        >
          <Languages className="w-4 h-4 mr-2" />
          English
        </DropdownMenuItem>
        
        <DropdownMenuSeparator />
        
        <div className="px-2 py-1.5 text-sm font-semibold text-muted-foreground">
          {t('theme')}
        </div>
        <DropdownMenuItem 
          onClick={() => setTheme('light')}
          className={theme === 'light' ? 'bg-accent' : ''}
        >
          <Sun className="w-4 h-4 mr-2" />
          {t('themeLight')}
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={() => setTheme('dark')}
          className={theme === 'dark' ? 'bg-accent' : ''}
        >
          <Moon className="w-4 h-4 mr-2" />
          {t('themeDark')}
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={() => setTheme('system')}
          className={theme === 'system' ? 'bg-accent' : ''}
        >
          <Monitor className="w-4 h-4 mr-2" />
          {t('themeSystem')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};