import * as THREE from "three";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js";

export interface Model3MFInfo {
  name: string;
  index: number;
  meshCount: number;
  geometry: THREE.BufferGeometry;
}

export async function loadModelFile(arrayBuffer: ArrayBuffer, fileName: string): Promise<Model3MFInfo[]> {
  const is3MF = fileName.toLowerCase().endsWith('.3mf');
  
  if (is3MF) {
    try {
      return await load3MFFile(arrayBuffer, fileName);
    } catch (error) {
      console.warn('3MF loading failed, falling back to single model:', error);
      // Fallback to treating as single model with placeholder geometry
      return [{
        name: fileName,
        index: 0,
        meshCount: 1,
        geometry: new THREE.BoxGeometry(1, 1, 1)
      }];
    }
  } else {
    return loadSTLFile(arrayBuffer, fileName);
  }
}

async function load3MFFile(arrayBuffer: ArrayBuffer, fileName: string): Promise<Model3MFInfo[]> {
  try {
    // Dynamic import to avoid build issues
    const ThreeMFLoaderModule = await import('../loaders/3MFLoader.js');
    const ThreeMFLoader = ThreeMFLoaderModule.ThreeMFLoader || ThreeMFLoaderModule.default;
    
    const loader = new ThreeMFLoader();
    const result = loader.parse(arrayBuffer);
    
    console.log('3MF result structure:', result);
    
    if (!result) {
      throw new Error('Failed to parse 3MF file');
    }

    const models: Model3MFInfo[] = [];
    
    // Handle different result structures
    if (result.children && result.children.length > 0) {
      // Multiple models case
      result.children.forEach((child: any, index: number) => {
        console.log(`Processing 3MF child ${index}:`, child);
        const geometry = extractGeometry(child);
        console.log(`Extracted geometry for child ${index}:`, geometry);
        
        if (geometry) {
          // Sprawdź czy geometria nie jest już w cache
          const geometryId = `3mf_${fileName}_${index}`;
          
          const processedGeometry = processGeometry(geometry);
          console.log(`Processed geometry for child ${index}:`, processedGeometry);
          
          models.push({
            name: child.name || `${fileName} - Model ${index + 1}`,
            index,
            meshCount: 1,
            geometry: processedGeometry
          });
        }
      });
    } else {
      // Single model case - traverse to find meshes
      const meshes: THREE.Mesh[] = [];
      result.traverse((object: any) => {
        if (object instanceof THREE.Mesh && object.geometry) {
          meshes.push(object);
        }
      });

      if (meshes.length > 0) {
        meshes.forEach((mesh, index) => {
          models.push({
            name: `${fileName} - Object ${index + 1}`,
            index,
            meshCount: 1,
            geometry: processGeometry(mesh.geometry)
          });
        });
      } else {
        // Direct geometry case
        const geometry = extractGeometry(result);
        if (geometry) {
          models.push({
            name: fileName,
            index: 0,
            meshCount: 1,
            geometry: processGeometry(geometry)
          });
        }
      }
    }

    if (models.length === 0) {
      throw new Error('No valid models found in 3MF file');
    }

    return models;
  } catch (error) {
    console.error('Error loading 3MF file:', error);
    throw error;
  }
}

function loadSTLFile(arrayBuffer: ArrayBuffer, fileName: string): Model3MFInfo[] {
  try {
    const loader = new STLLoader();
    const geometry = loader.parse(arrayBuffer);
    
    return [{
      name: fileName,
      index: 0,
      meshCount: 1,
      geometry: processGeometry(geometry)
    }];
  } catch (error) {
    console.error('Error loading STL file:', error);
    // Return fallback geometry
    return [{
      name: fileName,
      index: 0,
      meshCount: 1,
      geometry: new THREE.BoxGeometry(1, 1, 1)
    }];
  }
}

function extractGeometry(object: any): THREE.BufferGeometry | null {
  console.log('extractGeometry called with:', object);
  
  if (object.geometry) {
    console.log('Found direct geometry:', object.geometry);
    return object.geometry;
  }
  
  if (object.children && object.children.length > 0) {
    console.log('Searching in children, count:', object.children.length);
    for (const child of object.children) {
      const geometry = extractGeometry(child);
      if (geometry) {
        console.log('Found geometry in child:', geometry);
        return geometry;
      }
    }
  }
  
  console.log('No geometry found in object');
  return null;
}

