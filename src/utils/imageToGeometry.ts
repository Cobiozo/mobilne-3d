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
  console.log('Creating VOXEL-BASED silhouette geometry from image:', imageData.width, 'x', imageData.height);
  
  const { extrudeDepth } = options;
  const resolution = 80; // Slightly lower resolution for smoother result
  const smoothingPasses = 2; // Add smoothing
  
  // Create canvas for image processing
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;
  canvas.width = resolution;
  canvas.height = resolution;
  
  // Draw original image to temporary canvas
  const tempCanvas = document.createElement('canvas');
  const tempCtx = tempCanvas.getContext('2d')!;
  tempCanvas.width = imageData.width;
  tempCanvas.height = imageData.height;
  tempCtx.putImageData(imageData, 0, 0);
  
  // Scale to working resolution with NO smoothing for pixel-perfect result
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(tempCanvas, 0, 0, resolution, resolution);
  const scaledImageData = ctx.getImageData(0, 0, resolution, resolution);
  
  // Create geometry using BufferGeometry for better performance
  const vertices: number[] = [];
  const indices: number[] = [];
  const normals: number[] = [];
  
  const voxelSize = 4 / resolution; // World size divided by resolution
  const halfSize = voxelSize / 2;
  
  let vertexIndex = 0;
  
  // More lenient threshold for black detection
  const threshold = 180;
  
  console.log('Processing pixels with threshold:', threshold);
  
  // First pass: create pixel map for smoothing
  const pixelMap: boolean[][] = [];
  let sampleValues: number[] = [];
  
  // Initialize pixel map
  for (let y = 0; y < resolution; y++) {
    pixelMap[y] = [];
    for (let x = 0; x < resolution; x++) {
      const index = (y * resolution + x) * 4;
      
      const r = scaledImageData.data[index];
      const g = scaledImageData.data[index + 1];
      const b = scaledImageData.data[index + 2];
      const grayscale = (r * 0.299 + g * 0.587 + b * 0.114);
      
      if (sampleValues.length < 10 && (x % 10 === 0) && (y % 10 === 0)) {
        sampleValues.push(grayscale);
      }
      
      pixelMap[y][x] = grayscale < threshold;
    }
  }
  
  // Apply smoothing passes to reduce jaggedness
  for (let pass = 0; pass < smoothingPasses; pass++) {
    const smoothedMap: boolean[][] = [];
    for (let y = 0; y < resolution; y++) {
      smoothedMap[y] = [];
      for (let x = 0; x < resolution; x++) {
        if (y === 0 || y === resolution - 1 || x === 0 || x === resolution - 1) {
          // Keep edges as is
          smoothedMap[y][x] = pixelMap[y][x];
        } else {
          // Apply majority filter (if most neighbors are on, turn on)
          let neighbors = 0;
          let total = 0;
          
          for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
              if (pixelMap[y + dy][x + dx]) neighbors++;
              total++;
            }
          }
          
          // Use majority rule for smoothing
          smoothedMap[y][x] = neighbors > total / 2;
        }
      }
    }
    
    // Copy back
    for (let y = 0; y < resolution; y++) {
      for (let x = 0; x < resolution; x++) {
        pixelMap[y][x] = smoothedMap[y][x];
      }
    }
  }
  
  console.log('Sample pixel values:', sampleValues);
  
  // Second pass: create geometry from smoothed pixel map
  let darkPixelCount = 0;
  for (let y = 0; y < resolution; y++) {
    for (let x = 0; x < resolution; x++) {
      if (pixelMap[y][x]) {
        darkPixelCount++;
        
        // Calculate world position
        const worldX = (x / resolution) * 4 - 2;
        const worldZ = (y / resolution) * 4 - 2;
        const worldY = extrudeDepth / 2;
        
        // Create smaller, overlapping voxels for smoother appearance
        const smallerVoxelSize = voxelSize * 1.1; // Slightly larger for overlap
        addVoxel(vertices, indices, normals, worldX, worldY, worldZ, smallerVoxelSize, extrudeDepth, vertexIndex);
        vertexIndex += 8;
      }
    }
  }
  
  console.log('Dark pixels found:', darkPixelCount, 'out of', resolution * resolution);
  console.log('Created voxels:', vertexIndex / 8, 'Total vertices:', vertices.length / 3);
  
  if (vertices.length === 0) {
    console.warn('No dark pixels found, creating fallback geometry');
    return createFallbackGeometry();
  }
  
  // Create BufferGeometry
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geometry.setIndex(indices);
  
  // Compute final normals
  geometry.computeVertexNormals();
  
  console.log('VOXEL silhouette geometry created successfully');
  return geometry;
};

// Helper function to add a voxel (small box) to the geometry
const addVoxel = (
  vertices: number[], 
  indices: number[], 
  normals: number[], 
  x: number, 
  y: number, 
  z: number, 
  size: number, 
  height: number,
  baseIndex: number
) => {
  const halfSize = size / 2;
  const halfHeight = height / 2;
  
  // 8 vertices of a box
  const boxVertices = [
    // Bottom face
    [x - halfSize, y - halfHeight, z - halfSize],
    [x + halfSize, y - halfHeight, z - halfSize],
    [x + halfSize, y - halfHeight, z + halfSize],
    [x - halfSize, y - halfHeight, z + halfSize],
    // Top face
    [x - halfSize, y + halfHeight, z - halfSize],
    [x + halfSize, y + halfHeight, z - halfSize],
    [x + halfSize, y + halfHeight, z + halfSize],
    [x - halfSize, y + halfHeight, z + halfSize],
  ];
  
  // Add vertices
  boxVertices.forEach(vertex => {
    vertices.push(vertex[0], vertex[1], vertex[2]);
  });
  
  // Add box faces (12 triangles, 2 per face)
  const faces = [
    // Bottom face
    [0, 1, 2], [0, 2, 3],
    // Top face
    [4, 6, 5], [4, 7, 6],
    // Front face
    [0, 4, 5], [0, 5, 1],
    // Back face
    [2, 6, 7], [2, 7, 3],
    // Left face
    [0, 3, 7], [0, 7, 4],
    // Right face
    [1, 5, 6], [1, 6, 2],
  ];
  
  faces.forEach(face => {
    indices.push(
      baseIndex + face[0],
      baseIndex + face[1], 
      baseIndex + face[2]
    );
  });
  
  // Add normals (simplified - will be recomputed)
  for (let i = 0; i < 8; i++) {
    normals.push(0, 1, 0);
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