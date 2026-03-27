"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { motion, useScroll, useTransform } from "motion/react";
import { Search, Sparkles } from "lucide-react";
import { useHomeScreen, useHeroConfig, usePlaceImages, useTripPlanner, useAuthStore, EASE_OUT_EXPO } from "@travyl/shared";
import type { FollowUpQuestion } from "@travyl/shared";
import { useQuery } from "@tanstack/react-query";
import { savePlanToSupabase } from "@travyl/shared/src/services/api";
import { PaperPlane } from "@/components/icons/PaperPlane";
import { AnimatedCounter } from "@/components/AnimatedCounter";
import { TypeWriter } from "@/components/TypeWriter";
import { useCyclingPlaceholder, useCyclingPlaceholderRef } from "@/hooks/useCyclingPlaceholder";
import dynamic from "next/dynamic";

const HowItWorks = dynamic(
  () => import("@/components/home/HowItWorks").then((m) => ({ default: m.HowItWorks })),
  { ssr: false }
);
const GetInspired = dynamic(
  () => import("@/components/home/GetInspired").then((m) => ({ default: m.GetInspired })),
  { ssr: false }
);
const TagUs = dynamic(
  () => import("@/components/home/TagUs").then((m) => ({ default: m.TagUs })),
  { ssr: false }
);
const OceanWave = dynamic(
  () => import("@/components/home/OceanWave").then((m) => ({ default: m.OceanWave })),
  { ssr: false }
);
const TakeoffTransition = dynamic(
  () => import("@/components/home/TakeoffTransition").then((m) => ({ default: m.TakeoffTransition })),
  { ssr: false }
);
const Footer = dynamic(
  () => import("@/components/home/Footer").then((m) => ({ default: m.Footer })),
  { ssr: false }
);
const ParallaxQuoteDivider = dynamic(
  () => import("@/components/home/ParallaxQuoteDivider").then((m) => ({ default: m.ParallaxQuoteDivider })),
  { ssr: false }
);
import { memo } from "react";

const PLACEHOLDER_PHRASES = [
  "7 days in Paris with my partner...",
  "A week in Tokyo exploring street food...",
  "Family beach vacation in Bali...",
  "Weekend getaway to the Swiss Alps...",
  "Solo backpacking through Southeast Asia...",
];

const SUBTITLE_PHRASES = [
  "Type your dream trip and let us plan it for you",
  "Discover hidden gems around the world",
  "Your next adventure starts with a single search",
  "From idea to itinerary in seconds",
  "Tell us where you want to go",
];

const CyclingSubtitle = memo(function CyclingSubtitle() {
  const textRef = useCyclingPlaceholderRef(SUBTITLE_PHRASES, 40, 2500, 25);
  return <><span ref={textRef} /><span className="animate-pulse">|</span></>;
});

