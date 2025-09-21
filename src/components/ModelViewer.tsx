import { Canvas } from "@react-three/fiber";
import { OrbitControls, Environment, Stage, PerspectiveCamera } from "@react-three/drei";
import { Suspense } from "react";
import { LoadingSpinner } from "./LoadingSpinner";
import { Model3D } from "./Model3D";
import { useApp } from "@/contexts/AppContext";
import { useTranslation } from "@/lib/i18n";

interface ModelViewerProps {
  modelData?: ArrayBuffer;
  modelColor: string;
  fileName?: string;
}

export const ModelViewer = ({ modelData, modelColor, fileName }: ModelViewerProps) => {
  const { language } = useApp();
  const { t } = useTranslation(language);
  
  console.log('ModelViewer render - modelColor:', modelColor, 'hasData:', !!modelData);
  return (
    <div className="w-full h-full bg-viewer-bg rounded-lg shadow-viewer relative overflow-hidden">
      {modelData ? (
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
            
            <Model3D 
              modelData={modelData} 
              color={modelColor}
              fileName={fileName}
            />
            
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
        <div className="flex items-center justify-center h-full">
          <div className="text-center space-y-4">
            <div className="w-24 h-24 mx-auto rounded-full bg-muted flex items-center justify-center">
              <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
            </div>
            <h3 className="text-xl font-semibold text-muted-foreground">
              {t('readyTitle')}
            </h3>
            <p className="text-muted-foreground">
              {t('readySubtitle')}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};