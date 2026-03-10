"use client";

import { motion } from "motion/react";

/**
 * Animated ocean-to-sand wave transition with improved Framer Motion animations.
 * Multiple layered waves create depth and natural movement.
 */
export function OceanWave() {
  return (
    <div className="relative w-full overflow-hidden" style={{ height: 160, marginBottom: -1 }}>
      <svg
        className="absolute top-0 left-0 w-full"
        viewBox="0 0 1440 160"
        preserveAspectRatio="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ height: "100%" }}
      >
        <defs>
          {/* Ocean gradient - using brand primary color */}
          <linearGradient id="oceanGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#1e3a5f" stopOpacity="0.6" />
            <stop offset="60%" stopColor="#1e3a5f" stopOpacity="0.85" />
            <stop offset="100%" stopColor="#1e3a5f" />
          </linearGradient>

          {/* Lighter wave gradient */}
          <linearGradient id="waveGrad2" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#1e3a5f" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#1e3a5f" stopOpacity="0.7" />
          </linearGradient>

          {/* Foam gradient */}
          <linearGradient id="foamGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="white" stopOpacity="0.3" />
            <stop offset="100%" stopColor="white" stopOpacity="0.05" />
          </linearGradient>
        </defs>

        {/* Deep ocean background - slowest, largest wave */}
        <motion.path
          fill="url(#oceanGrad)"
          initial={{ d: "M0,40 C240,20 480,50 720,30 C960,10 1200,45 1440,25 L1440,160 L0,160 Z" }}
          animate={{
            d: [
              "M0,40 C240,20 480,50 720,30 C960,10 1200,45 1440,25 L1440,160 L0,160 Z",
              "M0,25 C240,45 480,15 720,40 C960,55 1200,20 1440,40 L1440,160 L0,160 Z",
              "M0,35 C240,15 480,45 720,25 C960,50 1200,30 1440,35 L1440,160 L0,160 Z",
              "M0,40 C240,20 480,50 720,30 C960,10 1200,45 1440,25 L1440,160 L0,160 Z",
            ],
          }}
          transition={{
            duration: 12,
            repeat: Infinity,
            ease: [0.45, 0.05, 0.55, 0.95],
          }}
        />

        {/* Mid-layer wave - medium speed */}
        <motion.path
          fill="url(#waveGrad2)"
          initial={{ d: "M0,55 C180,40 360,65 540,45 C720,25 900,60 1080,40 C1260,20 1380,50 1440,45 L1440,160 L0,160 Z" }}
          animate={{
            d: [
              "M0,55 C180,40 360,65 540,45 C720,25 900,60 1080,40 C1260,20 1380,50 1440,45 L1440,160 L0,160 Z",
              "M0,45 C180,65 360,35 540,60 C720,75 900,40 1080,65 C1260,45 1380,70 1440,50 L1440,160 L0,160 Z",
              "M0,60 C180,35 360,60 540,40 C720,65 900,45 1080,55 C1260,35 1380,60 1440,40 L1440,160 L0,160 Z",
              "M0,55 C180,40 360,65 540,45 C720,25 900,60 1080,40 C1260,20 1380,50 1440,45 L1440,160 L0,160 Z",
            ],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: [0.45, 0.05, 0.55, 0.95],
          }}
        />

        {/* Top wave layer - fastest, creates ripple effect */}
        <motion.path
          fill="rgba(255,255,255,0.12)"
          initial={{ d: "M0,65 C120,55 240,75 360,60 C480,45 600,70 720,55 C840,40 960,65 1080,50 C1200,35 1320,60 1440,50 L1440,160 L0,160 Z" }}
          animate={{
            d: [
              "M0,65 C120,55 240,75 360,60 C480,45 600,70 720,55 C840,40 960,65 1080,50 C1200,35 1320,60 1440,50 L1440,160 L0,160 Z",
              "M0,55 C120,70 240,50 360,70 C480,85 600,55 720,75 C840,60 960,80 1080,65 C1200,50 1320,75 1440,60 L1440,160 L0,160 Z",
              "M0,70 C120,50 240,70 360,55 C480,75 600,60 720,70 C840,55 960,75 1080,60 C1200,45 1320,65 1440,55 L1440,160 L0,160 Z",
              "M0,65 C120,55 240,75 360,60 C480,45 600,70 720,55 C840,40 960,65 1080,50 C1200,35 1320,60 1440,50 L1440,160 L0,160 Z",
            ],
          }}
          transition={{
            duration: 6,
            repeat: Infinity,
            ease: [0.45, 0.05, 0.55, 0.95],
          }}
        />

        {/* Foam line - white crest */}
        <motion.path
          fill="url(#foamGrad)"
          initial={{ d: "M0,75 C180,68 360,82 540,72 C720,62 900,78 1080,68 C1260,58 1380,75 1440,70 L1440,160 L0,160 Z" }}
          animate={{
            d: [
              "M0,75 C180,68 360,82 540,72 C720,62 900,78 1080,68 C1260,58 1380,75 1440,70 L1440,160 L0,160 Z",
              "M0,70 C180,82 360,65 540,80 C720,90 900,68 1080,82 C1260,72 1380,85 1440,75 L1440,160 L0,160 Z",
              "M0,78 C180,65 360,80 540,68 C720,82 900,72 1080,78 C1260,65 1380,78 1440,72 L1440,160 L0,160 Z",
              "M0,75 C180,68 360,82 540,72 C720,62 900,78 1080,68 C1260,58 1380,75 1440,70 L1440,160 L0,160 Z",
            ],
          }}
          transition={{
            duration: 7,
            repeat: Infinity,
            ease: [0.45, 0.05, 0.55, 0.95],
          }}
        />

        {/* Sand wash layer 1 */}
        <motion.path
          fill="#111827"
          opacity={0.9}
          initial={{ d: "M0,105 C240,95 480,115 720,100 C960,85 1200,110 1440,98 L1440,160 L0,160 Z" }}
          animate={{
            d: [
              "M0,105 C240,95 480,115 720,100 C960,85 1200,110 1440,98 L1440,160 L0,160 Z",
              "M0,98 C240,112 480,90 720,108 C960,120 1200,95 1440,108 L1440,160 L0,160 Z",
              "M0,108 C240,92 480,110 720,98 C960,115 1200,102 1440,100 L1440,160 L0,160 Z",
              "M0,105 C240,95 480,115 720,100 C960,85 1200,110 1440,98 L1440,160 L0,160 Z",
            ],
          }}
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: [0.45, 0.05, 0.55, 0.95],
          }}
        />

        {/* Final sand - blends into footer */}
        <motion.path
          fill="#111827"
          initial={{ d: "M0,130 C360,123 720,137 1080,127 C1260,122 1380,133 1440,130 L1440,160 L0,160 Z" }}
          animate={{
            d: [
              "M0,130 C360,123 720,137 1080,127 C1260,122 1380,133 1440,130 L1440,160 L0,160 Z",
              "M0,127 C360,135 720,123 1080,133 C1260,130 1380,125 1440,133 L1440,160 L0,160 Z",
              "M0,133 C360,125 720,135 1080,130 C1260,125 1380,135 1440,127 L1440,160 L0,160 Z",
              "M0,130 C360,123 720,137 1080,127 C1260,122 1380,133 1440,130 L1440,160 L0,160 Z",
            ],
          }}
          transition={{
            duration: 11,
            repeat: Infinity,
            ease: [0.45, 0.05, 0.55, 0.95],
          }}
        />

        {/* Shimmer highlights */}
        <motion.g
          opacity={0.15}
          animate={{
            opacity: [0.15, 0.25, 0.15],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        >
          <circle cx="200" cy="45" r="3" fill="white" />
          <circle cx="450" cy="35" r="2" fill="white" />
          <circle cx="700" cy="50" r="2.5" fill="white" />
          <circle cx="950" cy="40" r="2" fill="white" />
          <circle cx="1200" cy="45" r="3" fill="white" />
        </motion.g>
      </svg>
    </div>
  );
}
