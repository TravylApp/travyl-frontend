"use client";

import { motion } from "motion/react";

export function EmptyTripsIllustration() {
  return (
    <div className="relative w-64 h-64 mx-auto">
      <svg
        viewBox="0 0 200 200"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full"
      >
        {/* Background circle */}
        <motion.circle
          cx="100"
          cy="100"
          r="80"
          fill="#f0f9ff"
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        />

        {/* Dotted path / flight route */}
        <motion.path
          d="M 40 120 Q 70 80 100 100 T 160 80"
          stroke="#1e3a5f"
          strokeWidth="2"
          strokeDasharray="6 4"
          fill="none"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 0.3 }}
          transition={{ duration: 1.5, delay: 0.3, ease: "easeInOut" }}
        />

        {/* Location pin 1 */}
        <motion.g
          initial={{ scale: 0, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.5, type: "spring", stiffness: 200 }}
        >
          <path
            d="M40 110 C40 100 50 95 50 95 C50 95 60 100 60 110 C60 120 50 130 50 130 C50 130 40 120 40 110Z"
            fill="#1e3a5f"
          />
          <circle cx="50" cy="107" r="4" fill="white" />
        </motion.g>

        {/* Location pin 2 */}
        <motion.g
          initial={{ scale: 0, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.8, type: "spring", stiffness: 200 }}
        >
          <path
            d="M150 70 C150 60 160 55 160 55 C160 55 170 60 170 70 C170 80 160 90 160 90 C160 90 150 80 150 70Z"
            fill="#F59E0B"
          />
          <circle cx="160" cy="67" r="4" fill="white" />
        </motion.g>

        {/* Airplane */}
        <motion.g
          initial={{ x: -20, y: 20, rotate: -20, opacity: 0 }}
          animate={{
            x: [0, 80, 80],
            y: [0, -20, -20],
            rotate: [0, 0, 0],
            opacity: 1
          }}
          transition={{
            duration: 2,
            delay: 0.6,
            ease: [0.16, 1, 0.3, 1],
            times: [0, 0.7, 1]
          }}
          style={{ transformOrigin: "70px 95px" }}
        >
          <motion.g
            animate={{
              y: [0, -3, 0, 3, 0],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 2.6
            }}
          >
            {/* Plane body */}
            <path
              d="M65 95 L75 95 L85 90 L75 92 L65 92 Z"
              fill="#1e3a5f"
            />
            {/* Plane wings */}
            <path
              d="M70 93 L70 97 L78 95 Z"
              fill="#2d4a6f"
            />
            {/* Plane tail */}
            <path
              d="M65 93.5 L62 95 L65 96.5 Z"
              fill="#2d4a6f"
            />
          </motion.g>
        </motion.g>

        {/* Cloud 1 */}
        <motion.g
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 0.6, x: 0 }}
          transition={{ duration: 0.8, delay: 1 }}
        >
          <ellipse cx="80" cy="60" rx="15" ry="8" fill="#e0e7ff" />
          <ellipse cx="90" cy="58" rx="10" ry="6" fill="#e0e7ff" />
          <ellipse cx="70" cy="58" rx="8" ry="5" fill="#e0e7ff" />
        </motion.g>

        {/* Cloud 2 */}
        <motion.g
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 0.5, x: 0 }}
          transition={{ duration: 0.8, delay: 1.2 }}
        >
          <ellipse cx="130" cy="130" rx="12" ry="6" fill="#e0e7ff" />
          <ellipse cx="140" cy="128" rx="8" ry="5" fill="#e0e7ff" />
        </motion.g>

        {/* Sparkles */}
        {[
          { cx: 45, cy: 85, delay: 1.5 },
          { cx: 175, cy: 65, delay: 1.7 },
          { cx: 120, cy: 145, delay: 1.9 },
          { cx: 85, cy: 140, delay: 2.1 },
        ].map((spark, i) => (
          <motion.g key={i}>
            <motion.circle
              cx={spark.cx}
              cy={spark.cy}
              r="2"
              fill="#F59E0B"
              initial={{ scale: 0, opacity: 0 }}
              animate={{
                scale: [0, 1, 0],
                opacity: [0, 1, 0]
              }}
              transition={{
                duration: 1.5,
                delay: spark.delay,
                repeat: Infinity,
                repeatDelay: 2
              }}
            />
          </motion.g>
        ))}

        {/* Suitcase */}
        <motion.g
          initial={{ scale: 0, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 1.3, type: "spring", stiffness: 200 }}
        >
          <rect x="95" y="140" width="30" height="22" rx="3" fill="#1e3a5f" />
          <rect x="102" y="136" width="16" height="6" rx="2" fill="#2d4a6f" />
          <line x1="100" y1="145" x2="100" y2="158" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" />
          <line x1="110" y1="145" x2="110" y2="158" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" />
          <line x1="120" y1="145" x2="120" y2="158" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" />
        </motion.g>

        {/* Passport */}
        <motion.g
          initial={{ scale: 0, rotate: -20, x: 10 }}
          animate={{ scale: 1, rotate: 0, x: 0 }}
          transition={{ duration: 0.5, delay: 1.5, type: "spring", stiffness: 200 }}
        >
          <rect x="135" y="135" width="20" height="28" rx="2" fill="#1e3a5f" transform="rotate(-10 145 149)" />
          <circle cx="145" cy="145" r="5" fill="none" stroke="#F59E0B" strokeWidth="1.5" transform="rotate(-10 145 149)" />
        </motion.g>

        {/* Camera */}
        <motion.g
          initial={{ scale: 0, rotate: 15, x: -10 }}
          animate={{ scale: 1, rotate: 0, x: 0 }}
          transition={{ duration: 0.5, delay: 1.7, type: "spring", stiffness: 200 }}
        >
          <rect x="45" y="145" width="24" height="18" rx="2" fill="#374151" />
          <circle cx="57" cy="154" r="5" fill="#1e3a5f" />
          <circle cx="57" cy="154" r="3" fill="#6b7280" />
          <rect x="50" y="142" width="8" height="4" rx="1" fill="#374151" />
        </motion.g>
      </svg>
    </div>
  );
}
