import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AIAnalysisResult {
  objectType: 'furniture' | 'vehicle' | 'character' | 'tool' | 'decoration' | 'abstract' | 'animal' | 'building' | 'food' | 'plant';
  objectName: string;
  dimensions: {
    widthRatio: number;
    heightRatio: number;
    depthRatio: number;
  };
  features: string[];
  suggestedGeometry: 'box' | 'cylinder' | 'sphere' | 'cone' | 'torus' | 'custom';
  complexity: 'simple' | 'medium' | 'complex';
  symmetry: 'symmetric' | 'asymmetric';
  confidence: number;
  colors: string[];
  material: 'metal' | 'wood' | 'plastic' | 'glass' | 'fabric' | 'organic' | 'mixed';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imageBase64, analysisType = 'full' } = await req.json();
    
    if (!imageBase64) {
      throw new Error('No image data provided');
    }

    console.log('Starting AI image analysis with Lovable AI (Gemini)');
    console.log('Analysis type:', analysisType);
    
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    // Clean base64 data
    const cleanBase64 = imageBase64.includes(',') ? imageBase64.split(',')[1] : imageBase64;
    
    // Prepare the image for Gemini vision
    const imageUrl = `data:image/png;base64,${cleanBase64}`;
    
    const systemPrompt = `Jesteś ekspertem od analizy obrazów 2D w celu konwersji na modele 3D.
Przeanalizuj obraz i zwróć JSON z następującymi polami:

1. objectType - kategoria obiektu (furniture, vehicle, character, tool, decoration, abstract, animal, building, food, plant)
2. objectName - nazwa obiektu po polsku (np. "krzesło biurowe", "samochód sportowy")
3. dimensions - proporcje względne obiektu:
   - widthRatio: szerokość (0.1-1.0)
   - heightRatio: wysokość (0.1-1.0)
   - depthRatio: głębokość (0.1-1.0)
   Suma wszystkich wartości powinna wynosić około 1.0
4. features - lista charakterystycznych cech geometrycznych (max 5 elementów, po polsku)
5. suggestedGeometry - bazowy kształt geometryczny (box, cylinder, sphere, cone, torus, custom)
6. complexity - złożoność modelu (simple, medium, complex)
7. symmetry - czy obiekt jest symetryczny (symmetric, asymmetric)
8. confidence - pewność analizy (0.0-1.0)
9. colors - dominujące kolory w formacie hex (max 3)
10. material - główny materiał (metal, wood, plastic, glass, fabric, organic, mixed)

Skup się na cechach istotnych dla generowania geometrii 3D.
Odpowiedz TYLKO w formacie JSON, bez żadnych dodatkowych komentarzy.`;

    const userPrompt = analysisType === 'quick' 
      ? 'Szybka analiza obrazu do konwersji 3D. Podaj podstawowe informacje.'
      : 'Dokładna analiza obrazu do konwersji 3D. Przeanalizuj wszystkie szczegóły.';

    console.log('Sending request to Lovable AI Gateway...');
    
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { 
            role: 'user', 
            content: [
              { type: 'text', text: userPrompt },
              { 
                type: 'image_url', 
                image_url: { url: imageUrl } 
              }
            ]
          }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Lovable AI Gateway error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ 
          success: false, 
          error: 'Rate limit exceeded. Please try again later.' 
        }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      if (response.status === 402) {
        return new Response(JSON.stringify({ 
          success: false, 
          error: 'Payment required. Please add credits to continue.' 
        }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const aiResponse = await response.json();
    console.log('AI Response received');
    
    const content = aiResponse.choices?.[0]?.message?.content;
    
    if (!content) {
      throw new Error('No content in AI response');
    }

    console.log('Raw AI content:', content.substring(0, 500));
    
    // Parse JSON from response (handle markdown code blocks)
    let analysisResult: AIAnalysisResult;
    try {
      let jsonContent = content;
      
      // Remove markdown code blocks if present
      if (content.includes('```json')) {
        jsonContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '');
      } else if (content.includes('```')) {
        jsonContent = content.replace(/```\n?/g, '');
      }
      
      analysisResult = JSON.parse(jsonContent.trim());
      console.log('Parsed AI analysis:', analysisResult);
    } catch (parseError) {
      console.error('Failed to parse AI response as JSON:', parseError);
      console.log('Content that failed to parse:', content);
      
      // Return fallback analysis
      analysisResult = {
        objectType: 'abstract',
        objectName: 'Obiekt nierozpoznany',
        dimensions: { widthRatio: 0.33, heightRatio: 0.33, depthRatio: 0.34 },
        features: ['nierozpoznany kształt'],
        suggestedGeometry: 'box',
        complexity: 'medium',
        symmetry: 'symmetric',
        confidence: 0.3,
        colors: ['#808080'],
        material: 'mixed'
      };
    }

    // Validate and normalize the result
    const validatedResult: AIAnalysisResult = {
      objectType: analysisResult.objectType || 'abstract',
      objectName: analysisResult.objectName || 'Nieznany obiekt',
      dimensions: {
        widthRatio: Math.max(0.1, Math.min(1.0, analysisResult.dimensions?.widthRatio || 0.33)),
        heightRatio: Math.max(0.1, Math.min(1.0, analysisResult.dimensions?.heightRatio || 0.33)),
        depthRatio: Math.max(0.1, Math.min(1.0, analysisResult.dimensions?.depthRatio || 0.34)),
      },
      features: Array.isArray(analysisResult.features) ? analysisResult.features.slice(0, 5) : [],
      suggestedGeometry: analysisResult.suggestedGeometry || 'box',
      complexity: analysisResult.complexity || 'medium',
      symmetry: analysisResult.symmetry || 'symmetric',
      confidence: Math.max(0, Math.min(1, analysisResult.confidence || 0.5)),
      colors: Array.isArray(analysisResult.colors) ? analysisResult.colors.slice(0, 3) : ['#808080'],
      material: analysisResult.material || 'mixed'
    };

    console.log('AI analysis completed successfully:', validatedResult.objectName);

    return new Response(JSON.stringify({
      success: true,
      analysis: validatedResult,
      processingTime: Date.now()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in AI image analysis:', error);
    return new Response(JSON.stringify({ 
      success: false,
      error: error instanceof Error ? error.message : 'An error occurred during analysis'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
