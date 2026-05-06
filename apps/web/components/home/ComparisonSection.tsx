"use client";

import { motion } from "motion/react";
import { X, Check, FileText, MessageCircle, Search, Calculator, CalendarDays, Users, Share2, Sparkles, BookOpen, LayoutDashboard } from "lucide-react";
import { EASE_OUT_EXPO, useAuthStore } from "@travyl/shared";
import { useRouter } from "next/navigation";

const POINTS = [
  { bad: { text: "Scattered docs & spreadsheets", icon: FileText }, good: { text: "One unified calendar view", icon: CalendarDays } },
  { bad: { text: "Endless group chat threads", icon: MessageCircle }, good: { text: "Real-time collaboration", icon: Users } },
  { bad: { text: "Hours of manual research", icon: Search }, good: { text: "AI-powered suggestions", icon: Search } },
  { bad: { text: "Mental math for budget tracking", icon: Calculator }, good: { text: "Built-in cost tracking", icon: Calculator } },
  { bad: { text: "Static PDFs & screenshots", icon: FileText }, good: { text: "Live, shareable itineraries", icon: Share2 } },
  { bad: { text: "Asking friends for recommendations", icon: MessageCircle }, good: { text: "AI + local expertise", icon: Sparkles } },
  { bad: { text: "Forgotten booking details", icon: BookOpen }, good: { text: "Everything in one dashboard", icon: LayoutDashboard } },
];

export function ComparisonSection() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);

  return (
    <section className="py-20 sm:py-28 px-6 bg-white">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-14">
          <span className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-[0.18em] text-[#b8953e]">
            Why Switch?
          </span>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-serif font-normal mt-2 leading-tight text-[#2a1f17] tracking-wide">
            Planning on your own vs. <span className="italic">With Travyl</span>
          </h2>
          <p className="text-sm text-[#5c4a3a] mt-2 max-w-lg mx-auto leading-relaxed">
            Stop juggling tabs and tools. Travyl brings everything into one place.
          </p>
        </div>

        <div className="relative grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
          {/* Old way column — warm editorial tones */}
          <div className="rounded-2xl border border-[#f2e6d8] bg-[#fafaf8] p-6 sm:p-8">
            <div className="flex items-center gap-2.5 mb-7">
              <div className="w-8 h-8 rounded-full bg-[#f2e6d8] flex items-center justify-center">
                <X size={15} className="text-[#9a7b5a]" />
              </div>
              <span className="text-xs font-bold text-[#7a6b5a] uppercase tracking-widest">Doing it alone</span>
            </div>
            <div className="space-y-5">
              {POINTS.map((p, i) => {
                const BadIcon = p.bad.icon;
                return (
                  <motion.div
                    key={p.bad.text}
                    initial={{ opacity: 0, x: -12 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.4, delay: i * 0.08, ease: EASE_OUT_EXPO }}
                    className="flex items-center gap-3.5"
                  >
                    <div className="w-9 h-9 rounded-lg bg-[#f2e6d8]/60 flex items-center justify-center shrink-0">
                      <BadIcon size={15} className="text-[#9a7b5a]" />
                    </div>
                    <span className="text-sm text-[#6a5a4a]">{p.bad.text}</span>
                  </motion.div>
                );
              })}
            </div>
          </div>

          {/* VS badge */}
          <div className="hidden md:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10 w-11 h-11 rounded-full bg-white border-2 border-[#1e3a5f] items-center justify-center shadow-md">
            <span className="text-[11px] font-bold text-[#1e3a5f] tracking-widest">VS</span>
          </div>

          {/* Travyl way column — navy brand */}
          <div className="rounded-2xl border-2 border-[#1e3a5f]/15 bg-white p-6 sm:p-8 shadow-sm">
            <div className="flex items-center gap-2.5 mb-7">
              <div className="w-8 h-8 rounded-full bg-[#1e3a5f] flex items-center justify-center">
                <Check size={15} className="text-white" />
              </div>
              <span className="text-xs font-bold text-[#1e3a5f] uppercase tracking-widest">With Travyl</span>
            </div>
            <div className="space-y-5">
              {POINTS.map((p, i) => {
                const GoodIcon = p.good.icon;
                return (
                  <motion.div
                    key={p.good.text}
                    initial={{ opacity: 0, x: 12 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.4, delay: i * 0.08, ease: EASE_OUT_EXPO }}
                    className="flex items-center gap-3.5"
                  >
                    <div className="w-9 h-9 rounded-lg bg-[#003594]/10 flex items-center justify-center shrink-0">
                      <GoodIcon size={15} className="text-[#1e3a5f]" />
                    </div>
                    <span className="text-sm text-[#1e3a5f] font-medium">{p.good.text}</span>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </div>

        {/* CTA below comparison */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.3, ease: EASE_OUT_EXPO }}
          className="text-center mt-12"
        >
          <button
            onClick={() => router.push(user ? "/trips" : "/signup")}
            className="inline-flex items-center gap-2 px-7 py-3.5 bg-[#1e3a5f] text-white rounded-full font-semibold text-sm hover:bg-[#162d4a] transition-colors shadow-lg shadow-[#1e3a5f]/20"
          >
            Try the better way →
          </button>
        </motion.div>
      </div>
    </section>
  );
}
