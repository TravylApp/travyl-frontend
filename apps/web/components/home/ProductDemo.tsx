"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { motion, useScroll, useMotionValueEvent, useInView } from "motion/react";
import { Check, Users, CalendarDays, Globe, Sparkles, MapPin } from "lucide-react";

const STATE_COUNT = 3;

const STEPS = [
  {
    label: "Describe",
    title: "Describe your ideal trip",
    description:
      "Tell Travyl where you want to go, when, and with whom — in plain English. It understands natural language, so just type it like you'd say it.",
  },
  {
    label: "We Plan",
    title: "We plan your itinerary",
    description:
      "It extracts destinations, dates, and travelers from your words to create a complete trip outline. No forms, no fuss — just an instant trip architecture.",
  },
  {
    label: "Itinerary",
    title: "See your daily plan",
    description:
      "A full day-by-day itinerary with curated activities, restaurants, and sightseeing. Browse each day's plan, see what's scheduled when, and get a feel for your trip — all at a glance.",
  },
];

const LABEL_KEYS = ["01", "02", "03"];

// ─── Mockup sub-components ──────────────────────────────────

const PLAN_PHASE_COUNT = 3;

function MockSearchBar({ inView, onComplete }: { inView: boolean; onComplete?: () => void }) {
  const [displayedText, setDisplayedText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const fullText = "5 days in Tokyo with friends";
  const typingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isTypingRef = useRef(false);
  const hasStartedRef = useRef(false);
  const completedRef = useRef(false);

  const startTyping = useCallback(() => {
    if (typingRef.current) return;
    setIsTyping(true);
    isTypingRef.current = true;
    setDisplayedText("");
    let i = 0;
    typingRef.current = setInterval(() => {
      i++;
      setDisplayedText(fullText.slice(0, i));
      if (i >= fullText.length) {
        clearInterval(typingRef.current!);
        typingRef.current = null;
        setIsTyping(false);
        isTypingRef.current = false;
        if (!completedRef.current) {
          completedRef.current = true;
          onComplete?.();
        }
      }
    }, 45);
  }, [onComplete]);

  useEffect(() => {
    if (inView && !hasStartedRef.current) {
      hasStartedRef.current = true;
      const timeout = setTimeout(startTyping, 300);
      return () => clearTimeout(timeout);
    }
  }, [inView, startTyping]);

  // Fill on cleanup
  useEffect(() => {
    if (!inView) {
      setDisplayedText(fullText);
      if (typingRef.current) {
        clearInterval(typingRef.current);
        typingRef.current = null;
      }
      setIsTyping(false);
      isTypingRef.current = false;
      hasStartedRef.current = true;
    }
  }, [inView]);

  return (
    <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-[#f5f0eb] dark:bg-white/10 border border-[#e8ddd0] dark:border-white/[0.08]">
      <Globe size={16} className="text-[#8a7a6a] dark:text-magazine-text/60 shrink-0" />
      <span className="text-sm text-[#5c4a3a] dark:text-magazine-text font-medium">
        {displayedText}
        {isTyping && (
          <span className="inline-block w-[2px] h-[14px] bg-[#5c4a3a] ml-0.5 align-text-top animate-pulse" />
        )}
      </span>
    </div>
  );
}

function TripCard() {
  return (
    <div className="rounded-xl bg-[#f5f0eb] dark:bg-white/5 border border-[#e8ddd0] dark:border-white/[0.08] overflow-hidden">
      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-sm font-semibold text-[#2a1f17] dark:text-magazine-heading">Tokyo Weekend</p>
            <p className="text-xs text-[#8a7a6a] dark:text-magazine-text/60">Tokyo, Japan</p>
          </div>
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#C4622D]/10 text-[#C4622D] border border-[#C4622D]/20">
            Planning
          </span>
        </div>
        <div className="flex items-center gap-3 text-xs text-[#8a7a6a] dark:text-magazine-text/60">
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

function PlanProgress({ phase }: { phase: number }) {
  return (
    <div className="space-y-0">
      {/* Processing indicator — shows only during first phase */}
      <div
        className="flex items-center gap-2.5 mb-4 transition-all duration-500"
        style={{
          opacity: phase <= 1 ? 1 : 0,
          maxHeight: phase <= 1 ? "24px" : "0px",
          overflow: "hidden",
        }}
      >
        <div className="flex gap-1">
          <div className="w-1.5 h-1.5 rounded-full bg-[#C4622D] animate-pulse" style={{ animationDelay: "0ms" }} />
          <div className="w-1.5 h-1.5 rounded-full bg-[#C4622D] animate-pulse" style={{ animationDelay: "150ms" }} />
          <div className="w-1.5 h-1.5 rounded-full bg-[#C4622D] animate-pulse" style={{ animationDelay: "300ms" }} />
        </div>
        <span className="text-xs text-[#C4622D] font-medium">Planning your trip...</span>
      </div>

      {/* Rich output — pieces appear one by one */}
      <div className="space-y-3">
        {/* Destination */}
        <div
          className="transition-all duration-500"
          style={{
            opacity: phase >= 1 ? 1 : 0,
            transform: phase >= 1 ? "translateY(0)" : "translateY(8px)",
            maxHeight: phase >= 1 ? "100px" : "0px",
            overflow: "hidden",
          }}
        >
          <div className="flex items-start gap-3 p-3 rounded-lg bg-white/60 dark:bg-white/5 border border-[#e8ddd0] dark:border-white/[0.08]">
            <span className="text-base shrink-0 mt-0.5">🌏</span>
            <div>
              <p className="text-sm font-semibold text-[#2a1f17] dark:text-magazine-heading">Tokyo, Japan</p>
              <p className="text-xs text-[#8a7a6a] dark:text-magazine-text/60 mt-0.5">
                5 days in East Asia — world-class food, ancient temples, and electric city energy.
              </p>
            </div>
          </div>
        </div>

        {/* Dates */}
        <div
          className="transition-all duration-500"
          style={{
            opacity: phase >= 2 ? 1 : 0,
            transform: phase >= 2 ? "translateY(0)" : "translateY(8px)",
            maxHeight: phase >= 2 ? "100px" : "0px",
            overflow: "hidden",
          }}
        >
          <div className="flex items-start gap-3 p-3 rounded-lg bg-white/60 dark:bg-white/5 border border-[#e8ddd0] dark:border-white/[0.08]">
            <span className="text-base shrink-0 mt-0.5">📅</span>
            <div>
              <p className="text-sm font-semibold text-[#2a1f17] dark:text-magazine-heading">Mar 15 – Mar 20</p>
              <p className="text-xs text-[#8a7a6a] mt-0.5">
                5 days · Cherry blossom season · Peak viewing time
              </p>
            </div>
          </div>
        </div>

        {/* Travelers + trip type */}
        <div
          className="transition-all duration-500"
          style={{
            opacity: phase >= 3 ? 1 : 0,
            transform: phase >= 3 ? "translateY(0)" : "translateY(8px)",
            maxHeight: phase >= 3 ? "100px" : "0px",
            overflow: "hidden",
          }}
        >
          <div className="flex items-start gap-3 p-3 rounded-lg bg-white/60 dark:bg-white/5 border border-[#e8ddd0] dark:border-white/[0.08]">
            <span className="text-base shrink-0 mt-0.5">👥</span>
            <div>
              <p className="text-sm font-semibold text-[#2a1f17] dark:text-magazine-heading">3 travelers · friends trip</p>
              <p className="text-xs text-[#8a7a6a] mt-0.5">
                Exploring Tokyo together — street food tours, shrine hopping, nightlife.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Rich itinerary data ────────────────────────────────────

const CATEGORY_STYLES: Record<string, { bg: string; text: string; icon: string }> = {
  Food: { bg: "bg-orange-100", text: "text-orange-700", icon: "🍜" },
  Culture: { bg: "bg-indigo-100", text: "text-indigo-700", icon: "🏛️" },
  Nature: { bg: "bg-emerald-100", text: "text-emerald-700", icon: "🌿" },
  Nightlife: { bg: "bg-purple-100", text: "text-purple-700", icon: "🌙" },
  Transport: { bg: "bg-sky-100", text: "text-sky-700", icon: "🚃" },
  Shopping: { bg: "bg-pink-100", text: "text-pink-700", icon: "🛍️" },
};

interface ItineraryActivity {
  time: string;
  title: string;
  description: string;
  category: string;
  duration: string;
  image: string;
}

interface ItineraryDay {
  label: string;
  date: string;
  vibe: string;
  hero: string;
  activities: ItineraryActivity[];
}

const ITINERARY_DAYS: ItineraryDay[] = [
  {
    label: "Day 1",
    date: "Mar 15",
    vibe: "Arrival & exploring Asakusa",
    hero: "https://images.pexels.com/photos/30978583/pexels-photo-30978583.jpeg?auto=compress&cs=tinysrgb&w=600&h=200&fit=crop",
    activities: [
      { time: "08:00", title: "Arrive at Narita", description: "Airport pickup via Skyliner express, check into Asakusa hotel", category: "Transport", duration: "1.5h", image: "https://images.pexels.com/photos/35644915/pexels-photo-35644915.jpeg?auto=compress&cs=tinysrgb&w=80&h=80&fit=crop" },
      { time: "10:00", title: "Tsukiji Outer Market", description: "Fresh sushi, street food stalls, and kitchenware shopping", category: "Food", duration: "2h", image: "https://images.pexels.com/photos/33054077/pexels-photo-33054077.jpeg?auto=compress&cs=tinysrgb&w=80&h=80&fit=crop" },
      { time: "13:00", title: "Senso-ji Temple", description: "Tokyo's oldest temple, Nakamise-dori souvenir street, five-story pagoda", category: "Culture", duration: "1.5h", image: "https://images.pexels.com/photos/31409369/pexels-photo-31409369.jpeg?auto=compress&cs=tinysrgb&w=80&h=80&fit=crop" },
      { time: "15:30", title: "Ueno Park", description: "Museums, zoo, Shinobazu Pond — cherry blossoms in full bloom", category: "Nature", duration: "2h", image: "https://images.pexels.com/photos/34745733/pexels-photo-34745733.jpeg?auto=compress&cs=tinysrgb&w=80&h=80&fit=crop" },
      { time: "19:00", title: "Ameya-Yokocho Market", description: "Bustling market street with yakitori, ramen, and retro arcades", category: "Food", duration: "2h", image: "https://images.pexels.com/photos/31569911/pexels-photo-31569911.jpeg?auto=compress&cs=tinysrgb&w=80&h=80&fit=crop" },
    ],
  },
  {
    label: "Day 2",
    date: "Mar 16",
    vibe: "Shibuya & Harajuku culture",
    hero: "https://images.pexels.com/photos/31495723/pexels-photo-31495723.jpeg?auto=compress&cs=tinysrgb&w=600&h=200&fit=crop",
    activities: [
      { time: "09:00", title: "Meiji Jingu Shrine", description: "Serene forest walk leading to Tokyo's most important Shinto shrine", category: "Culture", duration: "1.5h", image: "https://images.pexels.com/photos/3800108/pexels-photo-3800108.jpeg?auto=compress&cs=tinysrgb&w=80&h=80&fit=crop" },
      { time: "11:00", title: "Takeshita Street", description: "Harajuku's colorful fashion hub — crepes, quirky boutiques, photo booths", category: "Shopping", duration: "1.5h", image: "https://images.pexels.com/photos/30978789/pexels-photo-30978789.jpeg?auto=compress&cs=tinysrgb&w=80&h=80&fit=crop" },
      { time: "13:00", title: "Shibuya Crossing", description: "Iconic scramble crossing, Hachiko statue, Shibuya Sky observation deck", category: "Culture", duration: "1h", image: "https://images.pexels.com/photos/427747/pexels-photo-427747.jpeg?auto=compress&cs=tinysrgb&w=80&h=80&fit=crop" },
      { time: "15:00", title: "Shinjuku Gyoen", description: "Sprawling national garden with Japanese, French, and English landscape styles", category: "Nature", duration: "1.5h", image: "https://images.pexels.com/photos/15183244/pexels-photo-15183244.jpeg?auto=compress&cs=tinysrgb&w=80&h=80&fit=crop" },
      { time: "19:00", title: "Omoide Yokocho", description: "Narrow alley of tiny yakitori bars — smoky, lively, and unforgettable", category: "Food", duration: "2.5h", image: "https://images.pexels.com/photos/34883469/pexels-photo-34883469.jpeg?auto=compress&cs=tinysrgb&w=80&h=80&fit=crop" },
    ],
  },
  {
    label: "Day 3",
    date: "Mar 17",
    vibe: "Day trip to Hakone",
    hero: "https://images.pexels.com/photos/35134885/pexels-photo-35134885.jpeg?auto=compress&cs=tinysrgb&w=600&h=200&fit=crop",
    activities: [
      { time: "07:30", title: "Shinkansen to Hakone", description: "Scenic bullet train ride to Hakone-Yumoto Station with Mt. Fuji views", category: "Transport", duration: "1.5h", image: "https://images.pexels.com/photos/12645535/pexels-photo-12645535.jpeg?auto=compress&cs=tinysrgb&w=80&h=80&fit=crop" },
      { time: "09:30", title: "Hakone Open-Air Museum", description: "Outdoor sculptures, Picasso pavilion, and foot bath with mountain views", category: "Culture", duration: "2h", image: "https://images.pexels.com/photos/16371158/pexels-photo-16371158.jpeg?auto=compress&cs=tinysrgb&w=80&h=80&fit=crop" },
      { time: "12:00", title: "Lake Ashi Cruise", description: "Pirate ship across the caldera lake, views of Mt. Fuji on clear days", category: "Nature", duration: "1h", image: "https://images.pexels.com/photos/29213215/pexels-photo-29213215.jpeg?auto=compress&cs=tinysrgb&w=80&h=80&fit=crop" },
      { time: "14:00", title: "Hakone Shrine", description: "Iconic red torii gate rising from the water, forested hillside setting", category: "Culture", duration: "1h", image: "https://images.pexels.com/photos/34714218/pexels-photo-34714218.jpeg?auto=compress&cs=tinysrgb&w=80&h=80&fit=crop" },
      { time: "16:00", title: "Onsen & Kaiseki Dinner", description: "Traditional hot spring bath followed by a multi-course Japanese dinner", category: "Food", duration: "3h", image: "https://images.pexels.com/photos/37297743/pexels-photo-37297743.jpeg?auto=compress&cs=tinysrgb&w=80&h=80&fit=crop" },
    ],
  },
];

function CategoryBadge({ category }: { category: string }) {
  const style = CATEGORY_STYLES[category] ?? { bg: "bg-gray-100", text: "text-gray-600", icon: "📍" };
  return (
    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-semibold ${style.bg} ${style.text}`}>
      <span>{style.icon}</span>
      {category}
    </span>
  );
}

function RichItinerary({ day, subPhase }: { day: number; subPhase: number }) {
  const dayData = ITINERARY_DAYS[day];
  const visibleCount = Math.min(subPhase, dayData.activities.length);

  return (
    <div className="rounded-xl bg-white dark:bg-card border border-[#e8ddd0] dark:border-white/[0.08] overflow-hidden shadow-sm">
      {/* Day tabs */}
      <div className="flex border-b border-[#e8ddd0] dark:border-white/[0.08] bg-[#f5f0eb] dark:bg-black/20" role="tablist">
        {ITINERARY_DAYS.map((d, i) => (
          <button
            key={i}
            role="tab"
            aria-selected={i === day}
            className={`flex-1 text-center py-2.5 text-xs font-semibold transition-all duration-300 relative ${
              i === day
                ? "text-[#1e3a5f] dark:text-magazine-accent bg-white dark:bg-card"
                : "text-[#8a7a6a] dark:text-magazine-text/60 hover:text-[#5c4a3a] dark:hover:text-magazine-text hover:bg-[#e8ddd0]/50 dark:hover:bg-white/5"
            }`}
          >
            <span className="block">{d.label}</span>
            <span className="block text-[9px] font-normal opacity-70">{d.date}</span>
            {i === day && (
              <div className="absolute bottom-0 left-2 right-2 h-0.5 bg-[#C4622D] rounded-full" />
            )}
          </button>
        ))}
      </div>

      {/* Day hero image */}
      {subPhase > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="relative h-28 sm:h-36 overflow-hidden bg-[#f5f0eb] dark:bg-black/20"
        >
          <img
            src={dayData.hero}
            alt={dayData.vibe}
            className="w-full h-full object-cover"
            loading="lazy"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
          <div className="absolute bottom-2 left-3 right-3 flex items-center justify-between">
            <span className="text-white text-xs font-semibold drop-shadow-sm">{dayData.vibe}</span>
            <span className="text-white/80 text-[9px] font-medium drop-shadow-sm">{dayData.activities.length} activities</span>
          </div>
        </motion.div>
      )}

      {/* Activities */}
      <div className="divide-y divide-[#e8ddd0]/60 dark:divide-white/[0.06]">
        {dayData.activities.slice(0, visibleCount).map((a, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: i * 0.08 }}
            className="px-3 py-2.5 hover:bg-[#faf8f5] dark:hover:bg-white/[0.02] transition-colors"
          >
            <div className="flex items-start gap-2.5">
              {/* Activity thumbnail */}
              <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0 bg-[#f5f0eb] dark:bg-white/10 border border-[#e8ddd0] dark:border-white/[0.08]">
                <img
                  src={a.image}
                  alt={a.title}
                  className="w-full h-full object-cover"
                  loading="lazy"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
              </div>
              {/* Time column */}
              <div className="flex flex-col items-center w-12 shrink-0 pt-0.5">
                <span className="text-[11px] font-semibold text-[#8a7a6a] dark:text-magazine-text/60 tabular-nums leading-tight">{a.time}</span>
                <span className="text-[8px] text-[#b8a898] dark:text-magazine-text/40 font-medium">{a.duration}</span>
              </div>
              {/* Vertical dot line */}
              <div className="flex flex-col items-center shrink-0 pt-1">
                <div className="w-2 h-2 rounded-full bg-[#C4622D]/60" />
                <div className="w-px h-full min-h-[28px] bg-[#e8ddd0] dark:bg-white/[0.08]" />
              </div>
              {/* Content */}
              <div className="flex-1 min-w-0 pb-0.5">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-sm font-semibold text-[#2a1f17] dark:text-magazine-heading">{a.title}</span>
                  <CategoryBadge category={a.category} />
                </div>
                <p className="text-[11px] text-[#8a7a6a] dark:text-magazine-text/60 mt-0.5 leading-relaxed">{a.description}</p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Remaining count hint */}
      {visibleCount < dayData.activities.length && (
        <div className="px-4 py-2 bg-[#faf8f5] dark:bg-black/10 border-t border-[#e8ddd0]/60 dark:border-white/[0.06] text-center">
          <span className="text-[10px] text-[#b8a898] dark:text-magazine-text/40 font-medium">
            +{dayData.activities.length - visibleCount} more activities
          </span>
        </div>
      )}
    </div>
  );
}

// ─── Main component ─────────────────────────────────────────

export function ProductDemo() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeState, setActiveState] = useState(0);
  const [planPhase, setPlanPhase] = useState(0);
  const [searchInView, setSearchInView] = useState(false);
  const [showPlanCard, setShowPlanCard] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [itineraryDay, setItineraryDay] = useState(0);
  const [itinerarySubPhase, setItinerarySubPhase] = useState(0);
  const prevStateRef = useRef(0);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start center", "end center"],
  });

  useMotionValueEvent(scrollYProgress, "change", (v) => {
    let state = 0;
    if (v > 0.6) state = 2;
    else if (v > 0.25) state = 1;
    if (state !== prevStateRef.current) {
      prevStateRef.current = state;
      setActiveState(state);
    }
  });

  const scrollToStep = useCallback((step: number) => {
    const targets = [0.1, 0.38, 0.75];
    const el = containerRef.current;
    if (!el) return;
    const p = targets[step];
    const scrollY = el.offsetTop - window.innerHeight / 2 + p * el.offsetHeight;
    window.scrollTo({ top: scrollY, behavior: "smooth" });
    setActiveState(step);
    prevStateRef.current = step;
    if (step === 0) { setSearchInView(true); setShowSuggestions(false); }
  }, []);

  const mockupRef = useRef<HTMLDivElement>(null);
  const isMockupInView = useInView(mockupRef, { amount: 0.3 });

  // Preload itinerary images so they don't pop in lazily
  useEffect(() => {
    const urls = new Set<string>();
    ITINERARY_DAYS.forEach((day) => {
      urls.add(day.hero);
      day.activities.forEach((a) => urls.add(a.image));
    });
    urls.forEach((url) => {
      const img = new Image();
      img.src = url;
    });
  }, []);

  // Trigger search typing when mockup comes into view
  useEffect(() => {
    if (isMockupInView && !searchInView) {
      setSearchInView(true);
    }
  }, [isMockupInView, searchInView]);

  // Plan sub-phase animation — cycles when activeState === 1
  useEffect(() => {
    if (activeState !== 1) return;
    setPlanPhase(0);
    setShowPlanCard(false);
    const timers: ReturnType<typeof setTimeout>[] = [];
    for (let i = 0; i < PLAN_PHASE_COUNT; i++) {
      timers.push(
        setTimeout(() => {
          setPlanPhase(i + 1);
          if (i === PLAN_PHASE_COUNT - 1) {
            setTimeout(() => setShowPlanCard(true), 400);
          }
        }, (i + 1) * 700)
      );
    }
    return () => timers.forEach(clearTimeout);
  }, [activeState]);

  // Itinerary sub-phase cycling — cascades through days then reveals activities
  useEffect(() => {
    if (activeState !== 2) return;
    setItineraryDay(0);
    setItinerarySubPhase(0);
    const DAY_COUNT = ITINERARY_DAYS.length;
    const ACTIVITIES_PER_DAY = ITINERARY_DAYS[0].activities.length;
    const timers: ReturnType<typeof setTimeout>[] = [];

    // Cycle through days and sub-phases
    for (let day = 0; day < DAY_COUNT; day++) {
      for (let act = 1; act <= ACTIVITIES_PER_DAY; act++) {
        const delay = (day * ACTIVITIES_PER_DAY + act) * 250;
        timers.push(
          setTimeout(() => {
            setItineraryDay(day);
            setItinerarySubPhase(act);
          }, delay)
        );
      }
      // Brief pause between days
      if (day < DAY_COUNT - 1) {
        timers.push(
          setTimeout(() => {
            setItineraryDay(day + 1);
            setItinerarySubPhase(1);
          }, (day + 1) * ACTIVITIES_PER_DAY * 250 + 400)
        );
      }
    }
    return () => timers.forEach(clearTimeout);
  }, [activeState]);

  return (
    <section className="py-24 px-6 bg-gradient-to-b from-[#f5efe8] to-[#fafaf8] dark:from-[var(--magazine-surface)] dark:to-[var(--magazine-bg)]">
      <div className="max-w-5xl mx-auto">
        {/* Scroll-driven container */}
        <div
          ref={containerRef}
          className="relative"
          style={{ height: `${STATE_COUNT * 60}vh` }}
        >
          <div className="sticky top-[96px]">
            {/* Section heading — inside sticky so it stays below navbar during parallax */}
            <div className="text-center mb-10">
              <h2 className="text-3xl md:text-4xl font-serif font-normal text-magazine-heading tracking-wide mb-3">
                See It <span className="italic">In Action</span>
              </h2>
              <p className="text-sm md:text-base text-magazine-text max-w-lg mx-auto leading-relaxed">
                Scroll through how Travyl turns a simple idea into a complete,
                shareable trip plan.
              </p>
            </div>

            {/* Step indicator */}
            <div className="max-w-3xl mx-auto mb-6">
              <div className="flex items-center justify-center gap-0">
                {STEPS.map((step, i) => (
                  <div key={i} className="flex items-center">
                    <button
                      onClick={() => scrollToStep(i)}
                      aria-label={`Go to step ${i + 1}: ${step.label}`}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-500 ${
                        i === activeState
                          ? "bg-[#1e3a5f] dark:bg-primary text-white shadow-md"
                          : i < activeState
                            ? "text-[#8a7a6a] dark:text-magazine-text/60 hover:bg-[#e8ddd0]/50 dark:hover:bg-white/10"
                            : "text-[#b8a898] dark:text-magazine-text/40 hover:bg-[#e8ddd0]/30 dark:hover:bg-white/5"
                      }`}
                    >
                      <span
                        className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold transition-all duration-500 ${
                          i === activeState
                            ? "bg-white/20 text-white"
                            : i < activeState
                              ? "bg-[#C4622D]/15 dark:bg-[#C4622D]/30 text-[#C4622D]"
                              : "bg-[#e8ddd0] dark:bg-white/10 text-[#b8a898] dark:text-magazine-text/40"
                        }`}
                      >
                        {i < activeState ? (
                          <Check size={10} strokeWidth={2.5} />
                        ) : (
                          LABEL_KEYS[i]
                        )}
                      </span>
                      {step.label}
                    </button>
                    {i < STEPS.length - 1 && (
                      <div
                        className={`w-8 h-[1.5px] mx-1 transition-colors duration-500 ${
                          i < activeState
                            ? "bg-[#C4622D]/30"
                            : "bg-[#e8ddd0] dark:bg-white/10"
                        }`}
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Active step title + description — above the mockup */}
            <div className="max-w-3xl mx-auto mb-6 text-center">
              <motion.p
                key={`num-${activeState}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#C4622D] mb-2"
              >
                {LABEL_KEYS[activeState]}
              </motion.p>
              <motion.h3
                key={`title-${activeState}`}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: 0.05 }}
                className="text-2xl md:text-3xl font-serif font-normal text-magazine-heading tracking-wide mb-3"
              >
                {STEPS[activeState].title}
              </motion.h3>
              <motion.p
                key={`desc-${activeState}`}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.1 }}
                className="text-sm md:text-base text-magazine-text max-w-lg mx-auto leading-relaxed"
              >
                {STEPS[activeState].description}
              </motion.p>
            </div>

            {/* Mockup card — fixed width, no horizontal resizing */}
            <div className="max-w-3xl mx-auto w-full">
              <div className="rounded-2xl overflow-hidden bg-white dark:bg-card shadow-xl shadow-[#2a1f17]/8 dark:shadow-black/20 border border-[#e8ddd0] dark:border-white/[0.08]">
                {/* Mockup content — constant-width container */}
                <div ref={mockupRef} className="p-6 min-h-[320px] relative w-full">
                  {activeState === 0 && (
                    <div className="space-y-5">
                      <div>
                        <p className="text-[10px] text-[#8a7a6a] dark:text-magazine-text/60 uppercase tracking-wider font-semibold mb-2">
                          Search
                        </p>
                        <MockSearchBar inView={searchInView} onComplete={() => setShowSuggestions(true)} />
                      </div>

                      {/* Suggestion pills — appear after typing finishes */}
                      <div
                        className="space-y-3 transition-all duration-500"
                        style={{
                          opacity: showSuggestions ? 1 : 0,
                          transform: showSuggestions ? "translateY(0)" : "translateY(8px)",
                          maxHeight: showSuggestions ? "200px" : "0px",
                          overflow: "hidden",
                        }}
                      >
                        <p className="text-[10px] text-[#8a7a6a] dark:text-magazine-text/60 uppercase tracking-wider font-semibold">
                          Refine your trip
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {[
                            "Street food tour",
                            "Temple & shrines",
                            "Shibuya nightlife",
                            "Day trip to Hakone",
                            "Budget-friendly",
                          ].map((pill) => (
                            <div
                              key={pill}
                              className="text-xs font-medium px-3 py-1.5 rounded-full bg-white dark:bg-white/10 border border-[#e8ddd0] dark:border-white/[0.08] text-[#5c4a3a] dark:text-magazine-text hover:bg-[#f5f0eb] dark:hover:bg-white/20 transition-colors cursor-default whitespace-nowrap shrink-0"
                            >
                              {pill}
                            </div>
                          ))}
                        </div>
                        <div className="flex items-center gap-2 pt-1">
                          <Sparkles size={12} className="text-[#C4622D]" />
                          <span className="text-[11px] text-[#8a7a6a] dark:text-magazine-text/60">
                            Tap any suggestion to refine, or scroll down to plan
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {activeState === 1 && (
                    <div className="space-y-5">
                      <p className="text-[10px] text-[#8a7a6a] dark:text-magazine-text/60 uppercase tracking-wider font-semibold">
                        Planning
                      </p>
                      <PlanProgress phase={planPhase} />
                      <div
                        style={{
                          opacity: showPlanCard ? 1 : 0,
                          transform: showPlanCard ? "translateY(0)" : "translateY(12px)",
                          maxHeight: showPlanCard ? "120px" : "0px",
                          overflow: "hidden",
                          transition: "all 0.5s ease",
                        }}
                      >
                        <TripCard />
                      </div>
                    </div>
                  )}

                  {activeState === 2 && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <p className="text-[10px] text-[#8a7a6a] dark:text-magazine-text/60 uppercase tracking-wider font-semibold">
                          Day-by-day itinerary
                        </p>
                        <span className="text-[9px] text-[#C4622D] font-medium">
                          {ITINERARY_DAYS[itineraryDay].label} · {ITINERARY_DAYS[itineraryDay].date}
                        </span>
                      </div>
                      <RichItinerary day={itineraryDay} subPhase={itinerarySubPhase} />
                    </div>
                  )}

                </div>
              </div>
            </div>

            {/* Progress bar */}
            <div className="max-w-3xl mx-auto mt-5 h-[2px] rounded-full bg-[#e8ddd0] dark:bg-white/10 overflow-hidden">
              <motion.div
                className="h-full bg-[#C4622D]/50 origin-left rounded-full"
                style={{ scaleX: scrollYProgress }}
              />
            </div>

            {/* Scroll hint */}
            <div
              className="mt-4 flex items-center justify-center gap-2 transition-opacity duration-300"
              style={{
                opacity:
                  activeState < STATE_COUNT - 1 ? 0.5 : 0,
              }}
            >
              <div className="w-5 h-8 rounded-full border-2 border-[#b8a898] dark:border-white/20 flex items-start justify-center pt-1.5">
                <div className="w-1 h-1.5 rounded-full bg-[#8a7a6a] dark:bg-white/40 animate-[scrollDot_1.5s_ease-in-out_infinite]" />
              </div>
              <span className="text-[#b8a898] dark:text-white/40 text-[10px] font-medium uppercase tracking-wider">
                Scroll
              </span>
            </div>
          </div>
        </div>
      </div>
      <style>{`@keyframes scrollDot { 0%, 100% { transform: translateY(0); opacity: 1; } 50% { transform: translateY(10px); opacity: 0.3; } }`}</style>
    </section>
  );
}
