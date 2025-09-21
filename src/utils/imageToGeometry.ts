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
  const { width, height, extrudeDepth, bevelEnabled, bevelThickness, bevelSize } = options;
  
  // Create a higher resolution canvas for better edge detection
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;
  canvas.width = width * 2; // Higher resolution for better curves
  canvas.height = height * 2;
  
  // Create a temporary canvas with original image
  const tempCanvas = document.createElement('canvas');
  const tempCtx = tempCanvas.getContext('2d')!;
  tempCanvas.width = imageData.width;
  tempCanvas.height = imageData.height;
  tempCtx.putImageData(imageData, 0, 0);
  
  // Scale up for smoother edges
  ctx.drawImage(tempCanvas, 0, 0, width * 2, height * 2);
  const scaledImageData = ctx.getImageData(0, 0, width * 2, height * 2);
  
  // Extract shape outline using marching squares
  const shape = extractShapeFromImage(scaledImageData, width * 2, height * 2);
  
  if (shape.length === 0) {
    // Fallback to simple extrude if no shape found
    return createSimpleBoxGeometry();
  }
  
  // Create THREE.js shape
  const threeShape = new THREE.Shape();
  
  // Start from first point
  if (shape.length > 0) {
    // Normalize coordinates to [-2, 2] range
    const firstPoint = shape[0];
    threeShape.moveTo(
      (firstPoint.x / (width * 2)) * 4 - 2,
      (firstPoint.y / (height * 2)) * 4 - 2
    );
    
    // Add all other points
    for (let i = 1; i < shape.length; i++) {
      const point = shape[i];
      threeShape.lineTo(
        (point.x / (width * 2)) * 4 - 2,
        (point.y / (height * 2)) * 4 - 2
      );
    }
    
    threeShape.closePath();
  }
  
  // Create extrude geometry
  const extrudeSettings = {
    depth: extrudeDepth,
    bevelEnabled,
    bevelThickness,
    bevelSize,
    bevelSegments: 8,
    steps: 1,
    curveSegments: 12
  };
  
  const geometry = new THREE.ExtrudeGeometry(threeShape, extrudeSettings);
  
  // Center the geometry
  geometry.computeBoundingBox();
  const center = new THREE.Vector3();
  geometry.boundingBox?.getCenter(center);
  geometry.translate(-center.x, -center.y, -center.z);
  
  // Rotate to face forward
  geometry.rotateX(-Math.PI / 2);
  
  return geometry;
};

const extractShapeFromImage = (imageData: ImageData, width: number, height: number): Array<{x: number, y: number}> => {
  const points: Array<{x: number, y: number}> = [];
  
  // Simple edge detection - find the boundary between dark and light pixels
  const threshold = 128; // Mid-gray threshold
  
  // Find contour points by scanning edges
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const index = (y * width + x) * 4;
      const currentPixel = imageData.data[index]; // Red channel (grayscale)
      
      // Check if this is an edge pixel
      const neighbors = [
        imageData.data[((y-1) * width + x) * 4], // top
        imageData.data[((y+1) * width + x) * 4], // bottom
        imageData.data[(y * width + (x-1)) * 4], // left
        imageData.data[(y * width + (x+1)) * 4], // right
      ];
      
      const isDark = currentPixel < threshold;
      const hasLightNeighbor = neighbors.some(n => n >= threshold);
      const hasDarkNeighbor = neighbors.some(n => n < threshold);
      
      // This is an edge if it's dark with light neighbors or light with dark neighbors
      if ((isDark && hasLightNeighbor) || (!isDark && hasDarkNeighbor)) {
        points.push({ x, y: height - y }); // Flip Y for correct orientation
      }
    }
  }
  
  // Sort points to create a contour (simple approach)
  if (points.length > 0) {
    const sortedPoints = [points[0]];
    const remaining = points.slice(1);
    
    while (remaining.length > 0 && sortedPoints.length < 1000) { // Limit to prevent infinite loops
      const lastPoint = sortedPoints[sortedPoints.length - 1];
      let closest = 0;
      let minDistance = Infinity;
      
      for (let i = 0; i < remaining.length; i++) {
        const distance = Math.sqrt(
          Math.pow(remaining[i].x - lastPoint.x, 2) + 
          Math.pow(remaining[i].y - lastPoint.y, 2)
        );
        if (distance < minDistance) {
          minDistance = distance;
          closest = i;
        }
      }
      
      if (minDistance < 50) { // Only connect nearby points
        sortedPoints.push(remaining[closest]);
        remaining.splice(closest, 1);
      } else {
        break; // No nearby points found
      }
    }
    
    return sortedPoints;
  }
  
  return points;
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