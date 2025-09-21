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
      <div className="flex items-center justify-center gap-2 mb-2">
        <Layers3 className="w-4 h-4 text-primary" />
        <span className="text-sm font-medium">{t('modelSelection')}</span>
        <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20">
          {models.length} {t('modelsAvailable')}
        </Badge>
      </div>
      
      {/* Numerowane przyciski */}
      <div className="flex flex-wrap justify-center gap-2">
        {models.map((model, index) => (
          <Button
            key={model.index}
            variant={selectedModelIndex === model.index ? "default" : "outline"}
            size="sm"
            onClick={() => onModelSelect(model.index)}
            className={`min-w-[2.5rem] h-8 px-2 text-xs font-medium ${
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

      {/* Nazwa aktualnego modelu */}
      <div className="text-center">
        <p className="text-xs text-muted-foreground truncate max-w-full">
          {models[selectedModelIndex]?.name || `${t('model')} ${selectedModelIndex + 1}`}
        </p>
      </div>
    </div>
  );
};