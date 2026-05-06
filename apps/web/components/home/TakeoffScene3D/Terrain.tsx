"use client";

import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

const SEGMENTS = 50;
const WIDTH = 40;
const DEPTH = 40;
const SCROLL_SPEED = 2.0; // units/s

export function Terrain() {
  const meshRef = useRef<THREE.Mesh>(null);
  const offsetRef = useRef(0);

  const { geometry } = useMemo(() => {
    const geo = new THREE.PlaneGeometry(WIDTH, DEPTH, SEGMENTS, SEGMENTS);
    geo.rotateX(-Math.PI / 2);

    const pos = geo.attributes.position;
    const colors = new Float32Array(pos.count * 3);

    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);

      // Sine-based rolling hills
      const y =
        Math.sin(x * 0.3) * 0.8 +
        Math.sin(z * 0.2) * 1.2 +
        Math.sin((x + z) * 0.15) * 0.5;
      pos.setY(i, y);

      // Vertex colors: darker in valleys, lighter on hills
      const greenBase = 0.3 + (y + 2) / 6; // 0.3–0.7 range
      colors[i * 3] = 0.2 + greenBase * 0.2; // R
      colors[i * 3 + 1] = 0.3 + greenBase * 0.4; // G
      colors[i * 3 + 2] = 0.1 + greenBase * 0.1; // B
    }

    geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    geo.computeVertexNormals();

    return { geometry: geo };
  }, []);

  useFrame((_, delta) => {
    if (!meshRef.current) return;
    offsetRef.current += delta * SCROLL_SPEED;
    // Wrap position to create infinite scroll
    const zOffset = offsetRef.current % DEPTH;
    meshRef.current.position.z = zOffset;
  });

  return (
    <mesh ref={meshRef} geometry={geometry} position={[0, -3, 0]}>
      <meshStandardMaterial vertexColors />
    </mesh>
  );
}
