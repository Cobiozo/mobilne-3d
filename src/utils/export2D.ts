import * as THREE from 'three';
import jsPDF from 'jspdf';
import { toast } from 'sonner';

export const exportCanvasAs = async (
  canvas: HTMLCanvasElement, 
  format: 'png' | 'jpg' | 'pdf', 
  fileName: string = 'model-export'
) => {
  try {
    const dataURL = canvas.toDataURL(format === 'pdf' ? 'image/png' : `image/${format === 'jpg' ? 'jpeg' : 'png'}`, 0.95);
    
    if (format === 'pdf') {
      // Create PDF with jsPDF
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
      });
      
      // Calculate dimensions to fit the page
      const pdfWidth = 297; // A4 landscape width in mm
      const pdfHeight = 210; // A4 landscape height in mm
      const margin = 20;
      
      const maxWidth = pdfWidth - (2 * margin);
      const maxHeight = pdfHeight - (2 * margin);
      
      // Get image dimensions
      const img = new Image();
      img.onload = () => {
        const imgRatio = img.width / img.height;
        let width = maxWidth;
        let height = width / imgRatio;
        
        if (height > maxHeight) {
          height = maxHeight;
          width = height * imgRatio;
        }
        
        const x = (pdfWidth - width) / 2;
        const y = (pdfHeight - height) / 2;
        
        pdf.addImage(dataURL, 'PNG', x, y, width, height);
        pdf.save(`${fileName}.pdf`);
        toast.success('Model wyeksportowany jako PDF pomyślnie!');
      };
      img.src = dataURL;
    } else {
      // Create download link for image formats
      const link = document.createElement('a');
      link.download = `${fileName}.${format}`;
      link.href = dataURL;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success(`Model wyeksportowany jako ${format.toUpperCase()} pomyślnie!`);
    }
  } catch (error) {
    console.error('Export error:', error);
    toast.error('Nie udało się wyeksportować modelu. Spróbuj ponownie.');
  }
};

export const render2DView = (
  geometry: THREE.BufferGeometry,
  material: THREE.Material,
  view: '2d-front' | '2d-top' | '2d-side',
  modelColor: string
): HTMLCanvasElement => {
  // Create offscreen canvas for rendering
  const canvas = document.createElement('canvas');
  const size = 1024;
  canvas.width = size;
  canvas.height = size;
  
  // Create scene
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#ffffff');
  
  // Create mesh
  const mesh = new THREE.Mesh(geometry, material);
  scene.add(mesh);
  
  // Calculate bounding box
  geometry.computeBoundingBox();
  const bbox = geometry.boundingBox!;
  const center = new THREE.Vector3();
  bbox.getCenter(center);
  const size3d = new THREE.Vector3();
  bbox.getSize(size3d);
  
  // Create orthographic camera
  const maxDim = Math.max(size3d.x, size3d.y, size3d.z);
  const distance = maxDim * 2;
  
  let camera: THREE.OrthographicCamera;
  
  switch (view) {
    case '2d-front':
      camera = new THREE.OrthographicCamera(
        -maxDim, maxDim, maxDim, -maxDim, 0.1, distance * 2
      );
      camera.position.set(center.x, center.y, center.z + distance);
      break;
    case '2d-top':
      camera = new THREE.OrthographicCamera(
        -maxDim, maxDim, maxDim, -maxDim, 0.1, distance * 2
      );
      camera.position.set(center.x, center.y + distance, center.z);
      camera.up.set(0, 0, -1);
      break;
    case '2d-side':
      camera = new THREE.OrthographicCamera(
        -maxDim, maxDim, maxDim, -maxDim, 0.1, distance * 2
      );
      camera.position.set(center.x + distance, center.y, center.z);
      break;
  }
  
  camera.lookAt(center);
  
  // Add lighting
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
  scene.add(ambientLight);
  
  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
  directionalLight.position.copy(camera.position);
  scene.add(directionalLight);
  
  // Create renderer
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    preserveDrawingBuffer: true
  });
  renderer.setSize(size, size);
  renderer.setClearColor('#ffffff');
  
  // Render
  renderer.render(scene, camera);
  
  // Cleanup
  renderer.dispose();
  scene.clear();
  
  return canvas;
};