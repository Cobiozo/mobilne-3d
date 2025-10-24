import * as THREE from 'three';
import { loadModelFile } from './modelLoader';

export const generateThumbnailFromModel = async (
  arrayBuffer: ArrayBuffer,
  color: string = '#EF4444',
  fileName: string = 'model.stl'
): Promise<string | undefined> => {
  try {
    // Create offscreen canvas
    const canvas = document.createElement('canvas');
    const thumbnailWidth = 200;
    const thumbnailHeight = 200;
    canvas.width = thumbnailWidth;
    canvas.height = thumbnailHeight;

    // Setup scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xffffff);

    // Setup camera
    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 1000);
    camera.position.set(0, 0, 100);

    // Setup renderer
    const renderer = new THREE.WebGLRenderer({ 
      canvas,
      antialias: true,
      preserveDrawingBuffer: true // Important for capturing the canvas
    });
    renderer.setSize(thumbnailWidth, thumbnailHeight);
    renderer.setPixelRatio(1); // Use 1 for thumbnails to save memory

    // Add lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const directionalLight1 = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight1.position.set(1, 1, 1);
    scene.add(directionalLight1);

    const directionalLight2 = new THREE.DirectionalLight(0xffffff, 0.4);
    directionalLight2.position.set(-1, -1, -1);
    scene.add(directionalLight2);

    // Load model using proper loader for file type
    const models = await loadModelFile(arrayBuffer, fileName);
    
    if (!models || models.length === 0) {
      throw new Error('No models found in file');
    }
    
    // Use first model
    const geometry = models[0].geometry;

    // Center geometry
    geometry.computeBoundingBox();
    const boundingBox = geometry.boundingBox!;
    const center = new THREE.Vector3();
    boundingBox.getCenter(center);
    geometry.translate(-center.x, -center.y, -center.z);

    // Scale to fit
    const size = new THREE.Vector3();
    boundingBox.getSize(size);
    const maxDim = Math.max(size.x, size.y, size.z);
    const scale = 50 / maxDim;
    geometry.scale(scale, scale, scale);

    // Create mesh
    const material = new THREE.MeshPhongMaterial({
      color: new THREE.Color(color),
      shininess: 30,
    });
    const mesh = new THREE.Mesh(geometry, material);
    
    // Rotate for better view
    mesh.rotation.x = -Math.PI / 6;
    mesh.rotation.z = Math.PI / 6;
    
    scene.add(mesh);

    // Render
    renderer.render(scene, camera);

    // Capture as base64
    const thumbnailUrl = canvas.toDataURL('image/jpeg', 0.7);
    
    console.log('Generated thumbnail, size:', Math.round(thumbnailUrl.length / 1024), 'KB');

    // Cleanup
    renderer.dispose();
    geometry.dispose();
    material.dispose();

    return thumbnailUrl;
  } catch (error) {
    console.error('Error generating thumbnail:', error);
    return undefined;
  }
};