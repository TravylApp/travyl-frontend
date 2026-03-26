"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, useScroll, useTransform, AnimatePresence } from "motion/react";
import { Search, ArrowRight, MapPin, Calendar, Users, Sparkles } from "lucide-react";
import { useHomeScreen, useHeroConfig, usePlaceImages, useTripPlanner, useAuthStore, EASE_OUT_EXPO } from "@travyl/shared";
import type { FollowUpQuestion, PlanResponse, PlaceItem } from "@travyl/shared";
import { PlaceDetailOverlay } from "@/components/PlaceDetailOverlay";
import { savePlanToSupabase } from "@travyl/shared/src/services/api";
import { PaperPlane } from "@/components/icons/PaperPlane";
import { AnimatedCounter } from "@/components/AnimatedCounter";
import { TypeWriter } from "@/components/TypeWriter";
import { useCyclingPlaceholder, useCyclingPlaceholderRef } from "@/hooks/useCyclingPlaceholder";
import {
  HowItWorks,
  GetInspired,
  TravelMosaic,
  TagUs,
  OceanWave,
  TakeoffTransition,
  Footer,
  ParallaxQuoteDivider,
} from "@/components/home";
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
          ? "bg-[#1e3a5f] text-white shadow-md"
          : "bg-white/10 text-white/80 hover:bg-white/20 border border-white/15"
      }`}
    >
      <span className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${
        selected ? "bg-white/20 text-white" : "bg-white/10 text-white/50"
      }`}>
        {keys[index] || index + 1}
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
    handleSearch,
    recentTrips,
    showRecentTrips,
    showLoadingSkeleton,
    showEmptyState,
  } = useHomeScreen();
  const { data: heroConfig } = useHeroConfig();

  const heroRef = useRef<HTMLElement>(null);
  const sendButtonRef = useRef<HTMLButtonElement>(null);
  const [showTakeoff, setShowTakeoff] = useState(false);
  const [buttonRect, setButtonRect] = useState<DOMRect | null>(null);
  const [heroSlide, setHeroSlide] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // API-driven planning flow
  const planner = useTripPlanner();
  const [currentQIdx, setCurrentQIdx] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>({});
  const planRef = useRef<PlanResponse | null>(null);

  const isClarifying = planner.state.phase === 'clarifying';
  const isExtracting = planner.state.phase === 'extracting';
  const isPlanning = planner.state.phase === 'planning';
  const questions: FollowUpQuestion[] = planner.state.phase === 'clarifying' ? planner.state.questions : [];
  const currentQuestion = questions[currentQIdx];

  // Cycling placeholders live in isolated memo components above
  // to avoid re-rendering the entire page every ~25ms

  // Cycling suggestion pills
  const allSuggestions = heroConfig?.suggestions?.length
    ? heroConfig.suggestions
    : [
        { id: 'ps-1', label: 'Beach getaway', short_label: null },
        { id: 'ps-2', label: 'City explorer', short_label: null },
        { id: 'ps-3', label: 'Mountain trek', short_label: null },
        { id: 'ps-4', label: 'Cultural immersion', short_label: null },
        { id: 'ps-5', label: 'Island hopping', short_label: null },
        { id: 'ps-6', label: 'Food & wine', short_label: null },
        { id: 'ps-7', label: 'Road trip', short_label: null },
        { id: 'ps-8', label: 'Backpacking', short_label: null },
      ];
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

  // Parallax transforms
  const { scrollYProgress: heroScroll } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"],
  });
  const heroTextY = useTransform(heroScroll, [0, 1], [0, 150]);
  const heroTextOpacity = useTransform(heroScroll, [0, 0.6], [1, 0]);
  const heroBgY = useTransform(heroScroll, [0, 1], [0, -120]);
  const heroBgScale = useTransform(heroScroll, [0, 1], [1, 1.15]);

  // Parallax divider
  const dividerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress: dividerScroll } = useScroll({
    target: dividerRef,
    offset: ["start end", "end start"],
  });
  const dividerBgY = useTransform(dividerScroll, [0, 1], [-80, 80]);

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

  // Handle selecting an answer option
  const handleOptionSelect = useCallback((questionId: string, option: string) => {
    const newAnswers = { ...selectedAnswers, [questionId]: option };
    setSelectedAnswers(newAnswers);

    // Auto-advance to next question after a brief pause
    if (currentQIdx < questions.length - 1) {
      setTimeout(() => setCurrentQIdx((i) => i + 1), 400);
    } else {
      // All questions answered — submit to plan
      setTimeout(() => {
        setButtonRect(sendButtonRef.current?.getBoundingClientRect() ?? null);
        setShowTakeoff(true);
        planner.submitAnswers(newAnswers);
      }, 600);
    }
  }, [selectedAnswers, currentQIdx, questions.length, planner]);

  // Handle keyboard shortcuts for options (1-5 or A-E)
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
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isClarifying, currentQuestion, handleOptionSelect]);

  const handleConvReset = useCallback(() => {
    planner.reset();
    setCurrentQIdx(0);
    setSelectedAnswers({});
    setTripQuery("");
    setTimeout(() => inputRef.current?.focus(), 50);
  }, [planner, setTripQuery]);

  const onSearch = () => {
    const val = tripQuery.trim();
    if (!val) return;
    // Send to backend for extraction
    planner.submitPrompt(val);
    setTripQuery("");
  };

  const [loadingError, setLoadingError] = useState<string | null>(null);
  const [takeoffCompleted, setTakeoffCompleted] = useState(false);
  const [selectedPlace, setSelectedPlace] = useState<PlaceItem | null>(null);
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
        // Not logged in — save to Supabase with planner data in trip_context
        // Not logged in — save to Supabase with planner data in trip_context
        // so the overview page has hotels, itinerary, budget immediately
        try {
          const ext = plan.extracted;
          if (!ext?.destination) throw new Error('No destination extracted');
          const dest = ext.destination;
          const totalBudget = ext.daily_estimate_usd ? ext.daily_estimate_usd * ext.duration_days : null;

          // Build explore_items from itinerary slots (attractions + restaurants)
          const exploreFromPlan = (plan.itinerary ?? []).flatMap((day: any) =>
            (day.slots ?? []).map((slot: any) => ({
              id: slot.poi.id,
              title: slot.poi.name,
              description: slot.poi.description || slot.poi.category,
              category: slot.poi.category,
              image: slot.poi.photo_url,
              tags: slot.poi.tags,
            }))
          );
          // Deduplicate by id
          const seenIds = new Set<string>();
          const uniqueExplore = exploreFromPlan.filter((e: any) => {
            if (seenIds.has(e.id)) return false;
            seenIds.add(e.id);
            return true;
          });

          // Build weather from itinerary day weather
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

          const res = await fetch('/api/trips/create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              destination: `${dest.city}, ${dest.country}`,
              start_date: ext.dates.start,
              end_date: ext.dates.end,
              travelers: ext.travelers.count,
              budget: totalBudget,
              currency: 'USD',
              trip_context: {
                lat: dest.lat,
                lng: dest.lng,
                hero_images: plan.destination_photo_url ? [plan.destination_photo_url] : [],
                hero_image_url: plan.destination_photo_url,
                explore_items: uniqueExplore,
                // Top 5 curated hotels from planner
                hotels: (plan.hotels ?? []).map((h: any) => ({
                  id: `hotel-${h.name.replace(/\s+/g, '-').toLowerCase()}`,
                  name: h.name,
                  category: 'Hotel',
                  image: h.photo_url,
                  rating: h.rating,
                  ratingCount: h.review_count,
                  price: h.price_per_night,
                  totalPrice: h.total_price,
                  currency: h.currency,
                  stars: h.stars,
                  amenities: h.amenities,
                  address: h.address,
                  link: h.link,
                  lat: h.lat,
                  lng: h.lng,
                })),
                // Top 8 hotels (trimmed to keep payload under CloudFront limit)
                all_hotels: ((plan as any).data?.hotels ?? []).slice(0, 8).map((h: any) => ({
                  id: `hotel-${h.name?.replace(/\s+/g, '-').toLowerCase()}`,
                  name: h.name,
                  image: h.photo_url,
                  rating: h.rating,
                  price: h.price_per_night,
                  stars: h.stars,
                  address: h.address,
                  link: h.link,
                })),
                // Top 5 events
                events: ((plan as any).data?.events ?? []).slice(0, 5).map((e: any) => ({
                  id: e.id || `event-${e.name?.replace(/\s+/g, '-').toLowerCase()}`,
                  title: e.name,
                  date: e.date,
                  venue: e.venue,
                  image: e.photo_url,
                })),
                // Top 10 POIs (trimmed from 40)
                foursquare_venues: ((plan as any).data?.pois ?? [])
                  .filter((p: any) => !seenIds.has(p.id))
                  .slice(0, 10)
                  .map((p: any) => ({
                    id: p.id,
                    name: p.name,
                    category: p.category,
                    image: p.photo_url,
                    rating: p.rating,
                  })),
                weather: weatherForecast.length > 0 ? {
                  forecast: weatherForecast,
                  current: weatherForecast[0] ? {
                    high: weatherForecast[0].high,
                    low: weatherForecast[0].low,
                    condition: weatherForecast[0].condition,
                  } : undefined,
                } : undefined,
                quick_facts: {
                  currency: ext.budget_level ? `${ext.budget_level} (~$${ext.daily_estimate_usd}/day)` : undefined,
                  timezone: (plan as any).timezone,
                },
                lede_text: `A ${ext.duration_days}-day trip to ${dest.city}.`,
                // Store full itinerary in trip_context so the itinerary page can render it
                itinerary: (plan.itinerary ?? []).map((day: any) => ({
                  day: day.day,
                  date: day.date,
                  weather: day.weather,
                  slots: (day.slots ?? []).map((slot: any) => ({
                    poi: slot.poi,
                    start_time: slot.start_time,
                    end_time: slot.end_time,
                    start_time_12h: slot.start_time_12h,
                    end_time_12h: slot.end_time_12h,
                    travel_from_prev_min: slot.travel_from_prev_min,
                  })),
                })),
              },
              // Pass trimmed plan data for API to save
              hotels: (plan.hotels ?? []).slice(0, 5),
              flights: (plan.flights ?? []).slice(0, 5),
            }),
          });
          if (!res.ok) {
            const errBody = await res.text().catch(() => '');
            console.error('[Trip Create] Failed:', res.status, errBody);
            throw new Error(`Save failed: ${res.status}`);
          }
          const trip = await res.json();
          // Track in localStorage for anonymous persistence
          try {
            const stored = localStorage.getItem('my-trip-ids');
            const ids: string[] = stored ? JSON.parse(stored) : [];
            if (!ids.includes(trip.id)) ids.push(trip.id);
            localStorage.setItem('my-trip-ids', JSON.stringify(ids));
          } catch {}
          // Enrich in background
          fetch('/api/trips/enrich', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tripId: trip.id }),
          }).catch(() => {});
          setTakeoffCompleted(true);
          await new Promise((r) => setTimeout(r, 800));
          setShowTakeoff(false);
          planner.reset();
          isSaving.current = false;
          router.push(`/trip/${trip.id}`);
        } catch (saveErr) {
          console.error('[Trip Create] API route failed, falling back to direct save:', saveErr);
          // Fallback: save directly to Supabase (bypasses CloudFront)
          try {
            const tripId = await savePlanToSupabase(plan as any);
            setTakeoffCompleted(true);
            await new Promise((r) => setTimeout(r, 800));
            setShowTakeoff(false);
            planner.reset();
            isSaving.current = false;
            router.push(`/trip/${tripId}`);
          } catch (fallbackErr) {
            console.error('[Trip Create] Fallback also failed:', fallbackErr);
            setLoadingError(fallbackErr instanceof Error ? fallbackErr.message : 'Failed to save trip');
            setShowTakeoff(false);
            isSaving.current = false;
          }
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
      <section ref={heroRef} className="relative flex items-center justify-center px-6 pt-36 pb-0 md:pt-44 md:pb-0 overflow-hidden min-h-screen bg-[#e8d5c0]">
        {/* Slideshow background */}
        <motion.div className="absolute top-0 left-0 right-0 -bottom-[150px] z-0 will-change-transform" style={{ scale: heroBgScale, y: heroBgY }}>
          {heroSlides.map((src, i) => (
            <img
              key={`hero-${i}`}
              src={src}
              alt=""
              width={1600}
              height={900}
              fetchPriority={i === 0 ? "high" : "low"}
              decoding={i === 0 ? "sync" : "async"}
              className="absolute inset-0 w-full h-full object-cover transition-opacity duration-[1500ms] ease-in-out"
              style={{ opacity: heroSlide % heroSlides.length === i ? 1 : 0 }}
            />
          ))}
        </motion.div>
        {/* Dark overlay for text contrast */}
        <div className="absolute inset-0 z-[1] bg-gradient-to-b from-black/30 via-black/20 to-black/40" />

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
            className="text-xs sm:text-sm md:text-base text-white mb-10 w-fit mx-auto font-medium px-4 py-1.5 rounded-full bg-white/10 backdrop-blur-sm border border-white/40 shadow-sm drop-shadow-sm"
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
                      {Object.values(selectedAnswers).join(" · ")}
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

            {/* Search bar */}
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
                  ref={sendButtonRef}
                  onClick={onSearch}
                  disabled={isExtracting || isPlanning}
                  className="bg-[#1e3a5f] hover:bg-[#162d4a] disabled:opacity-50 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors flex items-center gap-2 shrink-0"
                >
                  <PaperPlane size={16} />
                </button>
              </div>
            </div>

            {/* Follow-up questions — multiple choice cards */}
            {isClarifying && currentQuestion && (
              <div className="mt-4 animate-[fadeSlideIn_0.3s_ease-out]">
                <div className="bg-black/30 backdrop-blur-md rounded-2xl p-4 border border-white/15 shadow-lg">
                  <div className="flex items-center gap-2 mb-3">
                    <Sparkles size={14} className="text-white/60" />
                    <p className="text-sm text-white font-semibold">{currentQuestion.question}</p>
                    <span className="ml-auto text-[10px] text-white/40 font-medium">
                      {currentQIdx + 1}/{questions.length}
                    </span>
                  </div>
                  <div className="grid gap-2">
                    {currentQuestion.options.map((opt, i) => (
                      <OptionCard
                        key={opt}
                        label={opt}
                        index={i}
                        selected={selectedAnswers[currentQuestion.id] === opt}
                        onSelect={() => handleOptionSelect(currentQuestion.id, opt)}
                      />
                    ))}
                  </div>
                  <p className="text-[10px] text-white/30 mt-2 text-center">
                    Press {currentQuestion.options.map((_, i) => ["A","B","C","D","E"][i]).join("/")} to select
                  </p>
                </div>
              </div>
            )}

            {/* Suggestion Pills — only show when idle */}
            {planner.state.phase === 'idle' && (
              <div className="flex justify-center gap-1.5 sm:gap-2 mt-4 h-[36px]">
                <div
                  key={pillGroup}
                  className="flex justify-center gap-1.5 sm:gap-2 animate-[fadeSlideIn_0.4s_ease-out]"
                >
                  {visiblePills.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => setTripQuery(s.label)}
                      className="text-[10px] sm:text-xs text-white font-medium border border-white/40 rounded-full px-2 sm:px-3 py-1 sm:py-1.5 hover:bg-white/20 transition-colors backdrop-blur-sm bg-white/10 shadow-sm drop-shadow-sm whitespace-nowrap"
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        </motion.div>
      </section>

      {/* ─── Trip Statistics ───────────────────────────────────── */}
      <section className="py-8 sm:py-14 px-4 sm:px-6 border-y bg-[#e8d5c0] border-[#5c4a3a]">
        <div className="max-w-5xl mx-auto grid grid-cols-3 gap-3 sm:gap-8 text-center">
          {[
            { value: 500, suffix: "K+", decimals: 0, label: "Destinations", desc: "Discover unexpected gems, even in your own backyard." },
            { value: 95, suffix: "M+", decimals: 0, label: "Fellow Travelers", desc: "Share your adventures and learn from our global community." },
            { value: 2.0, suffix: "B+", decimals: 1, label: "Trips Planned", desc: "Navigate your way and keep a record of all your travels." },
          ].map((item) => (
            <div key={item.label}>
              <p className="text-2xl sm:text-4xl md:text-5xl font-[550] tracking-tight mb-1 text-[#2a1f17]">
                <AnimatedCounter value={item.value} suffix={item.suffix} decimals={item.decimals} />
              </p>
              <p className="text-[8px] sm:text-xs font-bold uppercase tracking-widest mb-1 sm:mb-2 text-[#1e3a5f]">{item.label}</p>
              <p className="text-[11px] sm:text-sm max-w-[220px] mx-auto leading-snug sm:leading-relaxed text-[#2a1f17]">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ─── Recent Trips (logged-in users) ───────────────────── */}
      {showRecentTrips && (
        <section className="py-12 px-6">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-serif font-normal text-foreground tracking-wide">
                Your Recent Trips
              </h2>
              <Link
                href="/trips"
                className="text-sm text-primary font-medium hover:underline flex items-center gap-1"
              >
                View all <ArrowRight size={14} />
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {recentTrips.map((trip: any) => (
                <Link
                  key={trip.id}
                  href={`/trip/${trip.id}`}
                  className="group block rounded-xl border border-border p-5 hover:shadow-md hover:border-primary/30 transition-all"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                        {trip.title}
                      </h3>
                      <div className="flex items-center gap-1 mt-1 text-sm text-muted-foreground">
                        <MapPin size={14} />
                        <span>{trip.destination}</span>
                      </div>
                    </div>
                    <span
                      className="text-xs px-2 py-0.5 rounded-full font-medium"
                      style={{
                        backgroundColor: trip.status.bgColor,
                        color: trip.status.textColor,
                      }}
                    >
                      {trip.status.label}
                    </span>
                  </div>

                  <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Calendar size={12} />
                      <span>{trip.dateRange.short}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Users size={12} />
                      <span>{trip.travelersLabel}</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ─── Loading Skeleton ──────────────────────────────────── */}
      {showLoadingSkeleton && (
        <section className="py-12 px-6">
          <div className="max-w-6xl mx-auto">
            <div className="h-7 w-48 bg-gray-200 rounded animate-pulse mb-6" />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="rounded-xl border border-border p-5 space-y-3"
                >
                  <div className="flex items-start justify-between">
                    <div className="space-y-2">
                      <div className="h-5 w-32 bg-gray-200 rounded animate-pulse" />
                      <div className="h-4 w-24 bg-gray-100 rounded animate-pulse" />
                    </div>
                    <div className="h-5 w-16 bg-gray-200 rounded-full animate-pulse" />
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="h-3 w-28 bg-gray-100 rounded animate-pulse" />
                    <div className="h-3 w-20 bg-gray-100 rounded animate-pulse" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ─── Empty State ─────────────────────────────────────── */}
      {showEmptyState && (
        <section className="py-16 px-6">
          <div className="max-w-md mx-auto text-center">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <PaperPlane className="text-primary -rotate-12" size={28} />
            </div>
            <h2 className="text-xl font-serif font-normal text-foreground mb-2 tracking-wide">
              No trips yet
            </h2>
            <p className="text-muted-foreground mb-6">
              Start planning your first adventure — type a destination in the
              search bar above or tap the button below.
            </p>
            <button
              onClick={() => router.push("/trips")}
              className="bg-primary text-white px-6 py-3 rounded-xl font-semibold text-sm hover:opacity-90 transition-opacity inline-flex items-center gap-2"
            >
              <PaperPlane size={16} className="-rotate-12" />
              Plan your first trip
            </button>
          </div>
        </section>
      )}

      {/* ─── Static Content Sections ──────────────────────────── */}
      <HowItWorks onCtaPress={() => router.push("/trips")} />
      <TravelMosaic onTileClick={(place) => setSelectedPlace(place)} />

      {/* ─── Parallax Divider — cycling quotes + images ─────── */}
      <ParallaxQuoteDivider ref={dividerRef} bgY={dividerBgY} />

      <GetInspired />
      <TagUs />

      {/* ─── Ocean Wave ─────────────────────────────────────── */}
      <OceanWave />

      {/* ─── Footer ─────────────────────────────────────────── */}
      <Footer />

      {/* ─── Place Detail Overlay ────────────────────────────── */}
      <AnimatePresence>
        {selectedPlace && (
          <PlaceDetailOverlay
            place={selectedPlace}
            isFavorited={false}
            onToggleFavorite={() => {}}
            onClose={() => setSelectedPlace(null)}
            onNavigate={(p) => setSelectedPlace(p)}
            onSearchTag={() => {}}
          />
        )}
      </AnimatePresence>

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
