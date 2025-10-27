import { useCallback, useRef } from "react";
import { Upload } from "lucide-react";
import { cn } from "@/lib/utils";
import { useApp } from "@/contexts/AppContext";
import { getText } from "@/lib/i18n";

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  className?: string;
}

export const FileUpload = ({ onFileSelect, className }: FileUploadProps) => {
  const { language } = useApp();
  const fileInputRef = useRef<HTMLInputElement>(null);
  console.log('[FileUpload] Component rendered');
  
  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      console.log('[FileUpload] Drop event triggered');
      const files = Array.from(e.dataTransfer.files);
      console.log('[FileUpload] Files dropped:', files.length);
      const validFile = files.find(file => 
        file.name.toLowerCase().endsWith('.stl') || 
        file.name.toLowerCase().endsWith('.3mf')
      );
      
      if (validFile) {
        console.log('[FileUpload] Valid file found:', validFile.name);
        onFileSelect(validFile);
      } else {
        console.log('[FileUpload] No valid file found in dropped files');
      }
    },
    [onFileSelect]
  );

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  }, []);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      console.log('[FileUpload] File input change triggered');
      const file = e.target.files?.[0];
      console.log('[FileUpload] File selected:', file?.name, file?.size, file?.type);
      
      if (file) {
        // Check file extension
        const isValidFile = file.name.toLowerCase().endsWith('.stl') || 
                          file.name.toLowerCase().endsWith('.3mf');
        
        if (!isValidFile) {
          console.error('[FileUpload] Invalid file type:', file.name);
          alert('Proszę wybrać plik .STL lub .3MF');
          e.target.value = ''; // Reset input
          return;
        }
        
        console.log('[FileUpload] Valid file, calling onFileSelect');
        onFileSelect(file);
      } else {
        console.log('[FileUpload] No file selected');
      }
      
      // Reset input to allow selecting the same file again
      e.target.value = '';
    },
    [onFileSelect]
  );

  const handleClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    fileInputRef.current?.click();
  }, []);

  return (
    <div
      onClick={handleClick}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      className={cn(
        "relative border-2 border-dashed border-border rounded-lg text-center cursor-pointer",
        "bg-gradient-upload hover:bg-viewer-upload-hover transition-all duration-300",
        "hover:border-primary group",
        "p-4 sm:p-6 lg:p-8", // Responsive padding
        className
      )}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept=".stl,.3mf"
        onChange={handleFileChange}
        className="hidden"
      />
      
      <div className="flex flex-col items-center gap-3 sm:gap-4 pointer-events-none">
        <div className="p-3 sm:p-4 rounded-full bg-muted group-hover:bg-primary/20 transition-colors">
          <Upload className="w-6 h-6 sm:w-8 sm:h-8 text-muted-foreground group-hover:text-primary transition-colors" />
        </div>
        
        <div className="space-y-1 sm:space-y-2">
          <h3 className="text-base sm:text-lg font-semibold">{getText('uploadTitle', language)}</h3>
          <p className="text-muted-foreground text-sm sm:text-base">
            {getText('uploadSubtitle', language)}
          </p>
        </div>
      </div>
    </div>
  );
};