const HeroSearchInput = memo(function HeroSearchInput({
  tripQuery,
  setTripQuery,
  onSearch,
  staticPlaceholder,
  inputRef,
}: {
  tripQuery: string;
  setTripQuery: (v: string) => void;
  onSearch: () => void;
  staticPlaceholder?: string;
  inputRef?: React.RefObject<HTMLInputElement | null>;
}) {
  const typingPlaceholder = useCyclingPlaceholder(PLACEHOLDER_PHRASES);
  return (
    <div className="flex-1 flex items-center gap-3 px-4 min-w-0">
      <Search className="text-gray-400 shrink-0" size={18} />
      <input
        ref={inputRef}
        type="text"
        value={tripQuery}
        onChange={(e) => setTripQuery(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && onSearch()}
        placeholder={tripQuery ? "" : (staticPlaceholder ?? typingPlaceholder)}
        className="flex-1 py-2 text-sm text-gray-900 outline-none placeholder:text-gray-400 min-w-0"
      />
    </div>
  );
});

// ─── Live stats from /api/stats ──────────────────────────────
function LiveStats() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['live-stats'],
    queryFn: async () => {
      const res = await fetch('/api/stats');
      if (!res.ok) return { destinations: 0, travelers: 0, trips: 0 };
      return res.json() as Promise<{ destinations: number; travelers: number; trips: number }>;
    },
    staleTime: 60 * 1000,
    refetchOnMount: 'always',
  });

  const items = [
    { value: stats?.destinations ?? 0, suffix: "+", label: "Destinations", desc: "Real places our community has explored." },
    { value: stats?.travelers ?? 0, suffix: "", label: "Travelers", desc: "People planning their next adventure." },
    { value: stats?.trips ?? 0, suffix: "+", label: "Trips Planned", desc: "AI-powered itineraries created and counting." },
  ];

  return (
    <section className="py-8 sm:py-14 px-4 sm:px-6 border-y bg-[#e8d5c0] border-[#5c4a3a]">
      <div className="max-w-5xl mx-auto grid grid-cols-3 gap-3 sm:gap-8 text-center">
        {isLoading ? (
          <>
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex flex-col items-center gap-2">
                <div className="h-8 sm:h-12 w-20 sm:w-28 bg-[#2a1f17]/10 rounded-lg animate-pulse" />
                <div className="h-3 w-16 sm:w-24 bg-[#2a1f17]/10 rounded animate-pulse" />
                <div className="h-3 w-28 sm:w-40 bg-[#2a1f17]/8 rounded animate-pulse" />
              </div>
            ))}
          </>
        ) : (
          items.map((item) => (
            <div key={item.label}>
              <p className="text-2xl sm:text-4xl md:text-5xl font-[550] tracking-tight mb-1 text-[#2a1f17]">
                <AnimatedCounter value={item.value} suffix={item.suffix} decimals={0} />
              </p>
              <p className="text-[8px] sm:text-xs font-bold uppercase tracking-widest mb-1 sm:mb-2 text-[#1e3a5f]">{item.label}</p>
              <p className="text-[11px] sm:text-sm max-w-[220px] mx-auto leading-snug sm:leading-relaxed text-[#2a1f17]">{item.desc}</p>
            </div>
          ))
        )}
      </div>
    </section>
  );
}

