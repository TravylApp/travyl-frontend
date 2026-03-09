"use client";

import React from "react";
import { motion } from "motion/react";
import { EASE_OUT_EXPO } from "@travyl/shared";

export function PhoneFrame({
  children,
  delay = 0,
  accent: _accent,
}: {
  children: React.ReactNode;
  delay?: number;
  accent?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6, delay, ease: EASE_OUT_EXPO }}
    >
      <div
        className="animate-float"
        style={{
          animation: `float 4s ease-in-out infinite`,
          animationDelay: `${delay * 2}s`,
          willChange: "transform",
        }}
      >
        <div
          className="relative rounded-[2.2rem] p-[5px] shadow-2xl"
          style={{ width: 220, height: 440, backgroundColor: "#1F2937" }}
        >
          <div className="w-full h-full rounded-[1.8rem] bg-white overflow-hidden flex flex-col">
            {/* Notch */}
            <div className="flex justify-center pt-2">
              <div
                className="rounded-xl"
                style={{ width: 80, height: 20, backgroundColor: "#1F2937" }}
              />
            </div>
            {/* Status bar */}
            <div className="flex justify-between items-center px-5 pt-1 pb-1.5">
              <span className="text-[10px] font-semibold text-gray-900">9:41</span>
              <div className="flex gap-1">
                <div className="w-3 h-2 bg-gray-900 rounded-sm" />
                <div className="w-3.5 h-2 bg-gray-900 rounded-sm" />
              </div>
            </div>
            {/* Screen content */}
            <div className="flex-1 overflow-hidden">{children}</div>
            {/* Home indicator */}
            <div className="flex justify-center pb-1.5 pt-1">
              <div className="w-24 h-1 bg-gray-300 rounded-full" />
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
