import { Palette, RotateCcw, ZoomIn, ZoomOut, Download, Info, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useApp } from "@/contexts/AppContext";
import { useTranslation } from "@/lib/i18n";

interface ControlPanelProps {
  modelColor: string;
  onColorChange: (color: string) => void;
  fileName?: string;
  onReset?: () => void;
  onExport?: (format: 'png' | 'jpg' | 'pdf', view: '2d-front' | '2d-top' | '2d-side') => void;
  // Dodane dla ModelSelector
  availableModels?: Array<{name: string; index: number; meshCount: number}>;
  selectedModelIndex?: number;
  onModelSelect?: (index: number) => void;
}

const PRESET_COLORS = [
  "#4F8EF7", // Blue
  "#9B6BF2", // Purple  
  "#22C55E", // Green
  "#EF4444", // Red
  "#F59E0B", // Orange
  "#8B5CF6", // Violet
  "#06B6D4", // Cyan
  "#EC4899", // Pink
  "#64748B", // Slate
  "#000000", // Black
  "#FFFFFF", // White
  "#6B7280", // Gray
];

export const ControlPanel = ({ 
  modelColor, 
  onColorChange, 
  fileName,
  onReset,
  onExport,
  availableModels = [],
  selectedModelIndex = 0,
  onModelSelect
}: ControlPanelProps) => {
  const { language } = useApp();
  const { t } = useTranslation(language);
  return (
    <Card className="bg-viewer-panel shadow-panel border-border/50 backdrop-blur-sm">
      <div className="p-3 sm:p-4 space-y-3 sm:space-y-4">
        {/* Model Selector zamiast File Info */}
        {fileName && availableModels.length > 1 && onModelSelect && (
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-4">
              {/* Kolumna 1: Nazwa pliku */}
              <div className="flex-1 min-w-0">
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-medium text-muted-foreground">Nazwa pliku</span>
                  <span className="text-sm text-foreground truncate">
                    {availableModels[0]?.name?.split(' - ')[0] || fileName}
                  </span>
                </div>
              </div>
              
              {/* Kolumna 2: Przyciski */}
              <div className="flex items-center gap-2">
                {availableModels.map((model, index) => (
                  <Button
                    key={model.index}
                    variant={selectedModelIndex === model.index ? "default" : "outline"}
                    size="sm"
                    onClick={() => onModelSelect(model.index)}
                    className={`w-8 h-8 text-xs font-medium ${
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
        )}
        
        {/* Fallback dla pojedynczego modelu */}
        {fileName && availableModels.length <= 1 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium">{t('modelInfo')}</span>
            </div>
            <Badge variant="secondary" className="text-xs">
              {fileName}
            </Badge>
          </div>
        )}

        <Separator />

        {/* Color Controls */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Palette className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium">{t('color')}</span>
          </div>
          
          {/* Current Color Display */}
          <div className="flex items-center gap-2">
            <div 
              className="w-8 h-8 rounded-md border-2 border-border"
              style={{ backgroundColor: modelColor }}
            />
            <input
              type="color"
              value={modelColor}
              onChange={(e) => onColorChange(e.target.value)}
              className="w-16 h-8 rounded border border-border bg-transparent cursor-pointer"
            />
          </div>

          {/* Preset Colors - Responsive grid */}
          <div className="grid grid-cols-6 sm:grid-cols-8 lg:grid-cols-6 gap-1 sm:gap-1.5">
            {PRESET_COLORS.map((color) => (
              <button
                key={color}
                onClick={() => onColorChange(color)}
                className={`w-5 h-5 sm:w-6 sm:h-6 rounded border-2 transition-all hover:scale-110 ${
                  modelColor.toLowerCase() === color.toLowerCase() 
                    ? 'border-primary shadow-glow' 
                    : 'border-border hover:border-primary/50'
                }`}
                style={{ backgroundColor: color }}
                title={color}
              />
            ))}
          </div>
        </div>

        <Separator />

        {/* Controls */}
        <div className="space-y-2">
          <span className="text-sm font-medium">{t('controls')}</span>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              className="text-xs"
              onClick={onReset}
            >
              <RotateCcw className="w-3 h-3 mr-1" />
              {t('reset')}
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="text-xs"
                  disabled={!fileName}
                >
                  <Download className="w-3 h-3 mr-1" />
                  {t('export')}
                  <ChevronDown className="w-3 h-3 ml-1" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <div className="px-2 py-1.5 text-sm font-semibold text-muted-foreground">
                  Widok z przodu (2D)
                </div>
                <DropdownMenuItem onClick={() => onExport?.('png', '2d-front')}>
                  Eksportuj PNG - Przód
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onExport?.('jpg', '2d-front')}>
                  Eksportuj JPG - Przód
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onExport?.('pdf', '2d-front')}>
                  Eksportuj PDF - Przód
                </DropdownMenuItem>
                
                <div className="px-2 py-1.5 text-sm font-semibold text-muted-foreground border-t mt-1 pt-2">
                  Widok z góry (2D)
                </div>
                <DropdownMenuItem onClick={() => onExport?.('png', '2d-top')}>
                  Eksportuj PNG - Góra
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onExport?.('jpg', '2d-top')}>
                  Eksportuj JPG - Góra
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onExport?.('pdf', '2d-top')}>
                  Eksportuj PDF - Góra
                </DropdownMenuItem>
                
                <div className="px-2 py-1.5 text-sm font-semibold text-muted-foreground border-t mt-1 pt-2">
                  Widok z boku (2D)
                </div>
                <DropdownMenuItem onClick={() => onExport?.('png', '2d-side')}>
                  Eksportuj PNG - Bok
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onExport?.('jpg', '2d-side')}>
                  Eksportuj JPG - Bok
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onExport?.('pdf', '2d-side')}>
                  Eksportuj PDF - Bok
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Instructions - Hidden on very small screens */}
        <div className="text-xs text-muted-foreground space-y-1 hidden sm:block">
          <p>{t('instructionRotate')}</p>
          <p>{t('instructionPan')}</p>
          <p>{t('instructionZoom')}</p>
        </div>
      </div>
    </Card>
  );
};