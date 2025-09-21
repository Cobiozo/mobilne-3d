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
    return createProperlySilhouetteGeometry(imageData, {
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

const createProperlySilhouetteGeometry = (
  imageData: ImageData,
  options: {
    extrudeDepth: number;
    bevelEnabled: boolean;
    bevelThickness: number;
    bevelSize: number;
  }
): THREE.BufferGeometry => {
  const { extrudeDepth, bevelEnabled, bevelThickness, bevelSize } = options;
  
  try {
    // Convert image to binary mask
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    canvas.width = imageData.width;
    canvas.height = imageData.height;
    ctx.putImageData(imageData, 0, 0);
    
    // Get image data and create binary mask
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const binaryMask = createBinaryMask(data, 128); // threshold = 128
    
    // Find contours using marching squares
    const contours = findContours(binaryMask, canvas.width, canvas.height);
    
    if (contours.length === 0) {
      console.warn('No contours found, creating fallback geometry');
      return createFallbackGeometry();
    }
    
    // Use the largest contour
    const mainContour = contours.reduce((largest, current) => 
      current.length > largest.length ? current : largest
    );
    
    if (mainContour.length < 3) {
      console.warn('Contour too small, creating fallback geometry');
      return createFallbackGeometry();
    }
    
    // Create THREE.js shape from contour
    const shape = new THREE.Shape();
    
    // Normalize coordinates and create shape
    const scaleX = 4 / canvas.width;  // Scale to world coordinates
    const scaleY = 4 / canvas.height;
    
    // Start with first point
    const firstPoint = mainContour[0];
    shape.moveTo(
      (firstPoint.x - canvas.width / 2) * scaleX,
      (firstPoint.y - canvas.height / 2) * scaleY
    );
    
    // Add all other points
    for (let i = 1; i < mainContour.length; i++) {
      const point = mainContour[i];
      shape.lineTo(
        (point.x - canvas.width / 2) * scaleX,
        (point.y - canvas.height / 2) * scaleY
      );
    }
    
    shape.closePath();
    
    // Create extrude geometry
    const extrudeSettings = {
      depth: extrudeDepth,
      bevelEnabled,
      bevelThickness: bevelEnabled ? bevelThickness : 0,
      bevelSize: bevelEnabled ? bevelSize : 0,
      bevelSegments: 3,
      steps: 1,
      curveSegments: 8
    };
    
    const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    
    // Center and orient the geometry
    geometry.computeBoundingBox();
    const center = new THREE.Vector3();
    geometry.boundingBox?.getCenter(center);
    geometry.translate(-center.x, -center.y, -center.z);
    
    return geometry;
    
  } catch (error) {
    console.error('Error creating silhouette geometry:', error);
    return createFallbackGeometry();
  }
};

const createBinaryMask = (imageData: ImageData, threshold: number): boolean[][] => {
  const { width, height, data } = imageData;
  const mask: boolean[][] = [];
  
  for (let y = 0; y < height; y++) {
    mask[y] = [];
    for (let x = 0; x < width; x++) {
      const index = (y * width + x) * 4;
      const r = data[index];
      const g = data[index + 1];
      const b = data[index + 2];
      const grayscale = (r * 0.299 + g * 0.587 + b * 0.114);
      
      // true for dark areas (silhouette), false for light areas (background)
      mask[y][x] = grayscale < threshold;
    }
  }
  
  return mask;
};

const findContours = (mask: boolean[][], width: number, height: number): Array<Array<{x: number, y: number}>> => {
  const contours: Array<Array<{x: number, y: number}>> = [];
  const visited = Array(height).fill(null).map(() => Array(width).fill(false));
  
  // Simple contour following algorithm
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      if (mask[y][x] && !visited[y][x] && isEdgePixel(mask, x, y, width, height)) {
        const contour = traceContour(mask, visited, x, y, width, height);
        if (contour.length > 10) { // Only keep contours with sufficient points
          contours.push(contour);
        }
      }
    }
  }
  
  return contours;
};

const isEdgePixel = (mask: boolean[][], x: number, y: number, width: number, height: number): boolean => {
  if (!mask[y][x]) return false; // Not a foreground pixel
  
  // Check if any neighbor is background
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      if (dx === 0 && dy === 0) continue;
      const nx = x + dx;
      const ny = y + dy;
      if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
        if (!mask[ny][nx]) return true; // Has background neighbor
      }
    }
  }
  
  return false;
};

const traceContour = (
  mask: boolean[][], 
  visited: boolean[][], 
  startX: number, 
  startY: number, 
  width: number, 
  height: number
): Array<{x: number, y: number}> => {
  const contour: Array<{x: number, y: number}> = [];
  const maxPoints = 2000; // Prevent infinite loops
  
  let x = startX;
  let y = startY;
  let direction = 0; // Start direction (0=right, 1=down, 2=left, 3=up)
  
  const directions = [
    {dx: 1, dy: 0},   // right
    {dx: 0, dy: 1},   // down
    {dx: -1, dy: 0},  // left
    {dx: 0, dy: -1}   // up
  ];
  
  do {
    contour.push({x, y});
    visited[y][x] = true;
    
    // Find next edge pixel
    let found = false;
    for (let i = 0; i < 8; i++) {
      const dir = (direction + i) % 4;
      const dx = directions[dir].dx;
      const dy = directions[dir].dy;
      const nx = x + dx;
      const ny = y + dy;
      
      if (nx >= 0 && nx < width && ny >= 0 && ny < height && 
          mask[ny][nx] && isEdgePixel(mask, nx, ny, width, height)) {
        x = nx;
        y = ny;
        direction = dir;
        found = true;
        break;
      }
    }
    
    if (!found) break;
    
  } while ((x !== startX || y !== startY) && contour.length < maxPoints);
  
  return contour;
};

const createFallbackGeometry = (): THREE.BufferGeometry => {
  // Simple box as fallback
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
  // Use the same algorithm as silhouette
  return createProperlySilhouetteGeometry(imageData, {
    extrudeDepth: options.extrudeDepth,
    bevelEnabled: options.bevelEnabled,
    bevelThickness: options.bevelThickness,
    bevelSize: options.bevelSize
  });
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