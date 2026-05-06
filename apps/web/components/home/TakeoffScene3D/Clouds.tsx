"use client";

import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

interface CloudCluster {
  position: [number, number, number];
  speed: number;
  scale: number;
}

const CLUSTERS: CloudCluster[] = [
  { position: [-12, 4, -8], speed: 0.3, scale: 1.0 },
  { position: [5, 5.5, -15], speed: 0.5, scale: 1.2 },
  { position: [-5, 3.5, 5], speed: 0.2, scale: 0.8 },
  { position: [10, 6, -5], speed: 0.4, scale: 1.0 },
  { position: [-15, 4.5, 10], speed: 0.25, scale: 0.9 },
];

export function Clouds() {
  const groupRef = useRef<THREE.Group>(null);
  const offsetsRef = useRef(CLUSTERS.map(() => Math.random() * 100));

  const cloudMeshes = useMemo(() => {
    return CLUSTERS.map((cluster) => {
      const group = new THREE.Group();

      // Build cloud from overlapping spheres
      const positions: [number, number, number][] = [
        [0, 0, 0],
        [0.8, 0.2, 0.3],
        [-0.7, 0.1, -0.2],
        [0.3, -0.1, 0.6],
        [-0.4, 0.3, -0.5],
      ];

      for (const pos of positions) {
        const sphere = new THREE.Mesh(
          new THREE.SphereGeometry(0.6, 6, 6),
          new THREE.MeshStandardMaterial({
            color: "white",
            transparent: true,
            opacity: 0.5,
            roughness: 0.8,
          })
        );
        sphere.position.set(pos[0], pos[1], pos[2]);
        sphere.scale.set(1, 0.6, 0.8);
        group.add(sphere);
      }

      return group;
    });
  }, []);

  useFrame((_, delta) => {
    if (!groupRef.current) return;
    CLUSTERS.forEach((cluster, i) => {
      const child = groupRef.current!.children[i];
      offsetsRef.current[i] += delta * cluster.speed;
      child.position.x = cluster.position[0] + Math.sin(offsetsRef.current[i]) * 1.5;
      child.position.y = cluster.position[1];
      child.position.z = cluster.position[2] + offsetsRef.current[i] * 0.2;
    });
  });

  return (
    <group ref={groupRef}>
      {cloudMeshes.map((mesh, i) => (
        <primitive
          key={i}
          object={mesh}
          scale={CLUSTERS[i].scale}
          position={CLUSTERS[i].position}
        />
      ))}
    </group>
  );
}
