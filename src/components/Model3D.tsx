import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js";

interface Model3DProps {
  modelData: ArrayBuffer;
  color: string;
  fileName?: string;
}

export const Model3D = ({ modelData, color, fileName }: Model3DProps) => {
  const meshRef = useRef<THREE.Mesh>(null);
  
  console.log('Model3D render - color:', color, 'fileName:', fileName);
  
  const geometry = useMemo(() => {
    const loader = new STLLoader();
    
    try {
      const geometry = loader.parse(modelData);
      
      // Center the geometry
      geometry.computeBoundingBox();
      const center = new THREE.Vector3();
      geometry.boundingBox?.getCenter(center);
      geometry.translate(-center.x, -center.y, -center.z);
      
      // Bezpieczne skalowanie dla STL
      const size = new THREE.Vector3();
      geometry.boundingBox?.getSize(size);
      const maxDimension = Math.max(size.x, size.y, size.z);
      
      if (maxDimension > 0) {
        const targetSize = 4; // Docelowy rozmiar 
        const scaleFactor = targetSize / maxDimension;
        const safeScale = Math.max(0.01, Math.min(100, scaleFactor));
        geometry.scale(safeScale, safeScale, safeScale);
        console.log(`STL geometry safely scaled: ${maxDimension} -> ${targetSize} (factor: ${safeScale})`);
      }
      
      // Compute normals for proper lighting
      geometry.computeVertexNormals();
      
      return geometry;
    } catch (error) {
      console.error("Error parsing STL file:", error);
      // Return a fallback box geometry
      return new THREE.BoxGeometry(1, 1, 1);
    }
  }, [modelData]);

  const material = useMemo(() => {
    console.log('Creating material with color:', color);
    const mat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(color || "#FFFFFF"),
      metalness: 0.3,
      roughness: 0.4,
      transparent: false,
      side: THREE.DoubleSide,
    });
    mat.needsUpdate = true;
    console.log('Material created:', mat.color.getHexString());
    return mat;
  }, [color]);

  // Force material update when color changes
  useEffect(() => {
    if (meshRef.current && meshRef.current.material) {
      console.log('Updating mesh material color to:', color);
      const mat = meshRef.current.material as THREE.MeshStandardMaterial;
      mat.color.set(color);
      mat.needsUpdate = true;
    }
  }, [color]);

  // CAŁKOWICIE WYŁĄCZAM useFrame żeby sprawdzić czy to powoduje problem
  // useFrame((state) => {
  //   if (meshRef.current) {
  //     // Subtle auto-rotation when not being controlled - ale tylko obracanie, nie skalowanie
  //     const controls = state.controls as any;
  //     if (!controls?.enabled || !controls.getUserInteraction?.()) {
  //       meshRef.current.rotation.y += 0.005;
  //     }
  //   }
  // });

  return (
    <mesh ref={meshRef} geometry={geometry} material={material} castShadow receiveShadow>
    </mesh>
  );
};