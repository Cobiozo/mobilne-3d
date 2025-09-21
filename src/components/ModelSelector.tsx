import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useApp } from "@/contexts/AppContext";
import { useTranslation } from "@/lib/i18n";
import { Layers3 } from "lucide-react";

interface ModelInfo {
  name: string;
  index: number;
  meshCount: number;
}

interface ModelSelectorProps {
  models: ModelInfo[];
  selectedModelIndex: number;
  onModelSelect: (index: number) => void;
  className?: string;
}

export const ModelSelector = ({ 
  models, 
  selectedModelIndex, 
  onModelSelect, 
  className 
}: ModelSelectorProps) => {
  const { language } = useApp();
  const { t } = useTranslation(language);

  console.log('ModelSelector render - models:', models, 'selectedIndex:', selectedModelIndex);

  if (models.length <= 1) {
    console.log('ModelSelector hidden - only', models.length, 'models');
    return null;
  }

  return (
    <div className={`w-full ${className}`}>
      <div className="flex items-center justify-between gap-6">
        {/* Kolumna 1: Nazwa pliku */}
        <div className="flex-1">
          <div className="flex flex-col gap-1">
            <span className="text-sm font-medium text-muted-foreground">Nazwa pliku</span>
            <span className="text-sm text-foreground">
              {models[0]?.name?.split(' - ')[0] || 'Model File'}
            </span>
          </div>
        </div>
        
        {/* Kolumna 2: Przyciski */}
        <div className="flex items-center gap-3">
          {models.map((model, index) => (
            <Button
              key={model.index}
              variant={selectedModelIndex === model.index ? "default" : "outline"}
              size="sm"
              onClick={() => onModelSelect(model.index)}
              className={`w-10 h-10 text-sm font-medium ${
                selectedModelIndex === model.index 
                  ? 'bg-primary text-primary-foreground shadow-md' 
                  : 'hover:bg-primary/10 hover:text-primary'
              }`}
              title={`Model ${index + 1}`}
            >
              {index + 1}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
};