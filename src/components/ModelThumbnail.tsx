import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js';
import { Package } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface ModelThumbnailProps {
  fileUrl: string;
  color?: string;
  className?: string;
}

export const ModelThumbnail = ({ fileUrl, color = '#FFFFFF', className = '' }: ModelThumbnailProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);
  const sceneRef = useRef<{
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    renderer: THREE.WebGLRenderer;
    mesh?: THREE.Mesh;
  } | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadAndRenderModel = async () => {
      if (!containerRef.current) return;

      const container = containerRef.current;
      const width = container.clientWidth;
      const height = container.clientHeight;

      // Setup scene
      const scene = new THREE.Scene();
      scene.background = new THREE.Color(0xf5f5f5);

      // Setup camera
      const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
      camera.position.set(0, 0, 100);

      // Setup renderer
      const renderer = new THREE.WebGLRenderer({ antialias: true });
      renderer.setSize(width, height);
      renderer.setPixelRatio(window.devicePixelRatio);
      container.appendChild(renderer.domElement);

      // Add lights
      const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
      scene.add(ambientLight);

      const directionalLight1 = new THREE.DirectionalLight(0xffffff, 0.8);
      directionalLight1.position.set(1, 1, 1);
      scene.add(directionalLight1);

      const directionalLight2 = new THREE.DirectionalLight(0xffffff, 0.4);
      directionalLight2.position.set(-1, -1, -1);
      scene.add(directionalLight2);

      if (isMounted) {
        sceneRef.current = { scene, camera, renderer };
      }

      try {
        // Fetch file directly from public URL (works for non-authenticated users)
        const response = await fetch(fileUrl);
        if (!response.ok) throw new Error('Failed to load model file');
        
        const arrayBuffer = await response.arrayBuffer();

        // Load model geometry
        const loader = new STLLoader();
        const geometry = loader.parse(arrayBuffer);

        if (!isMounted) return;

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
        
        if (sceneRef.current) {
          sceneRef.current.mesh = mesh;
        }

        // Render
        renderer.render(scene, camera);
        
        if (isMounted) {
          setIsLoading(false);
        }
      } catch (error) {
        console.error('Error loading model for thumbnail:', error);
        if (isMounted) {
          setError(true);
          setIsLoading(false);
        }
      }
    };

    loadAndRenderModel();

    // Cleanup
    return () => {
      isMounted = false;
      if (sceneRef.current) {
        sceneRef.current.renderer.dispose();
        if (sceneRef.current.mesh) {
          sceneRef.current.mesh.geometry.dispose();
          if (Array.isArray(sceneRef.current.mesh.material)) {
            sceneRef.current.mesh.material.forEach(m => m.dispose());
          } else {
            sceneRef.current.mesh.material.dispose();
          }
        }
      }
      if (containerRef.current?.firstChild) {
        containerRef.current.removeChild(containerRef.current.firstChild);
      }
    };
  }, [fileUrl]);

  // Update color when it changes
  useEffect(() => {
    if (sceneRef.current?.mesh) {
      const material = sceneRef.current.mesh.material as THREE.MeshPhongMaterial;
      material.color.set(color);
      sceneRef.current.renderer.render(sceneRef.current.scene, sceneRef.current.camera);
    }
  }, [color]);

  if (error) {
    return (
      <div className={`flex items-center justify-center bg-muted ${className}`}>
        <Package className="w-12 h-12 text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      <div ref={containerRef} className="w-full h-full" />
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      )}
    </div>
  );
};
