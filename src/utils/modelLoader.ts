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
        const geometry = extractGeometry(child);
        if (geometry) {
          models.push({
            name: child.name || `${fileName} - Model ${index + 1}`,
            index,
            meshCount: 1,
            geometry: processGeometry(geometry)
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
  if (object.geometry) {
    return object.geometry;
  }
  
  if (object.children && object.children.length > 0) {
    for (const child of object.children) {
      const geometry = extractGeometry(child);
      if (geometry) return geometry;
    }
  }
  
  return null;
}

function processGeometry(geometry: THREE.BufferGeometry): THREE.BufferGeometry {
  // Make a copy to avoid modifying the original
  const processedGeometry = geometry.clone();
  
  try {
    // Center the geometry
    processedGeometry.computeBoundingBox();
    if (processedGeometry.boundingBox) {
      const center = new THREE.Vector3();
      processedGeometry.boundingBox.getCenter(center);
      processedGeometry.translate(-center.x, -center.y, -center.z);
      
      // Scale to reasonable size - tylko raz!
      const size = new THREE.Vector3();
      processedGeometry.boundingBox.getSize(size);
      const maxDimension = Math.max(size.x, size.y, size.z);
      
      // Dodajemy zabezpieczenie przed nieskończonym skalowaniem
      if (maxDimension > 0 && maxDimension < 1000) { // maksymalna rozsądna wielkość
        const scale = 3 / maxDimension;
        // Ograniczamy skalowanie do rozsądnych wartości
        const clampedScale = Math.max(0.1, Math.min(10, scale));
        processedGeometry.scale(clampedScale, clampedScale, clampedScale);
        console.log('Geometry scaled by factor:', clampedScale, 'original size:', maxDimension);
      } else {
        console.warn('Geometry size unusual, skipping scaling. Max dimension:', maxDimension);
      }
    }
    
    // Compute normals for proper lighting
    processedGeometry.computeVertexNormals();
  } catch (error) {
    console.warn('Error processing geometry:', error);
  }
  
  return processedGeometry;
}