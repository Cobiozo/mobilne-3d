import * as THREE from 'three';

export interface ImageToGeometryOptions {
  width?: number;
  height?: number;
  heightScale?: number;
  smoothing?: boolean;
  mode?: 'heightmap' | 'extrude' | 'silhouette';
  extrudeDepth?: number;
  bevelEnabled?: boolean;
  bevelThickness?: number;
  bevelSize?: number;
}

export const imageToGeometry = (
  imageData: ImageData, 
  options: ImageToGeometryOptions = {}
): THREE.BufferGeometry => {
  const {
    width = 128,
    height = 128,
    heightScale = 2,
    smoothing = true,
    mode = 'silhouette',
    extrudeDepth = 0.5,
    bevelEnabled = true,
    bevelThickness = 0.02,
    bevelSize = 0.02
  } = options;

  if (mode === 'silhouette') {
    return createSilhouetteGeometry(imageData, {
      width,
      height,
      extrudeDepth,
      bevelEnabled,
      bevelThickness,
      bevelSize
    });
  } else if (mode === 'extrude') {
    return createExtrudeGeometry(imageData, {
      width,
      height,
      extrudeDepth,
      bevelEnabled,
      bevelThickness,
      bevelSize
    });
  } else {
    return createHeightmapGeometry(imageData, {
      width,
      height,
      heightScale,
      smoothing
    });
  }
};

const createSilhouetteGeometry = (
  imageData: ImageData,
  options: {
    width: number;
    height: number;
    extrudeDepth: number;
    bevelEnabled: boolean;
    bevelThickness: number;
    bevelSize: number;
  }
): THREE.BufferGeometry => {
  const { width, height, extrudeDepth } = options;
  
  // Create a canvas for processing
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;
  canvas.width = width;
  canvas.height = height;
  
  // Create a temporary canvas with original image
  const tempCanvas = document.createElement('canvas');
  const tempCtx = tempCanvas.getContext('2d')!;
  tempCanvas.width = imageData.width;
  tempCanvas.height = imageData.height;
  tempCtx.putImageData(imageData, 0, 0);
  
  // Scale the image
  ctx.drawImage(tempCanvas, 0, 0, width, height);
  const scaledImageData = ctx.getImageData(0, 0, width, height);
  
  // Convert to height map with proper silhouette handling
  const geometry = new THREE.PlaneGeometry(4, 4, width - 1, height - 1);
  const positions = geometry.getAttribute('position') as THREE.BufferAttribute;
  
  const threshold = 128; // Threshold for black/white
  
  // Apply binary heightmap (0 or extrudeDepth)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const index = (y * width + x) * 4;
      
      // Get grayscale value
      const r = scaledImageData.data[index];
      const g = scaledImageData.data[index + 1];
      const b = scaledImageData.data[index + 2];
      const grayscale = (r * 0.299 + g * 0.587 + b * 0.114);
      
      // Binary height: either 0 (white/background) or extrudeDepth (black/foreground)
      const heightValue = grayscale < threshold ? extrudeDepth : 0;
      
      // Update vertex position
      const vertexIndex = y * width + x;
      positions.setZ(vertexIndex, heightValue);
    }
  }
  
  // Apply smoothing only at edges to avoid jagged transitions
  const smoothedPositions = new Float32Array(positions.array.length);
  smoothedPositions.set(positions.array);
  
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const vertexIndex = y * width + x;
      const zIndex = vertexIndex * 3 + 2;
      
      const currentHeight = positions.getZ(vertexIndex);
      
      // Check neighbors
      const neighbors = [
        positions.getZ((y - 1) * width + x),     // top
        positions.getZ((y + 1) * width + x),     // bottom
        positions.getZ(y * width + (x - 1)),     // left
        positions.getZ(y * width + (x + 1)),     // right
      ];
      
      // Only smooth if we're at an edge (transition between 0 and extrudeDepth)
      const hasZeroNeighbor = neighbors.some(h => h === 0);
      const hasHeightNeighbor = neighbors.some(h => h === extrudeDepth);
      
      if (hasZeroNeighbor && hasHeightNeighbor) {
        // This is an edge, apply slight smoothing
        const sum = neighbors.reduce((acc, h) => acc + h, currentHeight);
        smoothedPositions[zIndex] = sum / (neighbors.length + 1);
      }
    }
  }
  
  positions.set(smoothedPositions);
  positions.needsUpdate = true;
  geometry.computeVertexNormals();
  
  // Rotate to face forward
  geometry.rotateX(-Math.PI / 2);
  
  return geometry;
};

