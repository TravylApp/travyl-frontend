"use client";

import { motion } from "motion/react";

/**
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
        preserveAspectRatio="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ height: "100%" }}
      >
        <defs>
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
      </svg>
    </div>
  );
}