// ─── Follow-up question option card ─────────────────────────
function OptionCard({ label, index, selected, onSelect }: {
  label: string; index: number; selected: boolean; onSelect: () => void;
}) {
  const keys = ["A", "B", "C", "D", "E"];
  return (
    <button
      onClick={onSelect}
      className={`flex items-center gap-3 px-4 py-3 rounded-xl text-left text-sm transition-all duration-200 w-full ${
        selected
          ? "bg-[#1e3a5f] text-white shadow-md ring-1 ring-white/30"
          : "bg-white/10 text-white/80 hover:bg-white/20 border border-white/15"
      }`}
    >
      <span className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 transition-all ${
        selected ? "bg-white/20 text-white" : "bg-white/10 text-white/50"
      }`}>
        {selected ? "✓" : keys[index] || index + 1}
      </span>
      <span className="font-medium">{label}</span>
    </button>
  );
}

export default function Home() {
  const router = useRouter();
  const {
    tripQuery,
    setTripQuery,
  } = useHomeScreen();
  const { data: heroConfig } = useHeroConfig();

  const sendButtonRef = useRef<HTMLButtonElement>(null);
  const [showTakeoff, setShowTakeoff] = useState(false);
  const [buttonRect, setButtonRect] = useState<DOMRect | null>(null);
  const [heroSlide, setHeroSlide] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // API-driven planning flow
  const planner = useTripPlanner();
  const [currentQIdx, setCurrentQIdx] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string[]>>({});
  const [showQuestions, setShowQuestions] = useState(false);
  const skipQuestionsRef = useRef(false);


  const isClarifying = planner.state.phase === 'clarifying';
  const isExtracting = planner.state.phase === 'extracting';
  const isPlanning = planner.state.phase === 'planning';
  const questions: FollowUpQuestion[] = planner.state.phase === 'clarifying' ? planner.state.questions : [];
  const currentQuestion = questions[currentQIdx];

  // Auto-skip questions when user clicked Send (not Refine)
  useEffect(() => {
    if (isClarifying && skipQuestionsRef.current) {
      skipQuestionsRef.current = false;
      setButtonRect(sendButtonRef.current?.getBoundingClientRect() ?? null);
      setShowTakeoff(true);
      planner.submitAnswers({});
    }
  }, [isClarifying, planner]);

  // Cycling placeholders live in isolated memo components above
  // to avoid re-rendering the entire page every ~25ms

  // Trending destination pills from SerpAPI (cached 6h server-side)
  const { data: trendingDestinations } = useQuery({
    queryKey: ['trending-destinations'],
    queryFn: async () => {
      const res = await fetch('/api/trending-destinations');
      if (!res.ok) return [];
      return res.json() as Promise<{ name: string; country: string; thumbnail: string | null }[]>;
    },
    staleTime: 30 * 60 * 1000,
    refetchOnMount: false,
  });

  const allSuggestions = (trendingDestinations ?? []).map((d, i) => ({ id: `td-${i}`, label: d.name }));
  const PILLS_VISIBLE = 4;
  const [pillGroup, setPillGroup] = useState(0);
  const pillGroupCount = Math.ceil(allSuggestions.length / PILLS_VISIBLE);

  useEffect(() => {
    if (pillGroupCount <= 1) return;
    const interval = setInterval(() => {
      setPillGroup((prev) => (prev + 1) % pillGroupCount);
    }, 3500);
    return () => clearInterval(interval);
  }, [pillGroupCount]);

  const visiblePills = allSuggestions.slice(
    pillGroup * PILLS_VISIBLE,
    pillGroup * PILLS_VISIBLE + PILLS_VISIBLE
  );

  // Parallax transforms — document-level scroll (no target ref to avoid hydration error)
  const { scrollYProgress: heroScroll } = useScroll();
  const heroTextY = useTransform(heroScroll, [0, 0.35], [0, 150]);
  const heroTextOpacity = useTransform(heroScroll, [0, 0.2], [1, 0]);
  const heroBgY = useTransform(heroScroll, [0, 0.35], [0, -120]);
  const heroBgScale = useTransform(heroScroll, [0, 0.35], [1, 1.15]);

  // Parallax divider
  const dividerBgY = useTransform(heroScroll, [0.3, 0.7], [-80, 80]);

  // Hero slideshow — fetch from backend API, no hardcoded fallbacks
  const HERO_DESTINATIONS = ["Maldives Beach", "Paris Eiffel Tower", "Grand Canyon", "Tokyo Skyline"];
  const heroImageQueries = usePlaceImages(HERO_DESTINATIONS);

  // Only include slides that have actually loaded
  const heroSlides = useMemo(() => {
    if (heroConfig?.background_image_url) return [heroConfig.background_image_url];
    const loaded = heroImageQueries
      .map((q) => q.data?.url)
      .filter((url): url is string => !!url);
    return loaded.length > 0 ? loaded : HERO_DESTINATIONS.map(() =>
      `https://images.unsplash.com/photo-1510414842594-a61c69b5ae57?w=1600&fit=crop&fm=webp&q=80`
    ).slice(0, 1); // single fallback while loading
  }, [heroConfig?.background_image_url, heroImageQueries]);

  useEffect(() => {
    if (heroSlides.length <= 1) return;
    const interval = setInterval(() => {
      setHeroSlide((prev) => (prev + 1) % heroSlides.length);
    }, 6000);
    return () => clearInterval(interval);
  }, [heroSlides.length]);

  // Flatten multi-select answers into strings for the planner API
  const flattenAnswers = useCallback((answers: Record<string, string[]>) => {
    const flat: Record<string, string> = {};
    for (const [k, v] of Object.entries(answers)) {
      flat[k] = v.join(", ");
    }
    return flat;
  }, []);

  // Select an option — auto-advances after brief pause
  const handleOptionSelect = useCallback((questionId: string, option: string) => {
    const current = selectedAnswers[questionId] ?? [];
    const isDeselecting = current.includes(option);
    const newSelection = isDeselecting
      ? current.filter((o) => o !== option)
      : [...current, option];

    const newAnswers = { ...selectedAnswers, [questionId]: newSelection };
    setSelectedAnswers(newAnswers);

    // Auto-advance after selecting (not deselecting)
    if (!isDeselecting) {
      setTimeout(() => {
        if (currentQIdx < questions.length - 1) {
          setCurrentQIdx((i) => i + 1);
        } else {
          setButtonRect(sendButtonRef.current?.getBoundingClientRect() ?? null);
          setShowTakeoff(true);
          planner.submitAnswers(flattenAnswers(newAnswers));
        }
      }, 600);
    }
  }, [selectedAnswers, currentQIdx, questions.length, planner, flattenAnswers]);

  // Advance to next question or submit
  const handleNextQuestion = useCallback(() => {
    if (currentQIdx < questions.length - 1) {
      setCurrentQIdx((i) => i + 1);
    } else {
      // All questions done — submit
      setButtonRect(sendButtonRef.current?.getBoundingClientRect() ?? null);
      setShowTakeoff(true);
      planner.submitAnswers(flattenAnswers(selectedAnswers));
    }
  }, [currentQIdx, questions.length, planner, selectedAnswers, flattenAnswers]);

  // Skip this question entirely
  const handleSkipQuestion = useCallback(() => {
    if (currentQIdx < questions.length - 1) {
      setCurrentQIdx((i) => i + 1);
    } else {
      setButtonRect(sendButtonRef.current?.getBoundingClientRect() ?? null);
      setShowTakeoff(true);
      planner.submitAnswers(flattenAnswers(selectedAnswers));
    }
  }, [currentQIdx, questions.length, planner, selectedAnswers, flattenAnswers]);

  // Handle keyboard shortcuts for options (A-E to toggle, Enter to advance, S to skip)
  useEffect(() => {
    if (!isClarifying || !currentQuestion) return;
    const handler = (e: KeyboardEvent) => {
      const opts = currentQuestion.options;
      let idx = -1;
      if (e.key >= '1' && e.key <= '5') idx = parseInt(e.key) - 1;
      else if (e.key.toLowerCase() >= 'a' && e.key.toLowerCase() <= 'e') idx = e.key.toLowerCase().charCodeAt(0) - 97;
      if (idx >= 0 && idx < opts.length) {
        handleOptionSelect(currentQuestion.id, opts[idx]);
      }
      if (e.key === 'Enter') handleNextQuestion();
      if (e.key.toLowerCase() === 's' && e.ctrlKey) { e.preventDefault(); handleSkipQuestion(); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isClarifying, currentQuestion, handleOptionSelect, handleNextQuestion, handleSkipQuestion]);

  const handleConvReset = useCallback(() => {
    planner.reset();
    setCurrentQIdx(0);
    setSelectedAnswers({});
    setShowQuestions(false);
    setTripQuery("");
    setTimeout(() => inputRef.current?.focus(), 50);
  }, [planner, setTripQuery]);

  const onSearch = () => {
    const val = tripQuery.trim();
    if (!val) return;
    skipQuestionsRef.current = true;
    planner.submitPrompt(val);
    setTripQuery("");
  };

  const onRefine = () => {
    const val = tripQuery.trim();
    if (!val) return;
    skipQuestionsRef.current = false;
    setShowQuestions(true);
    planner.submitPrompt(val);
    setTripQuery("");
  };

  const [loadingError, setLoadingError] = useState<string | null>(null);
  const [takeoffCompleted, setTakeoffCompleted] = useState(false);
  const isSaving = useRef(false);
  const user = useAuthStore((s) => s.user);

  // Show takeoff when planning starts
  useEffect(() => {
    if (planner.state.phase === 'planning' && !showTakeoff) {
      setButtonRect(sendButtonRef.current?.getBoundingClientRect() ?? null);
      setShowTakeoff(true);
      setLoadingError(null);
      setTakeoffCompleted(false);
    }
    if (planner.state.phase === 'error' && showTakeoff) {
      setLoadingError(planner.state.message);
    }
  }, [planner.state.phase]);

  // When plan completes — save if logged in, otherwise store for preview
  useEffect(() => {
    if (planner.state.phase !== 'complete' || isSaving.current) return;
    isSaving.current = true;
    const plan = planner.state.plan;

    (async () => {
      if (!plan?.extracted) {
        setShowTakeoff(false);
        isSaving.current = false;
        router.push("/trips");
        return;
      }

      if (user) {
        // Logged in — save to Supabase via shared helper, then redirect
        try {
          const tripId = await savePlanToSupabase(plan as any);
          setTakeoffCompleted(true);
          await new Promise((r) => setTimeout(r, 800));
          setShowTakeoff(false);
          planner.reset();
          isSaving.current = false;
          router.push(`/trip/${tripId}`);
        } catch (err) {
          const msg = err instanceof Error ? err.message : 'Failed to save trip';
          console.error('Save failed:', msg);
          setLoadingError(msg);
          isSaving.current = false;
        }
      } else {
        // Not logged in — two-step save to stay under CloudFront WAF body limit
        // Step 1: Create trip with minimal data (~1KB)
        // Step 2: PATCH full trip_context via update endpoint (server-side, no WAF)
        try {
          const ext = plan.extracted;
          if (!ext?.destination) throw new Error('No destination extracted');
          const dest = ext.destination;
          const totalBudget = ext.daily_estimate_usd ? ext.daily_estimate_usd * ext.duration_days : null;

          // Step 1 — lightweight create
          const createRes = await fetch('/api/trips/create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              destination: `${dest.city}, ${dest.country}`,
              start_date: ext.dates.start,
              end_date: ext.dates.end,
              travelers: ext.travelers.count,
              budget: totalBudget,
              currency: 'USD',
            }),
          });
          if (!createRes.ok) {
            const errBody = await createRes.text().catch(() => '');
            console.error('[Trip Create] Step 1 failed:', createRes.status, errBody);
            throw new Error(`Create failed: ${createRes.status}`);
          }
          const trip = await createRes.json();
          const tripId = trip.id;

          // Track in localStorage for anonymous persistence
          try {
            const stored = localStorage.getItem('my-trip-ids');
            const ids: string[] = stored ? JSON.parse(stored) : [];
            if (!ids.includes(tripId)) ids.push(tripId);
            localStorage.setItem('my-trip-ids', JSON.stringify(ids));
          } catch {}

          // Step 2 — send full context via update (server-side, bypasses WAF)
          const seenIds = new Set<string>();
          const uniqueExplore = (plan.itinerary ?? []).flatMap((day: any) =>
            (day.slots ?? []).map((slot: any) => ({
              id: slot.poi.id,
              title: slot.poi.name,
              description: slot.poi.description || slot.poi.category,
              category: slot.poi.category,
              image: slot.poi.photo_url,
              tags: slot.poi.tags,
            }))
          ).filter((e: any) => {
            if (seenIds.has(e.id)) return false;
            seenIds.add(e.id);
            return true;
          });

          const weatherForecast = (plan.itinerary ?? [])
            .filter((d: any) => d.weather)
            .map((d: any) => ({
              day: new Date(d.date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short' }),
              date: d.date,
              high: d.weather.high_c,
              low: d.weather.low_c,
              condition: d.weather.condition,
              icon: d.weather.icon || '☀️',
            }));

          // Fire update + enrich in parallel — don't block navigation
          fetch('/api/trips/update', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              tripId,
              trip_context: {
                lat: dest.lat,
                lng: dest.lng,
                hero_images: plan.destination_photo_url ? [plan.destination_photo_url] : [],
                hero_image_url: plan.destination_photo_url,
                explore_items: uniqueExplore,
                hotels: (plan.hotels ?? []).map((h: any) => ({
                  id: `hotel-${h.name.replace(/\s+/g, '-').toLowerCase()}`,
                  name: h.name, category: 'Hotel', image: h.photo_url,
                  rating: h.rating, ratingCount: h.review_count,
                  price: h.price_per_night, totalPrice: h.total_price,
                  currency: h.currency, stars: h.stars, amenities: h.amenities,
                  address: h.address, link: h.link, lat: h.lat, lng: h.lng,
                })),
                all_hotels: ((plan as any).data?.hotels ?? []).slice(0, 8).map((h: any) => ({
                  id: `hotel-${h.name?.replace(/\s+/g, '-').toLowerCase()}`,
                  name: h.name, image: h.photo_url, rating: h.rating,
                  price: h.price_per_night, stars: h.stars, address: h.address, link: h.link,
                })),
                events: ((plan as any).data?.events ?? []).slice(0, 5).map((e: any) => ({
                  id: e.id || `event-${e.name?.replace(/\s+/g, '-').toLowerCase()}`,
                  title: e.name, date: e.date, venue: e.venue, image: e.photo_url,
                })),
                foursquare_venues: ((plan as any).data?.pois ?? [])
                  .filter((p: any) => !seenIds.has(p.id)).slice(0, 10)
                  .map((p: any) => ({ id: p.id, name: p.name, category: p.category, image: p.photo_url, rating: p.rating })),
                weather: weatherForecast.length > 0 ? {
                  forecast: weatherForecast,
                  current: weatherForecast[0] ? { high: weatherForecast[0].high, low: weatherForecast[0].low, condition: weatherForecast[0].condition } : undefined,
                } : undefined,
                quick_facts: {
                  currency: ext.budget_level ? `${ext.budget_level} (~$${ext.daily_estimate_usd}/day)` : undefined,
                  timezone: (plan as any).timezone,
                },
                lede_text: `A ${ext.duration_days}-day trip to ${dest.city}.`,
                itinerary: (plan.itinerary ?? []).map((day: any) => ({
                  day: day.day, date: day.date, weather: day.weather,
                  slots: (day.slots ?? []).map((slot: any) => ({
                    poi: slot.poi, start_time: slot.start_time, end_time: slot.end_time,
                    start_time_12h: slot.start_time_12h, end_time_12h: slot.end_time_12h,
                    travel_from_prev_min: slot.travel_from_prev_min,
                  })),
                })),
              },
              hotels: (plan.hotels ?? []).slice(0, 5),
              flights: (plan.flights ?? []).slice(0, 5),
            }),
          }).catch((e) => console.error('[Trip Update] Failed:', e));

          fetch('/api/trips/enrich', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tripId }),
          }).catch(() => {});

          setTakeoffCompleted(true);
          await new Promise((r) => setTimeout(r, 800));
          setShowTakeoff(false);
          planner.reset();
          isSaving.current = false;
          router.push(`/trip/${tripId}`);
        } catch (saveErr) {
          console.error('[Trip Create] Failed:', saveErr);
          setLoadingError(saveErr instanceof Error ? saveErr.message : 'Failed to save trip');
          setShowTakeoff(false);
          isSaving.current = false;
        }
      }
    })();
  }, [planner.state.phase]);

  const plannerStatusMessage = useMemo(() => {
    switch (planner.state.phase) {
      case 'extracting': return 'Understanding your trip...';
      case 'planning': return 'Building your perfect itinerary...';
      case 'complete': return 'Saving your trip...';
      default: return undefined;
    }
  }, [planner.state.phase]);

  return (
    <div className="flex flex-col min-h-[calc(100vh-4rem)] -mt-16">
      {/* ─── Hero Section ─────────────────────────────────────── */}
      <section className="relative flex items-center justify-center px-6 pt-36 pb-0 md:pt-44 md:pb-0 overflow-hidden min-h-screen bg-[#e8d5c0]">
        {/* Slideshow background */}
        <motion.div className="absolute top-0 left-0 right-0 -bottom-[150px] z-0 will-change-transform" style={{ scale: heroBgScale, y: heroBgY }}>
          {heroSlides.map((src, i) => (
            <img
              key={`hero-${i}`}
              src={src}
              alt=""
              width={1600}
              height={900}
              loading={i === 0 ? "eager" : "lazy"}
              fetchPriority={i === 0 ? "high" : "low"}
              decoding={i === 0 ? "sync" : "async"}
              className="absolute inset-0 w-full h-full object-cover transition-opacity duration-[1500ms] ease-in-out"
              style={{ opacity: heroSlide % heroSlides.length === i ? 1 : 0 }}
            />
          ))}
        </motion.div>
        {/* Dark overlay for text contrast */}
        <div className="absolute inset-0 z-[1] bg-gradient-to-b from-black/40 via-black/30 to-black/50" />

        <motion.div
          className="relative z-10 max-w-3xl mx-auto text-center w-full"
          style={{ y: heroTextY, opacity: heroTextOpacity }}
        >
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2, ease: EASE_OUT_EXPO }}
            className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-serif font-normal text-white mb-4 leading-tight tracking-wide"
          >
            {heroConfig?.title ?? "Explore the world from one place."}
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.4, ease: EASE_OUT_EXPO }}
            className="text-xs sm:text-sm md:text-base text-white mb-10 w-fit mx-auto font-medium px-4 py-1.5 rounded-full bg-black/25 backdrop-blur-md border border-white/25 shadow-lg drop-shadow-md"
          >
            {heroConfig?.subtitle ? (
              <TypeWriter text={heroConfig.subtitle} delay={600} speed={35} />
            ) : (
              <CyclingSubtitle />
            )}
          </motion.p>

          {/* Search Bar */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.6, ease: EASE_OUT_EXPO }}
            className="max-w-2xl mx-auto"
          >
            {/* Answered options summary */}
            {isClarifying && Object.keys(selectedAnswers).length > 0 && (
              <div className="mb-3 animate-[fadeSlideIn_0.3s_ease-out]">
                <div className="bg-black/30 backdrop-blur-md rounded-2xl px-5 py-2.5 border border-white/15 shadow-lg">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm text-white/80 truncate">
                      {Object.values(selectedAnswers).map((v) => v.join(", ")).join(" · ")}
                    </p>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {questions.map((_, i) => (
                        <div
                          key={i}
                          className="w-1.5 h-1.5 rounded-full transition-all duration-300"
                          style={{
                            background: i < currentQIdx ? "rgba(255,255,255,0.7)" : i === currentQIdx ? "white" : "rgba(255,255,255,0.2)",
                          }}
                        />
                      ))}
                      <button
                        onClick={handleConvReset}
                        className="ml-1.5 p-1 rounded-full hover:bg-white/15 text-white/50 hover:text-white/80 transition-colors"
                        title="Start over"
                      >
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Loading state while extracting */}
            {(isExtracting || isPlanning) && (
              <div className="mb-3 animate-[fadeSlideIn_0.3s_ease-out]">
                <div className="bg-black/30 backdrop-blur-md rounded-full px-6 py-3 border border-white/15 flex items-center justify-center gap-3 shadow-lg">
                  <p className="text-white text-sm font-medium drop-shadow-sm">
                    {isExtracting ? "Understanding your trip..." : "Building your itinerary..."}
                  </p>
                  <div className="flex gap-1 shrink-0">
                    {[0, 1, 2].map((i) => (
                      <div
                        key={i}
                        className="w-1.5 h-1.5 rounded-full bg-white/60 animate-pulse"
                        style={{ animationDelay: `${i * 200}ms` }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Error state */}
            {planner.state.phase === 'error' && (
              <div className="mb-3 animate-[fadeSlideIn_0.3s_ease-out]">
                <div className="bg-red-500/20 backdrop-blur-md rounded-full px-5 py-2.5 border border-red-400/30 flex items-center justify-between gap-3 shadow-lg">
                  <p className="text-sm text-white">{planner.state.message}</p>
                  <button onClick={handleConvReset} className="text-white/70 hover:text-white text-xs font-medium">Try again</button>
                </div>
              </div>
            )}

            {/* Search bar — hidden during questions */}
            {!(isClarifying && showQuestions) && (
              <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
                <div className="flex items-center p-1.5 gap-2">
                  <HeroSearchInput
                    tripQuery={tripQuery}
                    setTripQuery={setTripQuery}
                    onSearch={onSearch}
                    staticPlaceholder={heroConfig?.search_placeholder}
                    inputRef={inputRef}
                  />
                  <button
                    onClick={onRefine}
                    disabled={isExtracting || isPlanning || !tripQuery.trim()}
                    className="text-[#1e3a5f]/70 hover:text-[#1e3a5f] hover:bg-[#1e3a5f]/8 disabled:opacity-0 disabled:pointer-events-none px-3 py-2.5 rounded-xl text-xs font-medium transition-all duration-200 flex items-center gap-1.5 shrink-0 border border-transparent hover:border-[#1e3a5f]/15"
                    title="Answer a few questions for a more personalized trip"
                  >
                    <Sparkles size={14} />
                    <span className="hidden sm:inline">Refine</span>
                  </button>
                  <button
                    ref={sendButtonRef}
                    onClick={onSearch}
                    disabled={isExtracting || isPlanning}
                    className="bg-[#1e3a5f] hover:bg-[#162d4a] disabled:opacity-50 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors flex items-center gap-2 shrink-0"
                  >
                    <PaperPlane size={16} />
                  </button>
                </div>
              </div>
            )}

            {/* Questions — only shown if user clicked Refine */}
            {isClarifying && showQuestions && currentQuestion && (
              <div className="mt-4 animate-[fadeSlideIn_0.3s_ease-out]">
                <div className="bg-black/30 backdrop-blur-md rounded-2xl p-4 border border-white/15 shadow-lg">
                  <div className="flex items-center gap-2 mb-3">
                    <Sparkles size={14} className="text-white/60" />
                    <p className="text-sm text-white font-semibold">{currentQuestion.question}</p>
                    <span className="ml-auto text-[10px] text-white/40 font-medium shrink-0">
                      {currentQIdx + 1}/{questions.length}
                    </span>
                  </div>
                  <div className="grid gap-2">
                    {currentQuestion.options.map((opt, i) => (
                      <OptionCard
                        key={opt}
                        label={opt}
                        index={i}
                        selected={(selectedAnswers[currentQuestion.id] ?? []).includes(opt)}
                        onSelect={() => handleOptionSelect(currentQuestion.id, opt)}
                      />
                    ))}
                  </div>
                  {/* Type your own answer */}
                  <form
                    className="mt-2"
                    onSubmit={(e) => {
                      e.preventDefault();
                      const input = (e.target as HTMLFormElement).elements.namedItem('custom') as HTMLInputElement;
                      const val = input?.value?.trim();
                      if (val) {
                        handleOptionSelect(currentQuestion.id, val);
                        input.value = '';
                      }
                    }}
                  >
                    <input
                      name="custom"
                      type="text"
                      placeholder="Or type your own..."
                      className="w-full px-4 py-2.5 rounded-xl bg-white/10 border border-white/15 text-sm text-white placeholder-white/30 focus:outline-none focus:ring-1 focus:ring-white/30"
                    />
                  </form>
                  {/* Plan it now — escape hatch */}
                  <button
                    onClick={() => {
                      setButtonRect(sendButtonRef.current?.getBoundingClientRect() ?? null);
                      setShowTakeoff(true);
                      planner.submitAnswers(flattenAnswers(selectedAnswers));
                    }}
                    className="w-full mt-3 text-[11px] text-white/40 hover:text-white/70 transition-colors py-1.5 text-center"
                  >
                    Done? Plan my trip with what I&apos;ve picked →
                  </button>
                </div>
              </div>
            )}

            {/* Suggestion Pills — only show when idle */}
            {planner.state.phase === 'idle' && allSuggestions.length > 0 && (
              <div className="flex justify-center gap-1.5 sm:gap-2 mt-4 h-[36px]">
                <div
                  key={pillGroup}
                  className="flex justify-center gap-1.5 sm:gap-2 animate-[fadeSlideIn_0.4s_ease-out]"
                >
                  {visiblePills.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => {
                        skipQuestionsRef.current = true;
                        planner.submitPrompt(`Plan a trip to ${s.label}`);
                      }}
                      className="text-[10px] sm:text-xs text-white font-medium border border-white/40 rounded-full px-2 sm:px-3 py-1 sm:py-1.5 hover:bg-white/20 transition-colors backdrop-blur-sm bg-white/10 shadow-sm drop-shadow-sm whitespace-nowrap"
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </motion.div>

          {/* Scroll indicator */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.5, duration: 0.8 }}
            className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
          >
            <div className="w-5 h-8 rounded-full border-2 border-white/40 flex items-start justify-center pt-1.5">
              <div className="w-1 h-1.5 rounded-full bg-white/70 animate-[scrollDot_1.5s_ease-in-out_infinite]" />
            </div>
            <span className="text-white/40 text-[9px] font-medium uppercase tracking-widest">Scroll</span>
          </motion.div>
          <style>{`@keyframes scrollDot { 0%, 100% { transform: translateY(0); opacity: 1; } 50% { transform: translateY(8px); opacity: 0.3; } }`}</style>
        </motion.div>
      </section>

      {/* ─── Trip Statistics — Live from Supabase ────────────── */}
      <LiveStats />


      {/* ─── Static Content Sections ──────────────────────────── */}
      <HowItWorks onCtaPress={() => router.push("/trips")} />
      {/* ─── Parallax Divider — cycling quotes + images ─────── */}
      <ParallaxQuoteDivider bgY={dividerBgY} trendingDestinations={trendingDestinations} />

      <GetInspired />
      <TagUs />

      {/* ─── Ocean Wave ─────────────────────────────────────── */}
      <OceanWave />

      {/* ─── Footer ─────────────────────────────────────────── */}
      <Footer />


      {/* ─── Takeoff Animation Overlay ─────────────────────────── */}
      <TakeoffTransition
        visible={showTakeoff}
        buttonRect={buttonRect}
        statusMessage={plannerStatusMessage}
        completed={takeoffCompleted}
        error={loadingError}
        onRetry={() => {
          setShowTakeoff(false);
          setLoadingError(null);
          setTakeoffCompleted(false);
          planner.reset();
          isSaving.current = false;
        }}
        onComplete={() => {}}
      />
    </div>
  );
}