function processGeometry(geometry: THREE.BufferGeometry): THREE.BufferGeometry {
  // Sprawdź czy geometria już była przetworzona
  if ((geometry as any).__lovable_processed) {
    console.log('Geometry already processed, skipping');
    return geometry;
  }

  // Make a copy to avoid modifying the original
  const processedGeometry = geometry.clone();
  
  // Store original dimensions BEFORE any processing
  processedGeometry.computeBoundingBox();
  if (processedGeometry.boundingBox) {
    const originalSize = new THREE.Vector3();
    processedGeometry.boundingBox.getSize(originalSize);
    
    // Store original dimensions as metadata
    (processedGeometry as any).__original_dimensions = {
      x: originalSize.x,
      y: originalSize.y,
      z: originalSize.z
    };
    
    console.log('Stored original dimensions:', originalSize);
  }
  
  try {
    // Center the geometry
    processedGeometry.computeBoundingBox();
    if (processedGeometry.boundingBox) {
      const center = new THREE.Vector3();
      processedGeometry.boundingBox.getCenter(center);
      processedGeometry.translate(-center.x, -center.y, -center.z);
      
      // Bezpieczne skalowanie - tylko raz!
      const size = new THREE.Vector3();
      processedGeometry.boundingBox.getSize(size);
      const maxDimension = Math.max(size.x, size.y, size.z);
      
      if (maxDimension > 0) {
        // Docelowy rozmiar: 4 jednostki (dopasowane do kamery na pozycji [5,5,5])
        const targetSize = 4;
        const scaleFactor = targetSize / maxDimension;
        
        // Bezpieczne ograniczenia skalowania
        const safeScale = Math.max(0.01, Math.min(100, scaleFactor));
        
        processedGeometry.scale(safeScale, safeScale, safeScale);
        console.log(`Geometry safely scaled: ${maxDimension} -> ${targetSize} (factor: ${safeScale})`);
      }
    }
    
    // Compute normals for proper lighting
    processedGeometry.computeVertexNormals();
    
    // Oznacz jako przetworzoną
    (processedGeometry as any).__lovable_processed = true;
    
  } catch (error) {
    console.warn('Error processing geometry:', error);
  }
  
  return processedGeometry;
}


// Universal function to get real dimensions from model geometry in millimeters
export async function getModelDimensions(
  arrayBuffer: ArrayBuffer, 
  fileName: string = '', 
  modelIndex: number = 0
): Promise<{ x: number; y: number; z: number }> {
  const is3MF = fileName.toLowerCase().endsWith('.3mf');
  
  if (is3MF) {
    try {
      // Dynamic import to avoid build issues
      const ThreeMFLoaderModule = await import('../loaders/3MFLoader.js');
      const ThreeMFLoader = ThreeMFLoaderModule.ThreeMFLoader || ThreeMFLoaderModule.default;
      
      const loader = new ThreeMFLoader();
      const result = loader.parse(arrayBuffer);
      
      console.log('3MF result for dimensions:', result);
      
      if (!result) {
        throw new Error('Failed to parse 3MF file');
      }

      // Find the specific model by index
      let targetGeometry: THREE.BufferGeometry | null = null;
      
      if (result.children && result.children.length > 0) {
        // Multiple models case
        if (modelIndex < result.children.length) {
          targetGeometry = extractGeometry(result.children[modelIndex]);
        }
      } else {
        // Single model or traverse case
        const meshes: THREE.Mesh[] = [];
        result.traverse((object: any) => {
          if (object instanceof THREE.Mesh && object.geometry) {
            meshes.push(object);
          }
        });

        if (meshes.length > 0 && modelIndex < meshes.length) {
          targetGeometry = meshes[modelIndex].geometry;
        } else {
          // Direct geometry case
          targetGeometry = extractGeometry(result);
        }
      }

      if (targetGeometry) {
        // Check if we have stored original dimensions
        const originalDimensions = (targetGeometry as any).__original_dimensions;
        
        if (originalDimensions) {
          console.log('Using stored original 3MF dimensions:', originalDimensions);
          return {
            x: Math.round(originalDimensions.x * 10) / 10,
            y: Math.round(originalDimensions.y * 10) / 10,
            z: Math.round(originalDimensions.z * 10) / 10
          };
        }
        
        // Fallback: compute from current geometry
        targetGeometry.computeBoundingBox();
        
        if (targetGeometry.boundingBox) {
          const size = new THREE.Vector3();
          targetGeometry.boundingBox.getSize(size);
          
          console.log('Computed 3MF dimensions (may be scaled):', size);
          
          // Return dimensions in millimeters
          return {
            x: Math.round(size.x * 10) / 10,
            y: Math.round(size.y * 10) / 10,
            z: Math.round(size.z * 10) / 10
          };
        }
      }
      
      throw new Error('No valid geometry found in 3MF file');
    } catch (error) {
      console.error('Error reading 3MF model dimensions:', error);
      return { x: 100, y: 100, z: 100 };
    }
  }
  
  // STL handling
  try {
    const loader = new STLLoader();
    const geometry = loader.parse(arrayBuffer);
    
    geometry.computeBoundingBox();
    
    if (geometry.boundingBox) {
      const size = new THREE.Vector3();
      geometry.boundingBox.getSize(size);
      
      // Return dimensions in millimeters (assuming the model is in mm)
      return {
        x: Math.round(size.x * 10) / 10, // Round to 1 decimal place
        y: Math.round(size.y * 10) / 10,
        z: Math.round(size.z * 10) / 10
      };
    }
  } catch (error) {
    console.error('Error reading STL model dimensions:', error);
  }
  
  // Return default if failed
  return { x: 100, y: 100, z: 100 };
}