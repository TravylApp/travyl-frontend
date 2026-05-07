"use client";

import { motion } from "motion/react";
import { EASE_OUT_EXPO } from "@travyl/shared";

const STATS = [
  { value: "50K+", label: "Trips planned" },
  { value: "120+", label: "Countries" },
  { value: "4.8", label: "App Store rating" },
  { value: "2M+", label: "Destinations explored" },
];

export function PressStats({ statsOnly }: { statsOnly?: boolean }) {
  return (
    <section className="pt-8 sm:pt-10 pb-16 sm:pb-20 px-6 bg-sand-base">
      <div className="max-w-5xl mx-auto">
        {!statsOnly && (
          <div className="text-center mb-10">
            <span className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-[0.18em] text-magazine-accent">
              By the Numbers
            </span>
          </div>
        )}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {STATS.map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.5, delay: i * 0.1, ease: EASE_OUT_EXPO }}
              className="text-center"
            >
              <p className="text-4xl sm:text-6xl font-bold text-gray-900 dark:text-white">
                {s.value}
              </p>
              <p className="text-[11px] sm:text-xs text-gray-500 dark:text-gray-400 mt-1">
                {s.label}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
