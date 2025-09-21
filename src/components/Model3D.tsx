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
  
  const geometry = useMemo(() => {
    const loader = new STLLoader();
    
    try {
      const geometry = loader.parse(modelData);
      
      // Center the geometry
      geometry.computeBoundingBox();
      const center = new THREE.Vector3();
      geometry.boundingBox?.getCenter(center);
      geometry.translate(-center.x, -center.y, -center.z);
      
      // Scale to reasonable size
      const size = new THREE.Vector3();
      geometry.boundingBox?.getSize(size);
      const maxDimension = Math.max(size.x, size.y, size.z);
      const scale = 3 / maxDimension;
      geometry.scale(scale, scale, scale);
      
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
    const mat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(color || "#FFFFFF"),
      metalness: 0.3,
      roughness: 0.4,
      transparent: false,
      side: THREE.DoubleSide,
    });
    mat.needsUpdate = true;
    return mat;
  }, [color]);

  useFrame((state) => {
    if (meshRef.current) {
      // Subtle auto-rotation when not being controlled
      const controls = state.controls as any;
      if (!controls?.enabled || !controls.getUserInteraction?.()) {
        meshRef.current.rotation.y += 0.005;
      }
    }
  });

  return (
    <mesh ref={meshRef} geometry={geometry} material={material} castShadow receiveShadow>
      {/* Optional wireframe overlay for technical look */}
      <meshBasicMaterial
        color={color}
        wireframe
        transparent
        opacity={0.1}
        attach="material-1"
      />
    </mesh>
  );
};