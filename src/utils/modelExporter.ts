import * as THREE from 'three';
import { STLExporter } from 'three/examples/jsm/exporters/STLExporter.js';
import { loadModelFile } from './modelLoader';

interface ExportOptions {
  color: string;
  scale: { x: number; y: number; z: number };
  fileName: string;
}

export const downloadModelWithSettings = async (
  modelUrl: string,
  options: ExportOptions
): Promise<void> => {
  try {
    // Download model file
    const response = await fetch(modelUrl);
    const arrayBuffer = await response.arrayBuffer();
    
    // Load the model
    const models = await loadModelFile(arrayBuffer, options.fileName);
    
    if (models.length === 0) {
      throw new Error('No models found in file');
    }

    // Create a Three.js mesh from the first model
    const geometry = models[0].geometry;
    
    // Apply scaling
    geometry.scale(
      options.scale.x / 100, 
      options.scale.y / 100, 
      options.scale.z / 100
    );
    
    // Create material with the specified color
    const material = new THREE.MeshStandardMaterial({
      color: options.color,
      metalness: 0.3,
      roughness: 0.4,
    });
    
    const mesh = new THREE.Mesh(geometry, material);
    
    // Export to STL
    const exporter = new STLExporter();
    const stlString = exporter.parse(mesh, { binary: true });
    
    // Create blob and download - convert to proper ArrayBuffer
    const stlData = stlString instanceof DataView 
      ? new Uint8Array(stlString.buffer as ArrayBuffer)
      : stlString;
    const blob = new Blob([stlData], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${options.fileName.replace(/\.[^/.]+$/, '')}_${options.scale.x}x${options.scale.y}x${options.scale.z}.stl`;
    link.click();
    
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Error exporting model:', error);
    throw error;
  }
};