const extractShapeFromImage = (imageData: ImageData, width: number, height: number): Array<{x: number, y: number}> => {
  // Simplified - not used in new approach
  return [];
};

const createSimpleBoxGeometry = (): THREE.BufferGeometry => {
  return new THREE.BoxGeometry(2, 0.2, 2);
};

const createExtrudeGeometry = (
  imageData: ImageData,
  options: {
    width: number;
    height: number;
    extrudeDepth: number;
    bevelEnabled: boolean;
    bevelThickness: number;
    bevelSize: number;
  }
): THREE.BufferGeometry => {
  // Similar to silhouette but with different processing
  return createSilhouetteGeometry(imageData, options);
};

const createHeightmapGeometry = (
  imageData: ImageData,
  options: {
    width: number;
    height: number;
    heightScale: number;
    smoothing: boolean;
  }
): THREE.BufferGeometry => {
  const { width, height, heightScale, smoothing } = options;
  
  // Create a PlaneGeometry as the base
  const geometry = new THREE.PlaneGeometry(4, 4, width - 1, height - 1);
  const positions = geometry.getAttribute('position') as THREE.BufferAttribute;
  
  // Convert image to grayscale heightmap
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;
  canvas.width = width;
  canvas.height = height;
  
  // Create a temporary image element
  const tempCanvas = document.createElement('canvas');
  const tempCtx = tempCanvas.getContext('2d')!;
  tempCanvas.width = imageData.width;
  tempCanvas.height = imageData.height;
  tempCtx.putImageData(imageData, 0, 0);
  
  // Scale the image to desired resolution
  ctx.drawImage(tempCanvas, 0, 0, width, height);
  const scaledImageData = ctx.getImageData(0, 0, width, height);
  
  // Apply heightmap
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const index = (y * width + x) * 4;
      
      // Calculate grayscale value (luminance)
      const r = scaledImageData.data[index];
      const g = scaledImageData.data[index + 1];
      const b = scaledImageData.data[index + 2];
      const grayscale = (r * 0.299 + g * 0.587 + b * 0.114) / 255;
      
      // Map to height
      const heightValue = grayscale * heightScale;
      
      // Update vertex position
      const vertexIndex = y * width + x;
      positions.setZ(vertexIndex, heightValue);
    }
  }

  // Apply smoothing if enabled
  if (smoothing) {
    const smoothedPositions = new Float32Array(positions.array.length);
    smoothedPositions.set(positions.array);
    
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const vertexIndex = y * width + x;
        const zIndex = vertexIndex * 3 + 2; // Z component
        
        // Average with neighbors
        const neighbors = [
          (y - 1) * width + x,     // top
          (y + 1) * width + x,     // bottom
          y * width + (x - 1),     // left
          y * width + (x + 1),     // right
        ];
        
        let sum = positions.getZ(vertexIndex);
        let count = 1;
        
        neighbors.forEach(neighborIndex => {
          if (neighborIndex >= 0 && neighborIndex < positions.count) {
            sum += positions.getZ(neighborIndex);
            count++;
          }
        });
        
        smoothedPositions[zIndex] = sum / count;
      }
    }
    
    positions.set(smoothedPositions);
  }

  // Update the geometry
  positions.needsUpdate = true;
  geometry.computeVertexNormals();
  
  return geometry;
};

export const loadImageData = (file: File): Promise<ImageData> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        reject(new Error('Could not get canvas context'));
        return;
      }
      
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);
      
      const imageData = ctx.getImageData(0, 0, img.width, img.height);
      resolve(imageData);
    };
    
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = URL.createObjectURL(file);
  });
};