import * as THREE from "three";

export interface Model3MFInfo {
  name: string;
  index: number;
  meshCount: number;
  geometry: THREE.BufferGeometry;
}

export async function load3MFFile(arrayBuffer: ArrayBuffer, fileName: string): Promise<Model3MFInfo[]> {
  try {
    // Import the 3MF loader dynamically
    const { ThreeMFLoader } = await import('../loaders/3MFLoader.js');
    
    const loader = new ThreeMFLoader();
    const result = loader.parse(arrayBuffer);
    
    if (!result) {
      throw new Error('Failed to parse 3MF file');
    }

    const models: Model3MFInfo[] = [];
    
    // If result is a Group with children
    if (result.children && result.children.length > 0) {
      result.children.forEach((child: any, index: number) => {
        if (child.geometry) {
          // Process the geometry
          const geometry = processGeometry(child.geometry);
          
          models.push({
            name: child.name || `${fileName} - Model ${index + 1}`,
            index,
            meshCount: 1,
            geometry
          });
        } else if (child.children) {
          // If the child has its own children (nested models)
          child.children.forEach((subChild: any, subIndex: number) => {
            if (subChild.geometry) {
              const geometry = processGeometry(subChild.geometry);
              
              models.push({
                name: subChild.name || `${fileName} - Model ${index + 1}.${subIndex + 1}`,
                index: models.length,
                meshCount: 1,
                geometry
              });
            }
          });
        }
      });
    } else if (result.geometry) {
      // Single model case
      const geometry = processGeometry(result.geometry);
      models.push({
        name: fileName,
        index: 0,
        meshCount: 1,
        geometry
      });
    }

    // If no models were found but we have a valid result, try to extract geometry directly
    if (models.length === 0 && result) {
      // Try to find any mesh in the scene
      const meshes: THREE.Mesh[] = [];
      result.traverse((object: any) => {
        if (object instanceof THREE.Mesh && object.geometry) {
          meshes.push(object);
        }
      });

      meshes.forEach((mesh, index) => {
        const geometry = processGeometry(mesh.geometry);
        models.push({
          name: `${fileName} - Object ${index + 1}`,
          index,
          meshCount: 1,
          geometry
        });
      });
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

function processGeometry(geometry: THREE.BufferGeometry): THREE.BufferGeometry {
  // Make a copy to avoid modifying the original
  const processedGeometry = geometry.clone();
  
  // Center the geometry
  processedGeometry.computeBoundingBox();
  const center = new THREE.Vector3();
  processedGeometry.boundingBox?.getCenter(center);
  processedGeometry.translate(-center.x, -center.y, -center.z);
  
  // Scale to reasonable size
  const size = new THREE.Vector3();
  processedGeometry.boundingBox?.getSize(size);
  const maxDimension = Math.max(size.x, size.y, size.z);
  const scale = 3 / maxDimension;
  processedGeometry.scale(scale, scale, scale);
  
  // Compute normals for proper lighting
  processedGeometry.computeVertexNormals();
  
  return processedGeometry;
}