"use client";

import { useRef, useEffect, useCallback, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { Sky } from "./Sky";
import { Terrain } from "./Terrain";
import { Clouds } from "./Clouds";
import { PaperPlane } from "./PaperPlane";
import * as THREE from "three";

interface TakeoffScene3DProps {
  completed: boolean;
  onExit: () => void;
}

export default function TakeoffScene3D({ completed, onExit }: TakeoffScene3DProps) {
  const planeGroupRef = useRef<THREE.Group>(null);
  const [enteringDone, setEnteringDone] = useState(false);
  const compHandledRef = useRef(false);

  // Handle completed prop transition
  useEffect(() => {
    if (completed && !compHandledRef.current && enteringDone) {
      compHandledRef.current = true;
      // Wait for victory loop + glide (2500ms: 1000ms loop + 1500ms glide)
      // + 500ms buffer, then signal parent to unmount
      const timer = setTimeout(() => {
        onExit();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [completed, enteringDone, onExit]);

  return (
    <Canvas
      dpr={[1, 1.5]}
      gl={{ antialias: true }}
      style={{ position: "absolute", inset: 0, zIndex: 5 }}
      camera={{ position: [0, 3, 10], fov: 60 }}
    >
      <ambientLight intensity={0.5} />
      <directionalLight position={[10, 15, 10]} intensity={1} />

      <Sky />
      <Terrain />
      <Clouds />
      <PaperPlane
        planeGroupRef={planeGroupRef}
        completed={completed}
        onEnteringDone={() => setEnteringDone(true)}
      />
    </Canvas>
  );
}
