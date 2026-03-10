"use client";

import { useRef, useEffect, useState } from "react";
import { motion, useSpring, useTransform, useInView } from "motion/react";

const stats = [
  {
    value: 500000,
    suffix: "K+",
    label: "destinations",
    description: "Discover unexpected gems, even in your own backyard.",
  },
  {
    value: 95000000,
    suffix: "M+",
    label: "fellow travelers",
    description: "Share your adventures and learn from our global community.",
  },
  {
    value: 2000000000,
    suffix: "B+",
    label: "trips planned",
    description: "Navigate your way and keep a record of all your travels.",
  },
];

function formatNumber(num: number): { display: number; suffix: string } {
  if (num >= 1_000_000_000) {
    return { display: num / 1_000_000_000, suffix: "B+" };
  }
  if (num >= 1_000_000) {
    return { display: num / 1_000_000, suffix: "M+" };
  }
  if (num >= 1_000) {
    return { display: num / 1_000, suffix: "K+" };
  }
  return { display: num, suffix: "" };
}

function AnimatedNumber({ value, suffix, isInView }: { value: number; suffix: string; isInView: boolean }) {
  const { display, suffix: autoSuffix } = formatNumber(value);
  const finalSuffix = suffix || autoSuffix;

  const spring = useSpring(0, {
    mass: 0.8,
    stiffness: 50,
    damping: 15,
  });

  const displayValue = useTransform(spring, (current) => {
    const formatted = current.toFixed(current >= 10 ? 0 : 1);
    return formatted;
  });

  useEffect(() => {
    if (isInView) {
      spring.set(display);
    }
  }, [isInView, display, spring]);

  return (
    <span className="tabular-nums">
      <motion.span>{displayValue}</motion.span>
      {finalSuffix}
    </span>
  );
}

export function StatsSection() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, amount: 0.5 });

  return (
    <section ref={ref} className="py-20 px-6 bg-gradient-to-b from-white to-gray-50">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
          {stats.map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 30 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{
                duration: 0.6,
                delay: index * 0.15,
                ease: [0.16, 1, 0.3, 1]
              }}
              className="text-center"
            >
              <motion.div
                initial={{ scale: 0.5 }}
                animate={isInView ? { scale: 1 } : {}}
                transition={{
                  type: "spring",
                  stiffness: 200,
                  damping: 15,
                  delay: index * 0.15 + 0.1
                }}
                className="text-5xl md:text-6xl font-black text-[#1e3a5f] mb-2"
              >
                <AnimatedNumber value={stat.value} suffix={stat.suffix} isInView={isInView} />
              </motion.div>
              <div className="text-base font-semibold text-[#F59E0B] mb-3 uppercase tracking-wide">
                {stat.label}
              </div>
              <p className="text-sm text-gray-500 max-w-xs mx-auto leading-relaxed">
                {stat.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
