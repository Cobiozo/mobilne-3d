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
    <div className={`w-full max-w-sm mx-auto ${className}`}>
      {/* Nazwa pliku */}
      <div className="text-center mb-8">
        <h3 className="text-base font-semibold text-foreground">
          {models[0]?.name?.split(' - ')[0] || 'Model File'}
        </h3>
      </div>
      
      {/* Przyciski w osobnej sekcji z dużym marginesem */}
      <div className="text-center">
        <div className="inline-flex items-center justify-center gap-3 p-2">
          {models.map((model, index) => (
            <Button
              key={model.index}
              variant={selectedModelIndex === model.index ? "default" : "outline"}
              size="lg"
              onClick={() => onModelSelect(model.index)}
              className={`w-14 h-14 text-lg font-bold ${
                selectedModelIndex === model.index 
                  ? 'bg-primary text-primary-foreground shadow-lg' 
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