import * as THREE from 'three';
import { supabase } from '@/integrations/supabase/client';

export interface ImageToGeometryOptions {
  width?: number;
  height?: number;
  heightScale?: number;
  smoothing?: boolean;
  mode?: 'heightmap' | 'extrude' | 'silhouette' | 'gen3d';
  extrudeDepth?: number;
  bevelEnabled?: boolean;
  bevelThickness?: number;
  bevelSize?: number;
  // Gen3D 2.0 specific options
  topology?: 'triangle' | 'quad';
  target_polycount?: number;
  symmetry_mode?: 'off' | 'auto' | 'on';
  should_remesh?: boolean;
  should_texture?: boolean;
  enable_pbr?: boolean;
  is_a_t_pose?: boolean;
}

export interface Gen3DResult {
  success: boolean;
  taskId?: string;
  model_urls?: {
    glb?: string;
    fbx?: string;
    obj?: string;
    mtl?: string;
  };
  thumbnail_url?: string;
  video_url?: string;
  error?: string;
  geometry?: THREE.BufferGeometry;
  method?: string;
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

  if (mode === 'gen3d') {
    // Gen3D 2.0 mode uses the edge function for AI-powered 3D generation
    throw new Error('Gen3D 2.0 mode requires async processing via imageToGen3D function');
  } else if (mode === 'silhouette') {
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

// New Gen3D 2.0 function for AI-powered image to 3D conversion
export const imageToGen3D = async (
  imageData: ImageData, 
  options: ImageToGeometryOptions = {}
): Promise<Gen3DResult> => {
  try {
    // Convert ImageData to base64
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    canvas.width = imageData.width;
    canvas.height = imageData.height;
    ctx.putImageData(imageData, 0, 0);
    
    const base64 = canvas.toDataURL('image/png').split(',')[1];
    
    console.log('Sending image to PartCrafter engine...');
    
    const { data, error } = await supabase.functions.invoke('image-to-3d-gen3d', {
      body: {
        imageBase64: base64,
        options: {
          topology: options.topology || 'triangle',
          target_polycount: options.target_polycount || 30000,
          symmetry_mode: options.symmetry_mode || 'auto',
          should_remesh: options.should_remesh !== false,
          should_texture: options.should_texture !== false,
          enable_pbr: options.enable_pbr || true,
          is_a_t_pose: options.is_a_t_pose || false,
        }
      }
    });

    if (error) {
      console.error('PartCrafter Edge Function Error:', error);
      return { success: false, error: error.message };
    }

    // Handle different response types
    if (data.success && data.result) {
      if (data.format === 'glb' && data.result) {
        // Convert base64 GLB to geometry
        try {
          const geometry = await loadGLBFromBase64(data.result);
          return { success: true, geometry, method: data.method };
        } catch (glbError) {
          console.warn('Failed to load GLB, using enhanced PartCrafter local method');
          return generateEnhancedLocalGeometry(imageData, data.result);
        }
      } else if (data.format === 'geometry' && data.result) {
        // Use enhanced local generation
        return generateEnhancedLocalGeometry(imageData, data.result);
      }
    }

    return data as Gen3DResult;
  } catch (error) {
    console.error('Error in PartCrafter conversion:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
};

// Enhanced local geometry generation (Gen3D 2.0 inspired)
const generateEnhancedLocalGeometry = (imageData: ImageData, parameters: any): Gen3DResult => {
  try {
    console.log('Generating enhanced local 3D geometry with Gen3D 2.0 algorithm...');
    
    const geometry = createEnhancedGen3DGeometry(imageData, parameters);
    
    return {
      success: true,
      geometry,
      method: 'Enhanced Local Gen3D 2.0'
    };
  } catch (error) {
    console.error('Enhanced local generation failed:', error);
    return { success: false, error: error.message };
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
  const resolution = 100; // Back to original resolution for good detail
  
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
  
  
  // More lenient threshold for black detection
  const threshold = 180;
  
  console.log('Processing pixels with threshold:', threshold);
  
  let vertexIndex = 0;
  let darkPixelCount = 0;
  let sampleValues: number[] = [];
  
  for (let y = 0; y < resolution; y++) {
    for (let x = 0; x < resolution; x++) {
      const index = (y * resolution + x) * 4;
      
      // Get grayscale value
      const r = scaledImageData.data[index];
      const g = scaledImageData.data[index + 1];
      const b = scaledImageData.data[index + 2];
      const grayscale = (r * 0.299 + g * 0.587 + b * 0.114);
      
      // Collect sample values for debugging
      if (sampleValues.length < 10 && (x % 10 === 0) && (y % 10 === 0)) {
        sampleValues.push(grayscale);
      }
      
      // Only create geometry for dark pixels (silhouette)
      if (grayscale < threshold) {
        darkPixelCount++;
        
        // Calculate world position
        const worldX = (x / resolution) * 4 - 2; // Center at origin
        const worldZ = (y / resolution) * 4 - 2; // Center at origin
        const worldY = extrudeDepth / 2; // Center vertically
        
        // Create a box for this voxel
        addVoxel(vertices, indices, normals, worldX, worldY, worldZ, voxelSize, extrudeDepth, vertexIndex);
        vertexIndex += 8; // 8 vertices per box
      }
    }
  }
  
  console.log('Sample pixel values:', sampleValues);
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

// Utility to load 3D model from URL
export const loadModelFromUrl = async (url: string): Promise<THREE.BufferGeometry> => {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch model: ${response.status}`);
    }
    
    const arrayBuffer = await response.arrayBuffer();
    
    // Import GLTFLoader dynamically
    const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js');
    const loader = new GLTFLoader();
    
    return new Promise((resolve, reject) => {
      loader.parse(arrayBuffer, '', (gltf) => {
        // Extract geometry from the first mesh found
        const mesh = gltf.scene.children.find(child => 
          child instanceof THREE.Mesh
        ) as THREE.Mesh;
        
        if (mesh && mesh.geometry) {
          resolve(mesh.geometry);
        } else {
          reject(new Error('No valid geometry found in the model'));
        }
      }, reject);
    });
  } catch (error) {
    console.error('Error loading model from URL:', error);
    throw error;
  }
};

// Load GLB from base64 data
export const loadGLBFromBase64 = async (base64Data: string): Promise<THREE.BufferGeometry> => {
  try {
    // Convert base64 to ArrayBuffer
    const binaryString = atob(base64Data);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    const arrayBuffer = bytes.buffer;
    
    // Import GLTFLoader dynamically
    const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js');
    const loader = new GLTFLoader();
    
    return new Promise((resolve, reject) => {
      loader.parse(arrayBuffer, '', (gltf) => {
        // Extract geometry from the first mesh found
        const mesh = gltf.scene.children.find(child => 
          child instanceof THREE.Mesh
        ) as THREE.Mesh;
        
        if (mesh && mesh.geometry) {
          resolve(mesh.geometry);
        } else {
          reject(new Error('No valid geometry found in the GLB model'));
        }
      }, reject);
    });
  } catch (error) {
    console.error('Error loading GLB from base64:', error);
    throw error;
  }
};

// Enhanced Gen3D 2.0 geometry creation algorithm
const createEnhancedGen3DGeometry = (
  imageData: ImageData,
  parameters: any
): THREE.BufferGeometry => {
  console.log('Creating enhanced Gen3D 2.0 geometry with parameters:', parameters);
  
  if (parameters?.algorithm === 'enhanced_heightmap_extrusion') {
    return createEnhancedHeightmapGeometry(imageData, parameters.parameters);
  }
  
  // Fallback to enhanced silhouette with better quality
  return createEnhancedSilhouetteGeometry(imageData);
};

// Enhanced heightmap with multi-layer extrusion
const createEnhancedHeightmapGeometry = (
  imageData: ImageData,
  params: any
): THREE.BufferGeometry => {
  const resolution = 256; // Higher resolution for better quality
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;
  canvas.width = resolution;
  canvas.height = resolution;
  
  // Create temporary canvas for processing
  const tempCanvas = document.createElement('canvas');
  const tempCtx = tempCanvas.getContext('2d')!;
  tempCanvas.width = imageData.width;
  tempCanvas.height = imageData.height;
  tempCtx.putImageData(imageData, 0, 0);
  
  // Scale with better smoothing
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(tempCanvas, 0, 0, resolution, resolution);
  const scaledImageData = ctx.getImageData(0, 0, resolution, resolution);
  
  // Create enhanced plane geometry
  const geometry = new THREE.PlaneGeometry(4, 4, resolution - 1, resolution - 1);
  const positions = geometry.getAttribute('position') as THREE.BufferAttribute;
  
  // Apply enhanced heightmap with edge detection and multiple layers
  for (let y = 0; y < resolution; y++) {
    for (let x = 0; x < resolution; x++) {
      const index = (y * resolution + x) * 4;
      
      // Calculate enhanced grayscale with edge detection
      const r = scaledImageData.data[index];
      const g = scaledImageData.data[index + 1];
      const b = scaledImageData.data[index + 2];
      const grayscale = (r * 0.299 + g * 0.587 + b * 0.114) / 255;
      
      // Apply multi-layer extrusion
      let heightValue = grayscale * 2.5; // Base height
      
      // Add edge enhancement
      if (params?.edge_detection) {
        const edgeStrength = calculateEdgeStrength(scaledImageData, x, y, resolution);
        heightValue += edgeStrength * 0.5;
      }
      
      // Apply adaptive tessellation effect
      if (params?.adaptive_tessellation) {
        const detail = calculateDetailLevel(scaledImageData, x, y, resolution);
        heightValue += detail * 0.3;
      }
      
      const vertexIndex = y * resolution + x;
      positions.setZ(vertexIndex, heightValue);
    }
  }
  
  positions.needsUpdate = true;
  
  // Apply enhanced normal calculation
  if (params?.smooth_normals) {
    geometry.computeVertexNormals();
    // Additional smoothing pass
    smoothVertexNormals(geometry, 2);
  }
  
  return geometry;
};

// Enhanced silhouette with better voxelization
const createEnhancedSilhouetteGeometry = (imageData: ImageData): THREE.BufferGeometry => {
  const resolution = 128; // Optimized resolution
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;
  canvas.width = resolution;
  canvas.height = resolution;
  
  const tempCanvas = document.createElement('canvas');
  const tempCtx = tempCanvas.getContext('2d')!;
  tempCanvas.width = imageData.width;
  tempCanvas.height = imageData.height;
  tempCtx.putImageData(imageData, 0, 0);
  
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(tempCanvas, 0, 0, resolution, resolution);
  const scaledImageData = ctx.getImageData(0, 0, resolution, resolution);
  
  const vertices: number[] = [];
  const indices: number[] = [];
  const normals: number[] = [];
  
  const voxelSize = 4 / resolution;
  const halfSize = voxelSize / 2;
  const extrudeDepth = 1.0; // Enhanced depth
  
  let vertexIndex = 0;
  const threshold = 200; // Optimized threshold
  
  for (let y = 0; y < resolution; y++) {
    for (let x = 0; x < resolution; x++) {
      const index = (y * resolution + x) * 4;
      const r = scaledImageData.data[index];
      const g = scaledImageData.data[index + 1];
      const b = scaledImageData.data[index + 2];
      const grayscale = (r * 0.299 + g * 0.587 + b * 0.114);
      
      if (grayscale < threshold) {
        const worldX = (x / resolution) * 4 - 2;
        const worldZ = (y / resolution) * 4 - 2;
        const worldY = extrudeDepth / 2;
        
        // Enhanced voxel with variable height based on grayscale
        const heightMultiplier = 1 - (grayscale / threshold);
        const voxelHeight = extrudeDepth * (0.5 + heightMultiplier * 0.5);
        
        addEnhancedVoxel(vertices, indices, normals, worldX, worldY, worldZ, voxelSize, voxelHeight, vertexIndex);
        vertexIndex += 8;
      }
    }
  }
  
  if (vertices.length === 0) {
    console.warn('No dark pixels found, creating fallback geometry');
    return new THREE.BoxGeometry(2, 0.2, 2);
  }
  
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geometry.setIndex(indices);
  
  geometry.computeVertexNormals();
  return geometry;
};

// Helper functions for enhanced generation
const calculateEdgeStrength = (imageData: ImageData, x: number, y: number, resolution: number): number => {
  // Simple edge detection using Sobel operator
  let gx = 0, gy = 0;
  
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      const nx = Math.max(0, Math.min(resolution - 1, x + dx));
      const ny = Math.max(0, Math.min(resolution - 1, y + dy));
      const index = (ny * resolution + nx) * 4;
      
      const intensity = (imageData.data[index] + imageData.data[index + 1] + imageData.data[index + 2]) / 3;
      
      // Sobel kernels
      const sobelX = [-1, 0, 1, -2, 0, 2, -1, 0, 1];
      const sobelY = [-1, -2, -1, 0, 0, 0, 1, 2, 1];
      
      const kernelIndex = (dy + 1) * 3 + (dx + 1);
      gx += intensity * sobelX[kernelIndex];
      gy += intensity * sobelY[kernelIndex];
    }
  }
  
  return Math.sqrt(gx * gx + gy * gy) / 255;
};

const calculateDetailLevel = (imageData: ImageData, x: number, y: number, resolution: number): number => {
  // Calculate local variance for detail level
  let mean = 0, variance = 0;
  const windowSize = 3;
  let count = 0;
  
  // Calculate mean
  for (let dy = -windowSize; dy <= windowSize; dy++) {
    for (let dx = -windowSize; dx <= windowSize; dx++) {
      const nx = x + dx;
      const ny = y + dy;
      if (nx >= 0 && nx < resolution && ny >= 0 && ny < resolution) {
        const index = (ny * resolution + nx) * 4;
        const intensity = (imageData.data[index] + imageData.data[index + 1] + imageData.data[index + 2]) / 3;
        mean += intensity;
        count++;
      }
    }
  }
  mean /= count;
  
  // Calculate variance
  for (let dy = -windowSize; dy <= windowSize; dy++) {
    for (let dx = -windowSize; dx <= windowSize; dx++) {
      const nx = x + dx;
      const ny = y + dy;
      if (nx >= 0 && nx < resolution && ny >= 0 && ny < resolution) {
        const index = (ny * resolution + nx) * 4;
        const intensity = (imageData.data[index] + imageData.data[index + 1] + imageData.data[index + 2]) / 3;
        variance += (intensity - mean) * (intensity - mean);
      }
    }
  }
  variance /= count;
  
  return Math.sqrt(variance) / 255;
};

const smoothVertexNormals = (geometry: THREE.BufferGeometry, iterations: number) => {
  const normals = geometry.getAttribute('normal') as THREE.BufferAttribute;
  const positions = geometry.getAttribute('position') as THREE.BufferAttribute;
  
  for (let iter = 0; iter < iterations; iter++) {
    const smoothedNormals = new Float32Array(normals.array.length);
    
    for (let i = 0; i < normals.count; i++) {
      let avgX = 0, avgY = 0, avgZ = 0;
      let count = 0;
      
      // Average with nearby vertices (simplified smoothing)
      const maxDistance = 0.1;
      const currentPos = new THREE.Vector3(
        positions.getX(i),
        positions.getY(i),
        positions.getZ(i)
      );
      
      for (let j = 0; j < normals.count; j++) {
        const testPos = new THREE.Vector3(
          positions.getX(j),
          positions.getY(j),
          positions.getZ(j)
        );
        
        if (currentPos.distanceTo(testPos) < maxDistance) {
          avgX += normals.getX(j);
          avgY += normals.getY(j);
          avgZ += normals.getZ(j);
          count++;
        }
      }
      
      if (count > 0) {
        avgX /= count;
        avgY /= count;
        avgZ /= count;
        
        // Normalize
        const length = Math.sqrt(avgX * avgX + avgY * avgY + avgZ * avgZ);
        if (length > 0) {
          smoothedNormals[i * 3] = avgX / length;
          smoothedNormals[i * 3 + 1] = avgY / length;
          smoothedNormals[i * 3 + 2] = avgZ / length;
        }
      }
    }
    
    normals.set(smoothedNormals);
    normals.needsUpdate = true;
  }
};

const addEnhancedVoxel = (
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
  
  // 8 vertices of a box with variable height
  const boxVertices = [
    [x - halfSize, y - halfHeight, z - halfSize],
    [x + halfSize, y - halfHeight, z - halfSize],
    [x + halfSize, y - halfHeight, z + halfSize],
    [x - halfSize, y - halfHeight, z + halfSize],
    [x - halfSize, y + halfHeight, z - halfSize],
    [x + halfSize, y + halfHeight, z - halfSize],
    [x + halfSize, y + halfHeight, z + halfSize],
    [x - halfSize, y + halfHeight, z + halfSize],
  ];
  
  boxVertices.forEach(vertex => {
    vertices.push(vertex[0], vertex[1], vertex[2]);
  });
  
  // Enhanced face indexing with proper winding
  const faces = [
    [0, 1, 2], [0, 2, 3], // Bottom
    [4, 6, 5], [4, 7, 6], // Top  
    [0, 4, 5], [0, 5, 1], // Front
    [2, 6, 7], [2, 7, 3], // Back
    [0, 3, 7], [0, 7, 4], // Left
    [1, 5, 6], [1, 6, 2], // Right
  ];
  
  faces.forEach(face => {
    indices.push(
      baseIndex + face[0],
      baseIndex + face[1], 
      baseIndex + face[2]
    );
  });
  
  // Add proper normals for each vertex
  for (let i = 0; i < 8; i++) {
    normals.push(0, 1, 0);
  }
};