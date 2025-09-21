import jsPDF from 'jspdf';
import { toast } from 'sonner';

export const exportCanvasAs = async (
  canvas: HTMLCanvasElement, 
  format: 'png' | 'jpg' | 'pdf', 
  fileName: string = 'model-export'
) => {
  try {
    const dataURL = canvas.toDataURL(format === 'pdf' ? 'image/png' : `image/${format === 'jpg' ? 'jpeg' : 'png'}`, 0.95);
    
    if (format === 'pdf') {
      // Create PDF with jsPDF
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
      });
      
      // Calculate dimensions to fit the page
      const pdfWidth = 297; // A4 landscape width in mm
      const pdfHeight = 210; // A4 landscape height in mm
      const margin = 20;
      
      const maxWidth = pdfWidth - (2 * margin);
      const maxHeight = pdfHeight - (2 * margin);
      
      // Get image dimensions
      const img = new Image();
      img.onload = () => {
        const imgRatio = img.width / img.height;
        let width = maxWidth;
        let height = width / imgRatio;
        
        if (height > maxHeight) {
          height = maxHeight;
          width = height * imgRatio;
        }
        
        const x = (pdfWidth - width) / 2;
        const y = (pdfHeight - height) / 2;
        
        pdf.addImage(dataURL, 'PNG', x, y, width, height);
        pdf.save(`${fileName}.pdf`);
        toast.success('Model exported as PDF successfully!');
      };
      img.src = dataURL;
    } else {
      // Create download link for image formats
      const link = document.createElement('a');
      link.download = `${fileName}.${format}`;
      link.href = dataURL;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success(`Model exported as ${format.toUpperCase()} successfully!`);
    }
  } catch (error) {
    console.error('Export error:', error);
    toast.error('Failed to export model. Please try again.');
  }
};

export const captureCanvasFromThreeJS = (canvasElement: HTMLCanvasElement): HTMLCanvasElement => {
  // Create a new canvas with the same dimensions
  const captureCanvas = document.createElement('canvas');
  const ctx = captureCanvas.getContext('2d');
  
  if (!ctx) {
    throw new Error('Could not get canvas context');
  }
  
  captureCanvas.width = canvasElement.width;
  captureCanvas.height = canvasElement.height;
  
  // Set white background for better visibility
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, captureCanvas.width, captureCanvas.height);
  
  // Draw the WebGL canvas onto the new canvas
  ctx.drawImage(canvasElement, 0, 0);
  
  return captureCanvas;
};