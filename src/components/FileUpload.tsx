import { useCallback } from "react";
import { Upload, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import { useApp } from "@/contexts/AppContext";
import { useTranslation } from "@/lib/i18n";

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  className?: string;
}

export const FileUpload = ({ onFileSelect, className }: FileUploadProps) => {
  const { language } = useApp();
  const { t } = useTranslation(language);
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
        "relative border-2 border-dashed border-border rounded-lg p-8 text-center",
        "bg-gradient-upload hover:bg-viewer-upload-hover transition-all duration-300",
        "hover:border-primary cursor-pointer group",
        className
      )}
    >
      <input
        type="file"
        accept=".stl,.3mf"
        onChange={handleFileChange}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
      />
      
      <div className="flex flex-col items-center gap-4">
        <div className="p-4 rounded-full bg-muted group-hover:bg-primary/20 transition-colors">
          <Upload className="w-8 h-8 text-muted-foreground group-hover:text-primary transition-colors" />
        </div>
        
        <div className="space-y-2">
          <h3 className="text-lg font-semibold">{t('uploadTitle')}</h3>
          <p className="text-muted-foreground">
            {t('uploadSubtitle')}
          </p>
        </div>
        
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <FileText className="w-4 h-4" />
          <span>Supported: .STL, .3MF</span>
        </div>
      </div>
    </div>
  );
};