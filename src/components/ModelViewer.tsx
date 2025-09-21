import { Canvas } from "@react-three/fiber";
import { OrbitControls, Environment, Stage, PerspectiveCamera } from "@react-three/drei";
import { Suspense } from "react";
import { LoadingSpinner } from "./LoadingSpinner";
import { Model3D } from "./Model3D";
import { useApp } from "@/contexts/AppContext";
import { useTranslation } from "@/lib/i18n";
import { ArrowDown } from "lucide-react";
import * as THREE from "three";

interface ModelViewerProps {
  modelData?: ArrayBuffer;
  modelColor: string;
  fileName?: string;
  currentGeometry?: THREE.BufferGeometry;
}

export const ModelViewer = ({ modelData, modelColor, fileName, currentGeometry }: ModelViewerProps) => {
  const { language } = useApp();
  const { t } = useTranslation(language);
  
  console.log('ModelViewer render - modelColor:', modelColor, 'hasData:', !!modelData);
  return (
    <div className="w-full h-full bg-viewer-bg rounded-lg shadow-viewer relative overflow-hidden min-h-[300px] sm:min-h-[400px] lg:min-h-[500px]">
      {(modelData || currentGeometry) ? (
        <Canvas className="w-full h-full" gl={{ preserveDrawingBuffer: true }}>
          <PerspectiveCamera makeDefault position={[5, 5, 5]} />
          
          <Suspense fallback={null}>
            {/* Add lighting directly instead of using Stage */}
            <ambientLight intensity={0.4} />
            <directionalLight
              position={[10, 10, 5]}
              intensity={1}
              castShadow
              shadow-mapSize-width={1024}
              shadow-mapSize-height={1024}
            />
            <pointLight position={[-10, -10, -10]} intensity={0.5} />
            
            {currentGeometry ? (
              <mesh geometry={currentGeometry} castShadow receiveShadow>
                <meshStandardMaterial
                  color={modelColor}
                  metalness={0.3}
                  roughness={0.4}
                  side={THREE.DoubleSide}
                />
              </mesh>
            ) : (
              <Model3D 
                modelData={modelData!} 
                color={modelColor}
                fileName={fileName}
              />
            )}
            
            <Environment preset="studio" />
          </Suspense>
          
          <OrbitControls
            enablePan={true}
            enableZoom={true}
            enableRotate={true}
            minDistance={2}
            maxDistance={50}
            autoRotate={false}
            autoRotateSpeed={0.5}
          />
        </Canvas>
      ) : (
        <div className="flex items-center justify-center h-full p-4 sm:p-6">
          <div className="text-center space-y-3 sm:space-y-4 max-w-sm mx-auto">
            <div className="w-16 h-16 sm:w-20 sm:h-20 lg:w-24 lg:h-24 mx-auto rounded-full bg-muted flex items-center justify-center">
              <ArrowDown className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 text-primary animate-bounce" />
            </div>
            <h3 className="text-lg sm:text-xl font-semibold text-muted-foreground">
              {t('readyTitle')}
            </h3>
            <p className="text-muted-foreground text-sm sm:text-base">
              {t('readySubtitle')}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};