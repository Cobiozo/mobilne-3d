import { useCallback } from "react";
import { Upload } from "lucide-react";
import { cn } from "@/lib/utils";
import { useApp } from "@/contexts/AppContext";
import { translations } from "@/lib/i18n";

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  className?: string;
}

export const FileUpload = ({ onFileSelect, className }: FileUploadProps) => {
  const { language } = useApp();
  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      const files = Array.from(e.dataTransfer.files);
      const validFile = files.find(file => 
        file.name.toLowerCase().endsWith('.stl') || 
        file.name.toLowerCase().endsWith('.3mf')
      );
      
      if (validFile) {
        onFileSelect(validFile);
      }
    },
    [onFileSelect]
  );

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  }, []);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        onFileSelect(file);
      }
    },
    [onFileSelect]
  );

  return (
    <div
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      className={cn(
        "relative border-2 border-dashed border-border rounded-lg text-center",
        "bg-gradient-upload hover:bg-viewer-upload-hover transition-all duration-300",
        "hover:border-primary cursor-pointer group",
        "p-4 sm:p-6 lg:p-8", // Responsive padding
        className
      )}
    >
      <input
        type="file"
        accept=".stl,.3mf"
        onChange={handleFileChange}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
      />
      
      <div className="flex flex-col items-center gap-3 sm:gap-4">
        <div className="p-3 sm:p-4 rounded-full bg-muted group-hover:bg-primary/20 transition-colors">
          <Upload className="w-6 h-6 sm:w-8 sm:h-8 text-muted-foreground group-hover:text-primary transition-colors" />
        </div>
        
        <div className="space-y-1 sm:space-y-2">
          <h3 className="text-base sm:text-lg font-semibold">{translations[language].uploadTitle}</h3>
          <p className="text-muted-foreground text-sm sm:text-base">
            {translations[language].uploadSubtitle}
          </p>
        </div>
      </div>
    </div>
  );
};