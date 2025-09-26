import { Progress } from "@/components/ui/progress";
import { Loader2 } from "lucide-react";

interface ProgressLoaderProps {
  progress: number;
  title: string;
  description?: string;
  className?: string;
}

export const ProgressLoader = ({ progress, title, description, className }: ProgressLoaderProps) => {
  return (
    <div className={`flex flex-col items-center justify-center space-y-4 p-6 ${className || ''}`}>
      <div className="relative">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
        </div>
      </div>
      
      <div className="w-full max-w-sm space-y-2">
        <div className="flex justify-between items-center">
          <h3 className="text-sm font-medium text-foreground">{title}</h3>
          <span className="text-xs text-muted-foreground">{Math.round(progress)}%</span>
        </div>
        
        <Progress value={progress} className="h-2" />
        
        {description && (
          <p className="text-xs text-muted-foreground text-center">{description}</p>
        )}
      </div>
      
      <div className="flex items-center space-x-1 text-xs text-muted-foreground">
        <span>Stable3DGen</span>
        <div className="w-1 h-1 bg-primary rounded-full animate-ping" />
        <span>Processing</span>
      </div>
    </div>
  );
};