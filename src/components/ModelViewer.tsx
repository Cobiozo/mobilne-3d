import { Canvas } from "@react-three/fiber";
import { OrbitControls, Environment, Stage, PerspectiveCamera } from "@react-three/drei";
import { Suspense } from "react";
import { LoadingSpinner } from "./LoadingSpinner";
import { Model3D } from "./Model3D";

interface ModelViewerProps {
  modelData?: ArrayBuffer;
  modelColor: string;
  fileName?: string;
}

export const ModelViewer = ({ modelData, modelColor, fileName }: ModelViewerProps) => {
  return (
    <div className="w-full h-full bg-viewer-bg rounded-lg shadow-viewer relative overflow-hidden">
      {modelData ? (
        <Canvas className="w-full h-full">
          <PerspectiveCamera makeDefault position={[5, 5, 5]} />
          
          <Suspense fallback={<LoadingSpinner />}>
            <Stage
              environment="studio"
              intensity={0.5}
              shadows={false}
              adjustCamera={false}
            >
              <Model3D 
                modelData={modelData} 
                color={modelColor}
                fileName={fileName}
              />
            </Stage>
            
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
              Ready for 3D Models
            </h3>
            <p className="text-muted-foreground">
              Upload a file to start viewing your 3D model
            </p>
          </div>
        </div>
      )}
    </div>
  );
};