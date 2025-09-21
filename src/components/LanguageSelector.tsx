import { Languages } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useApp } from "@/contexts/AppContext";
import { useTranslation } from "@/lib/i18n";

export const LanguageSelector = () => {
  const { language, setLanguage } = useApp();
  const { t } = useTranslation(language);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Languages className="w-4 h-4" />
          <span className="hidden sm:inline">
            {language === 'pl' ? 'PL' : 'EN'}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48 bg-popover border border-border shadow-lg z-50">
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
      </DropdownMenuContent>
    </DropdownMenu>
  );
};