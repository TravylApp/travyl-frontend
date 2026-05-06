"use client";

import { Sky as DreiSky } from "@react-three/drei";

export function Sky() {
  return (
    <>
      {/* Color gradient from sky blue to lighter horizon */}
      <DreiSky
        distance={450000}
        sunPosition={[100, 20, 100]}
        inclination={0.5}
        azimuth={0.25}
        turbidity={8}
        rayleigh={2}
      />
      {/* Fog for distance blending */}
      <fogExp2 attach="fog" args={[0xb0e0e6, 0.002]} />
    </>
  );
}
