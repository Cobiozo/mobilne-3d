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
      {/* Nazwa pliku - oddzielna sekcja */}
      <div className="text-center mb-6 p-3 bg-card/30 rounded-lg">
        <span className="text-sm font-medium text-foreground block">
          {models[0]?.name?.split(' - ')[0] || 'Model File'}
        </span>
      </div>
      
      {/* Przyciski w zupełnie oddzielnej sekcji */}
      <div className="mt-6 pt-4">
        <div className="flex justify-center items-center gap-4">
          {models.map((model, index) => (
            <Button
              key={model.index}
              variant={selectedModelIndex === model.index ? "default" : "outline"}
              size="sm"
              onClick={() => onModelSelect(model.index)}
              className={`w-12 h-12 px-0 text-base font-bold rounded-lg ${
                selectedModelIndex === model.index 
                  ? 'bg-primary text-primary-foreground shadow-lg ring-2 ring-primary/30' 
                  : 'hover:bg-primary/10 hover:text-primary hover:border-primary/50'
              }`}
              title={`Model ${index + 1}: ${model.name}`}
            >
              {index + 1}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
};