"use client";

import { useRef, useEffect, useCallback, useState, useMemo } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

const GRAVITY = -2.0; // units/s²
const IMPULSE = 6.0; // units/s
const MAX_SPEED = 8.0;
const PITCH_MAX = 0.35; // radians (~20°)
const LERP_FACTOR = 3.0; // /s for camera follow

// Soft bounds
const MIN_Y = -1.5;
const MAX_Y = 8.0;

interface PaperPlaneProps {
  planeGroupRef: React.RefObject<THREE.Group | null>;
  completed: boolean;
  onEnteringDone: () => void;
}

// --- Procedural fallback mesh ---
// A simple folded-paper shape: 6 vertices forming 4 triangles
function createFallbackMesh(): THREE.Group {
  const group = new THREE.Group();
  const geometry = new THREE.BufferGeometry();

  const vertices = new Float32Array([
    0, 0, 1,      // nose (tip)
    -0.6, 0, -0.6, // left wing tip
    0, 0.1, 0,    // top center
    0.6, 0, -0.6, // right wing tip
    0, 0, -0.8,   // tail center
    0, -0.1, 0,   // bottom center
  ]);

  const indices = [
    0, 1, 2, 0, 3, 2,  // top wings
    0, 1, 4, 0, 3, 4,  // tail
    5, 1, 2, 5, 3, 2,  // bottom wings
  ];

  geometry.setAttribute("position", new THREE.BufferAttribute(vertices, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();

  const material = new THREE.MeshStandardMaterial({
    color: "white",
    roughness: 0.6,
    metalness: 0.1,
    side: THREE.DoubleSide,
  });

  group.add(new THREE.Mesh(geometry, material));
  return group;
}

// --- PaperPlane component ---
// Loads GLB via GLTFLoader in useEffect (avoids React Suspense + hooks rules issues),
// falls back to procedural mesh on failure.
export function PaperPlane({ planeGroupRef, completed, onEnteringDone }: PaperPlaneProps) {
  const [glbScene, setGlbScene] = useState<THREE.Object3D | null>(null);
  const [glbFailed, setGlbFailed] = useState(false);
  const fallbackScene = useRef<THREE.Group>(createFallbackMesh());
  const velocityRef = useRef(0);
  const stateRef = useRef<"entering" | "flying" | "completed" | "exiting">("entering");
  const enterTimeRef = useRef(0);
  const completedTimeRef = useRef(0);
  const { camera, gl } = useThree();
  const cameraTargetRef = useRef(new THREE.Vector3());

  // Load GLB model via GLTFLoader (non-Suspense approach)
  useEffect(() => {
    let canceled = false;
    import("three/examples/jsm/loaders/GLTFLoader.js").then(({ GLTFLoader }) => {
      const loader = new GLTFLoader();
      loader.load(
        "/models/paper-plane.glb",
        (gltf) => {
          if (!canceled) setGlbScene(gltf.scene);
        },
        undefined,
        () => {
          if (!canceled) setGlbFailed(true);
        }
      );
    });
    return () => { canceled = true; };
  }, []);

  // Click handler — only during flying state
  const handleClick = useCallback(() => {
    if (stateRef.current === "flying") {
      velocityRef.current = Math.min(velocityRef.current + IMPULSE, MAX_SPEED);
    }
  }, []);

  // Attach click handler to the R3F canvas
  useEffect(() => {
    const canvas = gl.domElement;
    canvas.addEventListener("click", handleClick);
    return () => canvas.removeEventListener("click", handleClick);
  }, [handleClick, gl]);

  // Transition to completed state when prop flips
  useEffect(() => {
    if (completed && stateRef.current === "flying") {
      stateRef.current = "completed";
      completedTimeRef.current = 0; // reset so animation counts from now
    }
  }, [completed]);

  // Entering animation start time
  useEffect(() => {
    enterTimeRef.current = performance.now();
  }, []);

  useFrame((_, delta) => {
    if (!planeGroupRef.current) return;
    const group = planeGroupRef.current;

    switch (stateRef.current) {
      case "entering": {
        const elapsed = (performance.now() - enterTimeRef.current) / 1000;
        const p = Math.min(elapsed / 1.0, 1);
        const ease = 1 - Math.pow(1 - p, 3);

        group.position.x = 0;
        group.position.y = -5 + ease * 5;
        group.position.z = -5 + ease * 3;
        group.rotation.x = -0.1 * (1 - ease);

        if (p >= 1) {
          // Handle race: completed may have flipped during entering animation
          if (completed) {
            stateRef.current = "completed";
            completedTimeRef.current = 0;
          } else {
            stateRef.current = "flying";
          }
          onEnteringDone();
        }
        break;
      }

      case "flying": {
        velocityRef.current += GRAVITY * delta;
        velocityRef.current = Math.max(velocityRef.current, -MAX_SPEED);

        group.position.y += velocityRef.current * delta;
        group.position.y = Math.max(MIN_Y, Math.min(MAX_Y, group.position.y));

        const pitchTarget = (velocityRef.current / MAX_SPEED) * PITCH_MAX;
        group.rotation.x += (pitchTarget - group.rotation.x) * delta * 5;

        // Gentle idle sway
        group.rotation.z = Math.sin(performance.now() * 0.002) * 0.05;
        group.rotation.y = Math.sin(performance.now() * 0.001) * 0.03;
        break;
      }

      case "completed": {
        // Set completed start time on first frame of this state
        if (completedTimeRef.current === 0) completedTimeRef.current = performance.now();
        const elapsed = (performance.now() - completedTimeRef.current) / 1000;

        if (elapsed < 1.0) {
          // 1s victory loop — 360° banked turn
          group.position.x = Math.sin(elapsed * Math.PI * 2) * 3;
          group.position.y = 2 + Math.sin(elapsed * Math.PI) * 1;
          group.rotation.z += delta * 6;
        } else {
          // 1.5s glide off-screen right (last 0.5s fades out)
          const glideP = (elapsed - 1.0) / 1.5;
          group.position.x = 3 + glideP * glideP * 20;
          group.position.y -= delta * 1.5;
          group.rotation.x = 0.2;
          group.rotation.z = -0.3;

          if (elapsed >= 2.0) {
            group.scale.setScalar(Math.max(0, 1 - (elapsed - 2.0) / 0.5));
          }
        }
        break;
      }
    }

    // Camera follow with smooth lerp
    cameraTargetRef.current.set(
      group.position.x,
      group.position.y + 3,
      group.position.z + 8
    );
    camera.position.lerp(cameraTargetRef.current, LERP_FACTOR * delta);
    camera.lookAt(group.position.x, group.position.y, group.position.z);
  });

  // Use GLB if loaded, otherwise fallback mesh — clone once to avoid per-render allocations
  const displayObject = useMemo(
    () => (glbScene || fallbackScene.current).clone(),
    [glbScene]
  );

  return (
    <primitive
      ref={planeGroupRef}
      object={displayObject}
      scale={glbFailed ? 0.8 : 0.5}
    />
  );
}
