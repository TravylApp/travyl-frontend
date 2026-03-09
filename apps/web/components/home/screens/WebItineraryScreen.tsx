"use client";

import { motion } from "motion/react";
import { MapPin, Clock, Camera, Utensils, Coffee, Sun } from "lucide-react";
import { STEP2_ITINERARY_ITEMS } from "@travyl/shared";

const ICON_MAP: Record<string, React.ComponentType<{ size?: number; style?: React.CSSProperties }>> = {
  camera: Camera,
  mapPin: MapPin,
  utensils: Utensils,
  coffee: Coffee,
};

export function WebItineraryScreen() {
  return (
    <div className="flex-1 flex flex-col bg-gradient-to-br from-[#fdf8f0] via-white to-[#fef9f2] overflow-hidden">
      {/* Header */}
<<<<<<< HEAD
      <div className="bg-[#1e3a5f] px-4 pt-8 pb-3 shrink-0">
=======
      <div className="bg-gradient-to-r from-[#003594] to-[#1A5CC8] px-4 pt-8 pb-3 shrink-0">
>>>>>>> origin/develop
        <div className="flex items-center gap-1.5 mb-1">
          <MapPin size={11} className="text-white/80" />
          <span className="text-[10px] text-white/80">Rome, Italy</span>
        </div>
        <p className="text-[14px] font-bold text-white mb-0.5">5-Day Itinerary</p>
        <p className="text-[9px] text-white/60">Mar 15 – Mar 20, 2026</p>
      </div>

      {/* Day selector */}
      <div className="flex gap-1 px-3 py-2 bg-white border-b border-gray-100 shrink-0">
        {["Day 1", "Day 2", "Day 3", "Day 4", "Day 5"].map((day, i) => (
          <motion.div
            key={day}
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 + i * 0.08, duration: 0.25 }}
            className={`px-2 py-1 rounded-md text-[9px] font-medium ${
              i === 0
<<<<<<< HEAD
                ? "bg-[#1e3a5f] text-white"
=======
                ? "bg-[#003594] text-white"
>>>>>>> origin/develop
                : "bg-gray-100 text-gray-500"
            }`}
          >
            {day}
          </motion.div>
        ))}
      </div>

      {/* Day title */}
      <div className="px-3 py-2 flex items-center gap-1.5 shrink-0">
        <Sun size={12} className="text-amber-500" />
        <span className="text-[11px] font-semibold text-gray-800">Day 1 — Arrival & Ancient Rome</span>
      </div>

      {/* Timeline */}
      <div className="flex-1 px-3 pb-3 overflow-hidden">
        {STEP2_ITINERARY_ITEMS.map((item, i) => {
          const Icon = ICON_MAP[item.iconId];
          return (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, x: -15 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.6 + i * 0.12, duration: 0.35, ease: "easeOut" }}
              className="flex gap-2 mb-1.5 relative"
            >
              {/* Timeline dot + connector */}
              <div className="flex flex-col items-center w-4 shrink-0">
                <div
                  className="w-3 h-3 rounded-full border-2 flex items-center justify-center shrink-0"
                  style={{ borderColor: item.color, backgroundColor: `${item.color}15` }}
                >
                  <div className="w-1 h-1 rounded-full" style={{ backgroundColor: item.color }} />
                </div>
                {i < STEP2_ITINERARY_ITEMS.length - 1 && (
                  <div className="w-[1px] flex-1 bg-gray-200 mt-0.5" />
                )}
              </div>

              {/* Content */}
              <div className="flex-1 pb-2 min-w-0">
                <div className="flex items-center gap-1 mb-0.5">
                  <Clock size={8} className="text-gray-400" />
                  <span className="text-[8px] text-gray-400">{item.time}</span>
                  <span className="text-[7px] text-gray-300 ml-auto">{item.duration}</span>
                </div>
                <div className="bg-white rounded-lg border border-gray-100 shadow-sm p-2 flex items-center gap-2">
                  <div
                    className="w-6 h-6 rounded-md flex items-center justify-center shrink-0"
                    style={{ backgroundColor: `${item.color}12` }}
                  >
                    {Icon && <Icon size={11} style={{ color: item.color }} />}
                  </div>
                  <p className="text-[10px] font-medium text-gray-800 truncate">{item.title}</p>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
