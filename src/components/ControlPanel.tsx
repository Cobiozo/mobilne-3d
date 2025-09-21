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
  onExport?: (format: 'png' | 'jpg' | 'pdf') => void;
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
  onExport 
}: ControlPanelProps) => {
  const { language } = useApp();
  const { t } = useTranslation(language);
  return (
    <Card className="bg-viewer-panel shadow-panel border-border/50 backdrop-blur-sm">
      <div className="p-4 space-y-4">
        {/* File Info */}
        {fileName && (
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

          {/* Preset Colors */}
          <div className="grid grid-cols-6 gap-1">
            {PRESET_COLORS.map((color) => (
              <button
                key={color}
                onClick={() => onColorChange(color)}
                className={`w-6 h-6 rounded border-2 transition-all hover:scale-110 ${
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
          <div className="grid grid-cols-2 gap-2">
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
                <DropdownMenuItem onClick={() => onExport?.('png')}>
                  {t('exportPNG')}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onExport?.('jpg')}>
                  {t('exportJPG')}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onExport?.('pdf')}>
                  {t('exportPDF')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Instructions */}
        <div className="text-xs text-muted-foreground space-y-1">
          <p>{t('instructionRotate')}</p>
          <p>{t('instructionPan')}</p>
          <p>{t('instructionZoom')}</p>
        </div>
      </div>
    </Card>
  );
};