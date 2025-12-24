import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

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

interface UseImageToAIOptions {
  onAnalysisComplete?: (analysis: AIAnalysis) => void;
  onError?: (error: string) => void;
}

export const useImageToAI = (options: UseImageToAIOptions = {}) => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<AIAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);

  const analyzeImage = useCallback(async (imageData: ImageData, analysisType: 'quick' | 'full' = 'full') => {
    setIsAnalyzing(true);
    setError(null);
    
    try {
      // Convert ImageData to base64
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;
      canvas.width = imageData.width;
      canvas.height = imageData.height;
      ctx.putImageData(imageData, 0, 0);
      
      const base64 = canvas.toDataURL('image/png').split(',')[1];
      
      console.log('Sending image to AI analysis...');
      
      const { data, error: invokeError } = await supabase.functions.invoke('analyze-image-ai', {
        body: {
          imageBase64: base64,
          analysisType
        }
      });

      if (invokeError) {
        throw new Error(invokeError.message);
      }

      if (!data.success) {
        throw new Error(data.error || 'AI analysis failed');
      }

      console.log('AI analysis result:', data.analysis);
      
      setAnalysis(data.analysis);
      options.onAnalysisComplete?.(data.analysis);
      
      return data.analysis;
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error during AI analysis';
      console.error('AI analysis error:', errorMessage);
      setError(errorMessage);
      options.onError?.(errorMessage);
      toast.error(`Błąd analizy AI: ${errorMessage}`);
      return null;
      
    } finally {
      setIsAnalyzing(false);
    }
  }, [options]);

  const analyzeImageFile = useCallback(async (file: File, analysisType: 'quick' | 'full' = 'full') => {
    return new Promise<AIAnalysis | null>((resolve) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const img = new Image();
        img.onload = async () => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d')!;
          
          // Resize to reasonable size for AI (max 1024px)
          const maxSize = 1024;
          let width = img.width;
          let height = img.height;
          
          if (width > maxSize || height > maxSize) {
            if (width > height) {
              height = (height / width) * maxSize;
              width = maxSize;
            } else {
              width = (width / height) * maxSize;
              height = maxSize;
            }
          }
          
          canvas.width = width;
          canvas.height = height;
          ctx.drawImage(img, 0, 0, width, height);
          
          const imageData = ctx.getImageData(0, 0, width, height);
          const result = await analyzeImage(imageData, analysisType);
          resolve(result);
        };
        img.src = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    });
  }, [analyzeImage]);

  const reset = useCallback(() => {
    setAnalysis(null);
    setError(null);
    setIsAnalyzing(false);
  }, []);

  return {
    analyzeImage,
    analyzeImageFile,
    isAnalyzing,
    analysis,
    error,
    reset
  };
};
