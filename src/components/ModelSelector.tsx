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
    <div className={`space-y-3 ${className}`}>
      {/* Tylko nazwa pliku - bez dodatkowych informacji */}
      <div className="text-center">
        <span className="text-sm font-medium text-muted-foreground">
          {models[0]?.name?.split(' - ')[0] || 'Model File'}
        </span>
      </div>
      
      {/* Przyciski obok siebie */}
      <div className="flex justify-center items-center gap-2 flex-wrap">
        {models.map((model, index) => (
          <Button
            key={model.index}
            variant={selectedModelIndex === model.index ? "default" : "outline"}
            size="sm"
            onClick={() => onModelSelect(model.index)}
            className={`w-10 h-8 px-0 text-sm font-medium ${
              selectedModelIndex === model.index 
                ? 'bg-primary text-primary-foreground shadow-md' 
                : 'hover:bg-primary/10 hover:text-primary hover:border-primary/50'
            }`}
            title={model.name}
          >
            {index + 1}
          </Button>
        ))}
      </div>
    </div>
  );
};