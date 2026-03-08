'use client';

import { Plus, Plane, Clock, MapPin, Sparkles, Compass, Star, Triangle } from "lucide-react";
import { motion } from "motion/react";
import { TRAVEL_BOARDS, TRAVEL_DNA, JOURNEY_NUMBERS } from "@travyl/shared";
import type { TravelBoard } from "@travyl/shared";

function BoardIcon({ icon, color }: { icon: string; color: string }) {
  const size = 14;
  switch (icon) {
    case "sparkle": return <Sparkles size={size} style={{ color }} />;
    case "compass": return <Compass size={size} style={{ color }} />;
    case "star": return <Star size={size} style={{ color }} />;
    case "triangle": return <Triangle size={size} style={{ color }} />;
    default: return <Sparkles size={size} style={{ color }} />;
  }
}

function JourneyIcon({ icon, color }: { icon: string; color: string }) {
  const size = 18;
  switch (icon) {
    case "plane": return <Plane size={size} style={{ color }} />;
    case "clock": return <Clock size={size} style={{ color }} />;
    case "map-pin": return <MapPin size={size} style={{ color }} />;
    case "sparkles": return <Sparkles size={size} style={{ color }} />;
    default: return <Sparkles size={size} style={{ color }} />;
  }
}

function BoardCard({ board }: { board: TravelBoard }) {
  return (
    <div className="flex flex-col gap-2.5">
      {/* Image Collage */}
      <div className="relative bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="flex h-[176px]">
          {/* Main image */}
          <div className="flex-1">
            <img src={board.images[0]} alt="" className="w-full h-full object-cover" />
          </div>
          {/* Side images */}
          {board.images.length > 1 && (
            <div className="flex flex-col flex-1">
              <div className="flex-1 border-l border-b border-gray-200">
                <img src={board.images[1]} alt="" className="w-full h-full object-cover" />
              </div>
              {board.images.length > 2 ? (
                <div className="flex-1 border-l border-gray-200">
                  <img src={board.images[2]} alt="" className="w-full h-full object-cover" />
                </div>
              ) : (
                <div className="flex-1 border-l border-gray-200 bg-gray-100 flex items-center justify-center">
                  <div className="text-gray-400">
                    <svg width="44" height="44" viewBox="0 0 44 44" fill="none">
                      <rect x="6" y="10" width="32" height="24" rx="2" stroke="currentColor" strokeWidth="1.8" />
                      <path d="M6 30L16 20L32 36" stroke="currentColor" strokeWidth="1.8" />
                      <circle cx="28" cy="18" r="4" stroke="currentColor" strokeWidth="1.8" />
                    </svg>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
        {/* Badge */}
        {board.badge && (
          <span
            className="absolute top-4 left-3 px-2 py-0.5 rounded-full text-[10px] text-white tracking-wide"
            style={{ backgroundColor: board.badgeColor }}
          >
            {board.badge}
          </span>
        )}
      </div>
      {/* Info */}
      <div className="px-0.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BoardIcon icon={board.icon} color={board.iconColor} />
            <span className="text-[14px] text-[#314158] tracking-tight">{board.title}</span>
          </div>
          <span className="text-[11px] text-gray-400">{board.saves} saves</span>
        </div>
        <p className="text-[11px] text-gray-400 mt-0.5 ml-[22px]">{board.subtitle}</p>
      </div>
    </div>
  );
}

export default function TravelBoards() {
  return (
    <div>
      {/* Boards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {TRAVEL_BOARDS.map((board) => (
          <BoardCard key={board.id} board={board} />
        ))}
      </div>

      {/* Create Board Card */}
      <div className="mb-10">
        <div className="bg-gray-50 border-2 border-dashed border-gray-200 rounded-2xl h-[120px] flex flex-col items-center justify-center gap-2 hover:border-gray-300 hover:bg-gray-100/70 transition-colors cursor-pointer max-w-sm">
          <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
            <Plus size={16} className="text-gray-400" />
          </div>
          <span className="text-[13px] text-gray-400">Create travel board</span>
        </div>
      </div>

      {/* Bottom Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {/* Travel DNA */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <div className="flex items-center gap-2 mb-4">
            <Compass size={16} className="text-[#10b981]" />
            <h3 className="text-[14px] text-gray-800">Travel DNA</h3>
          </div>
          <div className="space-y-3">
            {TRAVEL_DNA.map((item) => (
              <div key={item.label} className="flex items-center gap-3">
                <div className="flex items-center gap-1.5 w-[110px] shrink-0">
                  <div className="w-2 h-2 rounded-sm" style={{ backgroundColor: item.color }} />
                  <span className="text-[12px] text-gray-600">{item.label}</span>
                </div>
                <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
                  <motion.div
                    className="h-full rounded-full"
                    style={{ backgroundColor: item.color }}
                    initial={{ width: 0 }}
                    whileInView={{ width: `${item.pct}%` }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.8, delay: 0.2 }}
                  />
                </div>
                <span className="text-[12px] text-gray-400 w-[36px] text-right">{item.pct}%</span>
              </div>
            ))}
          </div>
        </div>

        {/* Journey Numbers */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles size={16} className="text-[#8b5cf6]" />
            <h3 className="text-[14px] text-gray-800">Journey Numbers</h3>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {JOURNEY_NUMBERS.map((item) => (
              <div key={item.label} className="bg-gray-50 rounded-xl p-3.5 flex items-center gap-3">
                <JourneyIcon icon={item.icon} color={item.color} />
                <div>
                  <p className="text-[18px] text-gray-900 tracking-tight">{item.value}</p>
                  <p className="text-[11px] text-gray-400">{item.label}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
