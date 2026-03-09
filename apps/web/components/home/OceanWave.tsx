"use client";

import { motion } from "motion/react";

/**
<<<<<<< HEAD
 * Animated ocean-to-sand wave transition with improved Framer Motion animations.
 * Multiple layered waves create depth and natural movement.
 */
export function OceanWave() {
  return (
    <div className="relative w-full overflow-hidden" style={{ height: 180, marginBottom: -1 }}>
      <svg
        className="absolute top-0 left-0 w-full"
        viewBox="0 0 1440 180"
=======
 * Animated ocean-to-sand wave transition.
 * Place directly above the footer — the bottom color (#e8d5c0) should
 * match the footer background.
 */
export function OceanWave() {
  return (
    <div className="relative w-full" style={{ height: 160, marginBottom: -1 }}>
      <svg
        className="absolute top-0 left-0 w-full"
        viewBox="0 0 1200 160"
>>>>>>> origin/develop
        preserveAspectRatio="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ height: "100%" }}
      >
        <defs>
<<<<<<< HEAD
          {/* Ocean gradient */}
          <linearGradient id="oceanGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.6" />
            <stop offset="60%" stopColor="var(--primary)" stopOpacity="0.85" />
            <stop offset="100%" stopColor="var(--primary)" />
          </linearGradient>

          {/* Lighter wave gradient */}
          <linearGradient id="waveGrad2" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.4" />
            <stop offset="100%" stopColor="var(--primary)" stopOpacity="0.7" />
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
          initial={{ d: "M0,50 C240,30 480,60 720,40 C960,20 1200,55 1440,35 L1440,180 L0,180 Z" }}
          animate={{
            d: [
              "M0,50 C240,30 480,60 720,40 C960,20 1200,55 1440,35 L1440,180 L0,180 Z",
              "M0,35 C240,55 480,25 720,50 C960,65 1200,30 1440,50 L1440,180 L0,180 Z",
              "M0,45 C240,25 480,55 720,35 C960,60 1200,40 1440,45 L1440,180 L0,180 Z",
              "M0,50 C240,30 480,60 720,40 C960,20 1200,55 1440,35 L1440,180 L0,180 Z",
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
          initial={{ d: "M0,65 C180,50 360,75 540,55 C720,35 900,70 1080,50 C1260,30 1380,60 1440,55 L1440,180 L0,180 Z" }}
          animate={{
            d: [
              "M0,65 C180,50 360,75 540,55 C720,35 900,70 1080,50 C1260,30 1380,60 1440,55 L1440,180 L0,180 Z",
              "M0,55 C180,75 360,45 540,70 C720,85 900,50 1080,75 C1260,55 1380,80 1440,60 L1440,180 L0,180 Z",
              "M0,70 C180,45 360,70 540,50 C720,75 900,55 1080,65 C1260,45 1380,70 1440,50 L1440,180 L0,180 Z",
              "M0,65 C180,50 360,75 540,55 C720,35 900,70 1080,50 C1260,30 1380,60 1440,55 L1440,180 L0,180 Z",
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
          initial={{ d: "M0,75 C120,65 240,85 360,70 C480,55 600,80 720,65 C840,50 960,75 1080,60 C1200,45 1320,70 1440,60 L1440,180 L0,180 Z" }}
          animate={{
            d: [
              "M0,75 C120,65 240,85 360,70 C480,55 600,80 720,65 C840,50 960,75 1080,60 C1200,45 1320,70 1440,60 L1440,180 L0,180 Z",
              "M0,65 C120,80 240,60 360,80 C480,95 600,65 720,85 C840,70 960,90 1080,75 C1200,60 1320,85 1440,70 L1440,180 L0,180 Z",
              "M0,80 C120,60 240,80 360,65 C480,85 600,70 720,80 C840,65 960,85 1080,70 C1200,55 1320,75 1440,65 L1440,180 L0,180 Z",
              "M0,75 C120,65 240,85 360,70 C480,55 600,80 720,65 C840,50 960,75 1080,60 C1200,45 1320,70 1440,60 L1440,180 L0,180 Z",
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
          initial={{ d: "M0,85 C180,78 360,92 540,82 C720,72 900,88 1080,78 C1260,68 1380,85 1440,80 L1440,180 L0,180 Z" }}
          animate={{
            d: [
              "M0,85 C180,78 360,92 540,82 C720,72 900,88 1080,78 C1260,68 1380,85 1440,80 L1440,180 L0,180 Z",
              "M0,80 C180,92 360,75 540,90 C720,100 900,78 1080,92 C1260,82 1380,95 1440,85 L1440,180 L0,180 Z",
              "M0,88 C180,75 360,90 540,78 C720,92 900,82 1080,88 C1260,75 1380,88 1440,82 L1440,180 L0,180 Z",
              "M0,85 C180,78 360,92 540,82 C720,72 900,88 1080,78 C1260,68 1380,85 1440,80 L1440,180 L0,180 Z",
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
          fill="#d4c4a8"
          opacity={0.4}
          initial={{ d: "M0,115 C240,105 480,125 720,110 C960,95 1200,120 1440,108 L1440,180 L0,180 Z" }}
          animate={{
            d: [
              "M0,115 C240,105 480,125 720,110 C960,95 1200,120 1440,108 L1440,180 L0,180 Z",
              "M0,108 C240,122 480,100 720,118 C960,130 1200,105 1440,118 L1440,180 L0,180 Z",
              "M0,118 C240,102 480,120 720,108 C960,125 1200,112 1440,110 L1440,180 L0,180 Z",
              "M0,115 C240,105 480,125 720,110 C960,95 1200,120 1440,108 L1440,180 L0,180 Z",
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
          fill="#e8d5c0"
          initial={{ d: "M0,145 C360,138 720,152 1080,142 C1260,137 1380,148 1440,145 L1440,180 L0,180 Z" }}
          animate={{
            d: [
              "M0,145 C360,138 720,152 1080,142 C1260,137 1380,148 1440,145 L1440,180 L0,180 Z",
              "M0,142 C360,150 720,138 1080,148 C1260,145 1380,140 1440,148 L1440,180 L0,180 Z",
              "M0,148 C360,140 720,150 1080,145 C1260,140 1380,150 1440,142 L1440,180 L0,180 Z",
              "M0,145 C360,138 720,152 1080,142 C1260,137 1380,148 1440,145 L1440,180 L0,180 Z",
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
          <circle cx="200" cy="55" r="3" fill="white" />
          <circle cx="450" cy="45" r="2" fill="white" />
          <circle cx="700" cy="60" r="2.5" fill="white" />
          <circle cx="950" cy="50" r="2" fill="white" />
          <circle cx="1200" cy="55" r="3" fill="white" />
        </motion.g>
=======
          <linearGradient id="oceanGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.7" />
            <stop offset="100%" stopColor="var(--primary)" />
          </linearGradient>
        </defs>

        {/* Ocean body — gentle wavy top edge */}
        <motion.path
          fill="url(#oceanGrad)"
          animate={{
            d: [
              "M0,40 C200,28 400,50 600,35 C800,20 1000,45 1200,32 L1200,160 L0,160 Z",
              "M0,32 C200,48 400,25 600,42 C800,52 1000,28 1200,40 L1200,160 L0,160 Z",
              "M0,40 C200,28 400,50 600,35 C800,20 1000,45 1200,32 L1200,160 L0,160 Z",
            ],
          }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        />

        {/* Shimmer highlight */}
        <motion.path
          fill="none"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth="1"
          animate={{
            d: [
              "M100,60 Q300,52 500,62 Q700,72 900,58 Q1050,50 1150,60",
              "M100,65 Q300,72 500,58 Q700,50 900,65 Q1050,72 1150,58",
              "M100,60 Q300,52 500,62 Q700,72 900,58 Q1050,50 1150,60",
            ],
          }}
          transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
        />

        {/* Sand wash — semi-transparent layer */}
        <motion.path
          fill="#d4c4a8"
          opacity={0.35}
          animate={{
            d: [
              "M0,95 C200,82 400,105 600,90 C800,75 1000,100 1200,88 L1200,160 L0,160 Z",
              "M0,88 C200,100 400,80 600,95 C800,105 1000,82 1200,95 L1200,160 L0,160 Z",
              "M0,95 C200,82 400,105 600,90 C800,75 1000,100 1200,88 L1200,160 L0,160 Z",
            ],
          }}
          transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
        />

        {/* Final sand — blends into footer */}
        <motion.path
          fill="#e8d5c0"
          animate={{
            d: [
              "M0,130 C200,122 400,138 600,128 C800,118 1000,135 1200,125 L1200,160 L0,160 Z",
              "M0,125 C200,135 400,120 600,130 C800,138 1000,122 1200,132 L1200,160 L0,160 Z",
              "M0,130 C200,122 400,138 600,128 C800,118 1000,135 1200,125 L1200,160 L0,160 Z",
            ],
          }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
        />
>>>>>>> origin/develop
      </svg>
    </div>
  );
}
