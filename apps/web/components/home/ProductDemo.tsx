"use client";

import { useRef, useState } from "react";
import { motion, useScroll, useMotionValueEvent } from "motion/react";
import { Check, MapPin, Users, CalendarDays } from "lucide-react";

const DEMO_STATES = [
  {
    id: 0,
    label: "Describe your trip",
    description: "Tell Travyl where you want to go, when, and with whom — in plain English.",
  },
  {
    id: 1,
    label: "AI builds your plan",
    description: "Our AI extracts destinations, dates, and travelers to create a complete trip outline.",
  },
  {
    id: 2,
    label: "Daily itinerary ready",
    description: "A full day-by-day calendar appears with activities, restaurants, and sightseeing.",
  },
  {
    id: 3,
    label: "Collaborate in real-time",
    description: "Share with travel companions. Everyone can edit, comment, and plan together live.",
  },
];

const STEP_LABELS = ["Describe", "AI Plans", "Itinerary", "Collaborate"];

function MockSearchBar({ typed }: { typed: string }) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/10 border border-white/15">
      <MapPin size={14} className="text-white/40 shrink-0" />
      <div className="h-3 flex-1 rounded bg-white/20" style={{ width: `${typed.length}ch`, maxWidth: "70%" }} />
    </div>
  );
}

function MockTripCard({ visible }: { visible: boolean }) {
  return (
    <div
      className="rounded-xl bg-white/10 border border-white/15 overflow-hidden transition-all duration-700"
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0) scale(1)" : "translateY(12px) scale(0.96)",
      }}
    >
      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="h-4 w-32 rounded bg-white/20 mb-1.5" />
            <div className="h-3 w-24 rounded bg-white/10" />
          </div>
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-400/20">
            Planning
          </span>
        </div>
        <div className="flex items-center gap-3 text-xs text-white/50">
          <span className="flex items-center gap-1">
            <CalendarDays size={12} />
            Mar 15 – Mar 20
          </span>
          <span className="flex items-center gap-1">
            <Users size={12} />
            3 travelers
          </span>
        </div>
      </div>
    </div>
  );
}

function MockCalendar({ visible }: { visible: boolean }) {
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri"];
  const activities = [
    { time: "09:00", text: "Tsukiji Market" },
    { time: "12:00", text: "Senso-ji Temple" },
    { time: "18:00", text: "Shibuya Dinner" },
  ];
  return (
    <div
      className="rounded-xl bg-white/10 border border-white/15 overflow-hidden transition-all duration-700"
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(12px)",
      }}
    >
      <div className="grid grid-cols-5 border-b border-white/10">
        {days.map((d) => (
          <div key={d} className="text-center text-[10px] text-white/40 py-2 font-medium">
            {d}
          </div>
        ))}
      </div>
      <div className="p-3 space-y-2">
        {activities.map((a, i) => (
          <div key={i} className="flex items-center gap-2 text-xs">
            <div className="w-4 h-4 rounded-full bg-emerald-500/30 border border-emerald-400/30 flex items-center justify-center shrink-0">
              <Check size={8} className="text-emerald-300" />
            </div>
            <span className="text-white/50 w-10 shrink-0">{a.time}</span>
            <span className="text-white/80">{a.text}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function MockCollaboration({ visible }: { visible: boolean }) {
  const avatars = [
    { initial: "J", color: "bg-blue-500" },
    { initial: "S", color: "bg-emerald-500" },
    { initial: "M", color: "bg-amber-500" },
  ];
  return (
    <div
      className="flex items-center gap-3 transition-all duration-700"
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(12px)",
      }}
    >
      <div className="flex -space-x-2">
        {avatars.map((a, i) => (
          <div
            key={i}
            className={`w-7 h-7 rounded-full ${a.color} border-2 border-[#0f1d30] flex items-center justify-center text-white text-[10px] font-bold`}
          >
            {a.initial}
          </div>
        ))}
      </div>
      <div className="flex items-center gap-1.5">
        <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
        <span className="text-xs text-white/60">Sarah is viewing Day 2</span>
      </div>
    </div>
  );
}

export function ProductDemo() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeState, setActiveState] = useState(0);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start center", "end center"],
  });

  useMotionValueEvent(scrollYProgress, "change", (v) => {
    let state = 0;
    if (v > 0.75) state = 3;
    else if (v > 0.5) state = 2;
    else if (v > 0.25) state = 1;
    if (state !== activeState) {
      setActiveState(state);
    }
  });

  return (
    <section ref={containerRef} className="py-20 px-6 bg-[#0f1d30]">
      <div className="max-w-5xl mx-auto text-center mb-10">
        <h2 className="text-2xl md:text-3xl font-serif font-normal text-white mb-2 tracking-wide">
          See It <span className="italic">In Action</span>
        </h2>
        <p className="text-white/50 text-sm max-w-md mx-auto">
          Watch Travyl turn a trip idea into a complete itinerary in seconds.
        </p>
      </div>

      {/* Step indicators — compact row above the mockup */}
      <div className="max-w-2xl mx-auto mb-6">
        <div className="flex items-center justify-center gap-1">
          {STEP_LABELS.map((label, i) => (
            <div key={i} className="flex items-center gap-1">
              <div
                className={`px-2.5 py-1 rounded-full text-[10px] font-semibold transition-all duration-500 ${
                  i <= activeState
                    ? "bg-white/20 text-white"
                    : "text-white/30"
                }`}
              >
                {label}
              </div>
              {i < STEP_LABELS.length - 1 && (
                <div className="w-4 h-[1px] bg-white/10" />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Browser mockup frame */}
      <div className="max-w-2xl mx-auto">
        <div className="rounded-2xl overflow-hidden bg-[#1a2a40] shadow-2xl shadow-black/30 border border-white/10">
          {/* Browser chrome */}
          <div className="flex items-center gap-1.5 px-4 py-3 bg-[#0d1a2e] border-b border-white/5">
            <div className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
            <div className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
            <div className="mx-auto text-[10px] text-white/30 font-medium">travyl.app</div>
          </div>

          {/* Mockup content area */}
          <div className="p-6 min-h-[300px] relative">
            {/* State 1: Search */}
            <div className="space-y-4">
              <div
                className="transition-all duration-700"
                style={{
                  opacity: activeState >= 0 ? 1 : 0,
                  transform: activeState >= 0 ? "translateY(0)" : "translateY(8px)",
                }}
              >
                <p className="text-xs text-white/40 mb-2 font-medium">Search</p>
                <MockSearchBar typed="5 days in Tokyo with friends" />
              </div>

              <MockTripCard visible={activeState >= 1} />
              <MockCalendar visible={activeState >= 2} />
              <MockCollaboration visible={activeState >= 3} />
            </div>

            {/* Floating state label — top right */}
            <div className="absolute top-6 right-6">
              <div className="bg-white/10 rounded-lg px-3 py-1.5 border border-white/10">
                <p className="text-white font-semibold text-xs">{DEMO_STATES[activeState].label}</p>
                <p className="text-white/40 text-[10px] mt-0.5 max-w-[200px]">{DEMO_STATES[activeState].description}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Scroll progress bar */}
      <div className="max-w-2xl mx-auto mt-6 h-[2px] rounded-full bg-white/8 overflow-hidden">
        <motion.div
          className="h-full bg-white/30 origin-left rounded-full"
          style={{ scaleX: scrollYProgress }}
        />
      </div>
    </section>
  );
}
