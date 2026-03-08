"use client";

import { motion } from "motion/react";
import { Search, MapPin, Calendar, Users, Sparkles } from "lucide-react";
import { PaperPlane } from "./PaperPlane";
import { STEP1_QUICK_CHIPS, STEP1_RECENT_SEARCHES } from "@travyl/shared";

const CHIP_ICONS: Record<string, React.ComponentType<{ size?: number }>> = {
  mapPin: MapPin,
  calendar: Calendar,
  users: Users,
};

export function WebSearchScreen() {
  return (
    <div className="flex-1 flex flex-col p-4 bg-gradient-to-br from-[#eef4fb] via-white to-[#f0f7ff] overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#003594] to-[#1A5CC8] flex items-center justify-center">
          <PaperPlane size={14} className="text-white -rotate-[8deg]" />
        </div>
        <span className="text-[11px] font-bold text-[#003594]">TRAVYL</span>
      </div>

      {/* Greeting */}
      <div className="mb-4">
        <p className="text-[13px] font-bold text-gray-900 mb-0.5">Where to next?</p>
        <p className="text-[10px] text-gray-500">Describe your dream trip</p>
      </div>

      {/* Search bar */}
      <div className="bg-white rounded-xl shadow-md border border-gray-100 p-2.5 mb-4">
        <div className="flex items-center gap-2 mb-2">
          <Search size={12} className="text-gray-400 shrink-0" />
          <div className="flex-1 overflow-hidden">
            <motion.p
              initial={{ width: 0 }}
              animate={{ width: "100%" }}
              transition={{ duration: 2, delay: 0.5, ease: "easeOut" }}
              className="text-[11px] text-gray-800 whitespace-nowrap overflow-hidden"
            >
              5 days in Rome for 2 people...
            </motion.p>
          </div>
        </div>
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 2.5, duration: 0.3 }}
        >
          <button className="w-full bg-[#D97706] text-white py-1.5 rounded-lg text-[10px] font-semibold flex items-center justify-center gap-1">
            <Sparkles size={10} />
            Plan My Trip
          </button>
        </motion.div>
      </div>

      {/* Quick chips */}
      <div className="flex flex-wrap gap-1.5 mb-4">
        {STEP1_QUICK_CHIPS.map((chip, i) => {
          const Icon = CHIP_ICONS[chip.iconId];
          return (
            <motion.div
              key={chip.label}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.8 + i * 0.15, duration: 0.3 }}
              className="flex items-center gap-1 bg-[#003594]/[0.08] text-[#003594] px-2 py-1 rounded-full"
            >
              {Icon && <Icon size={9} />}
              <span className="text-[9px] font-medium">{chip.label}</span>
            </motion.div>
          );
        })}
      </div>

      {/* Recent searches */}
      <div className="flex-1">
        <p className="text-[9px] text-gray-400 font-medium mb-2 uppercase tracking-wider">Recent</p>
        {STEP1_RECENT_SEARCHES.map((item, i) => (
          <motion.div
            key={item.dest}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 1.2 + i * 0.2, duration: 0.3 }}
            className="flex items-center gap-2 py-1.5 border-b border-gray-100 last:border-0"
          >
            <div className="w-5 h-5 rounded-md bg-gray-100 flex items-center justify-center">
              <MapPin size={10} className="text-gray-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-medium text-gray-800">{item.dest}</p>
              <p className="text-[8px] text-gray-400">{item.days} · {item.travelers}</p>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
