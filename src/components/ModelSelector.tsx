import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useApp } from "@/contexts/AppContext";
import { useTranslation } from "@/lib/i18n";
import { Box, Layers3 } from "lucide-react";

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

  if (models.length <= 1) return null;

  return (
    <div className={`space-y-3 ${className}`}>
      <div className="flex items-center gap-2">
        <Layers3 className="w-4 h-4 text-primary" />
        <span className="text-sm font-medium">{t('modelSelection')}</span>
        <Badge variant="secondary" className="ml-auto">
          {models.length} {t('modelsAvailable')}
        </Badge>
      </div>
      
      <Select 
        value={selectedModelIndex.toString()} 
        onValueChange={(value) => onModelSelect(parseInt(value))}
      >
        <SelectTrigger className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {models.map((model) => (
            <SelectItem key={model.index} value={model.index.toString()}>
              <div className="flex items-center gap-2">
                <Box className="w-3 h-3" />
                <span>
                  {model.name || `${t('model')} ${model.index + 1}`}
                </span>
                <Badge variant="outline" className="ml-auto text-xs">
                  {model.meshCount} {t('meshes')}
                </Badge>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <div className="grid grid-cols-2 gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onModelSelect(Math.max(0, selectedModelIndex - 1))}
          disabled={selectedModelIndex === 0}
          className="text-xs"
        >
          ← {t('previous')}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onModelSelect(Math.min(models.length - 1, selectedModelIndex + 1))}
          disabled={selectedModelIndex === models.length - 1}
          className="text-xs"
        >
          {t('next')} →
        </Button>
      </div>
    </div>
  );
};