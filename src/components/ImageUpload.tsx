import { useCallback } from "react";
import { Image, FileImage } from "lucide-react";
import { cn } from "@/lib/utils";
import { useApp } from "@/contexts/AppContext";
import { useTranslation } from "@/lib/i18n";

interface ImageUploadProps {
  onFileSelect: (file: File) => void;
  className?: string;
}

export const ImageUpload = ({ onFileSelect, className }: ImageUploadProps) => {
  const { language } = useApp();
  const { t } = useTranslation(language);
  
  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      const files = Array.from(e.dataTransfer.files);
      const validFile = files.find(file => 
        file.name.toLowerCase().endsWith('.jpg') || 
        file.name.toLowerCase().endsWith('.jpeg') ||
        file.name.toLowerCase().endsWith('.png')
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
        accept=".jpg,.jpeg,.png"
        onChange={handleFileChange}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
      />
      
      <div className="flex flex-col items-center gap-3 sm:gap-4">
        <div className="p-3 sm:p-4 rounded-full bg-muted group-hover:bg-primary/20 transition-colors">
          <Image className="w-6 h-6 sm:w-8 sm:h-8 text-muted-foreground group-hover:text-primary transition-colors" />
        </div>
        
        <div className="space-y-1 sm:space-y-2">
          <h3 className="text-base sm:text-lg font-semibold">{t('imageUploadTitle')}</h3>
          <p className="text-muted-foreground text-sm sm:text-base">
            {t('imageUploadSubtitle')}
          </p>
          <div className="bg-primary/10 rounded-lg p-2 mt-2">
            <p className="text-xs text-primary font-medium">✨ Powered by Stable3DGen</p>
            <p className="text-xs text-muted-foreground">Advanced local 3D model generation</p>
          </div>
        </div>
      </div>
    </div>
  );
};