import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Sparkles, Box, Cylinder, Circle, Triangle, Star, Loader2 } from "lucide-react";

export interface AIAnalysis {
  objectType: string;
  objectName: string;
  dimensions: {
    widthRatio: number;
    heightRatio: number;
    depthRatio: number;
  };
  features: string[];
  suggestedGeometry: string;
  complexity: string;
  symmetry: string;
  confidence: number;
  colors: string[];
  material: string;
}

interface AIAnalysisPreviewProps {
  analysis: AIAnalysis | null;
  isLoading?: boolean;
}

const getGeometryIcon = (geometry: string) => {
  switch (geometry) {
    case 'box':
      return <Box className="h-5 w-5" />;
    case 'cylinder':
      return <Cylinder className="h-5 w-5" />;
    case 'sphere':
      return <Circle className="h-5 w-5" />;
    case 'cone':
      return <Triangle className="h-5 w-5" />;
    default:
      return <Star className="h-5 w-5" />;
  }
};

const getComplexityColor = (complexity: string) => {
  switch (complexity) {
    case 'simple':
      return 'bg-green-500/10 text-green-500 border-green-500/20';
    case 'medium':
      return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
    case 'complex':
      return 'bg-red-500/10 text-red-500 border-red-500/20';
    default:
      return 'bg-muted text-muted-foreground';
  }
};

const getObjectTypeLabel = (type: string) => {
  const labels: Record<string, string> = {
    furniture: 'Mebel',
    vehicle: 'Pojazd',
    character: 'Postać',
    tool: 'Narzędzie',
    decoration: 'Dekoracja',
    abstract: 'Abstrakcja',
    animal: 'Zwierzę',
    building: 'Budynek',
    food: 'Jedzenie',
    plant: 'Roślina'
  };
  return labels[type] || type;
};

const getMaterialLabel = (material: string) => {
  const labels: Record<string, string> = {
    metal: 'Metal',
    wood: 'Drewno',
    plastic: 'Plastik',
    glass: 'Szkło',
    fabric: 'Tkanina',
    organic: 'Organiczny',
    mixed: 'Mieszany'
  };
  return labels[material] || material;
};

export const AIAnalysisPreview = ({ analysis, isLoading }: AIAnalysisPreviewProps) => {
  if (isLoading) {
    return (
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
            Analiza AI w toku...
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="h-4 bg-muted animate-pulse rounded" />
            <div className="h-4 bg-muted animate-pulse rounded w-3/4" />
            <div className="h-4 bg-muted animate-pulse rounded w-1/2" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!analysis) {
    return null;
  }

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          Analiza AI: {analysis.objectName}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Object Type & Confidence */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              {getObjectTypeLabel(analysis.objectType)}
            </Badge>
            <Badge variant="outline" className={`text-xs ${getComplexityColor(analysis.complexity)}`}>
              {analysis.complexity === 'simple' ? 'Prosty' : analysis.complexity === 'medium' ? 'Średni' : 'Złożony'}
            </Badge>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>Pewność:</span>
            <Progress value={analysis.confidence * 100} className="w-16 h-2" />
            <span>{Math.round(analysis.confidence * 100)}%</span>
          </div>
        </div>

        {/* Geometry & Symmetry */}
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-1.5">
            {getGeometryIcon(analysis.suggestedGeometry)}
            <span className="text-muted-foreground">Bazowy kształt</span>
          </div>
          <Badge variant="secondary" className="text-xs">
            {analysis.symmetry === 'symmetric' ? 'Symetryczny' : 'Asymetryczny'}
          </Badge>
          <Badge variant="secondary" className="text-xs">
            {getMaterialLabel(analysis.material)}
          </Badge>
        </div>

        {/* Dimensions */}
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">Proporcje wymiarów:</p>
          <div className="flex gap-2">
            <div className="flex-1">
              <div className="flex justify-between text-xs mb-1">
                <span>Szer.</span>
                <span>{Math.round(analysis.dimensions.widthRatio * 100)}%</span>
              </div>
              <Progress value={analysis.dimensions.widthRatio * 100} className="h-1.5" />
            </div>
            <div className="flex-1">
              <div className="flex justify-between text-xs mb-1">
                <span>Wys.</span>
                <span>{Math.round(analysis.dimensions.heightRatio * 100)}%</span>
              </div>
              <Progress value={analysis.dimensions.heightRatio * 100} className="h-1.5" />
            </div>
            <div className="flex-1">
              <div className="flex justify-between text-xs mb-1">
                <span>Głęb.</span>
                <span>{Math.round(analysis.dimensions.depthRatio * 100)}%</span>
              </div>
              <Progress value={analysis.dimensions.depthRatio * 100} className="h-1.5" />
            </div>
          </div>
        </div>

        {/* Features */}
        {analysis.features.length > 0 && (
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Cechy charakterystyczne:</p>
            <div className="flex flex-wrap gap-1">
              {analysis.features.map((feature, index) => (
                <Badge key={index} variant="outline" className="text-xs">
                  {feature}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Colors */}
        {analysis.colors.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Kolory:</span>
            <div className="flex gap-1">
              {analysis.colors.map((color, index) => (
                <div
                  key={index}
                  className="w-5 h-5 rounded-full border border-border shadow-sm"
                  style={{ backgroundColor: color }}
                  title={color}
                />
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
