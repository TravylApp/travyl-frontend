"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, useScroll, useTransform, AnimatePresence } from "motion/react";
import { Search, ArrowRight, MapPin, Calendar, Users } from "lucide-react";
import { useHomeScreen, useHeroConfig, EASE_OUT_EXPO } from "@travyl/shared";
import type { PlaceItem } from "@travyl/shared";
import { PaperPlane } from "@/components/icons/PaperPlane";
import { AnimatedCounter } from "@/components/AnimatedCounter";
import { TypeWriter } from "@/components/TypeWriter";
import { useCyclingPlaceholder } from "@/hooks/useCyclingPlaceholder";
import {
  HowItWorks,
  GetInspired,
  TravelMosaic,
  ExplorePreview,
  TagUs,
  OceanWave,
  TakeoffTransition,
  Footer,
  ParallaxQuoteDivider,
} from "@/components/home";
import { PlaceDetailOverlay } from "@/components/PlaceDetailOverlay";

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
  const [selectedPlace, setSelectedPlace] = useState<PlaceItem | null>(null);

  const PLACEHOLDER_PHRASES = [
    "7 days in Paris with my partner...",
    "A week in Tokyo exploring street food...",
    "Family beach vacation in Bali...",
    "Weekend getaway to the Swiss Alps...",
    "Solo backpacking through Southeast Asia...",
  ];
  const typingPlaceholder = useCyclingPlaceholder(PLACEHOLDER_PHRASES);

  // Cycling subtitle phrases
  const SUBTITLE_PHRASES = [
    "Type your dream trip and let us plan it for you",
    "Discover hidden gems around the world",
    "Your next adventure starts with a single search",
    "From idea to itinerary in seconds",
    "Tell us where you want to go",
  ];
  const cyclingSubtitle = useCyclingPlaceholder(SUBTITLE_PHRASES, 40, 2500, 25);

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

  // Hero slideshow — use API image if available, otherwise cycle defaults
  const FALLBACK_SLIDES = [
    "https://images.unsplash.com/photo-1510414842594-a61c69b5ae57?w=1600&fit=crop",
  ];
  const heroSlides = heroConfig?.background_image_url
    ? [heroConfig.background_image_url]
    : FALLBACK_SLIDES;

  useEffect(() => {
    if (heroSlides.length <= 1) return;
    const interval = setInterval(() => {
      setHeroSlide((prev) => (prev + 1) % heroSlides.length);
    }, 6000);
    return () => clearInterval(interval);
  }, [heroSlides.length]);

  const onSearch = () => {
    if (handleSearch()) {
      setButtonRect(sendButtonRef.current?.getBoundingClientRect() ?? null);
      setShowTakeoff(true);
    }
  };

  return (
    <div className="flex flex-col min-h-[calc(100vh-4rem)] -mt-16">
      {/* ─── Hero Section ─────────────────────────────────────── */}
      <section ref={heroRef} className="relative flex items-center justify-center px-6 pt-36 pb-0 md:pt-44 md:pb-0 overflow-hidden min-h-screen bg-[#e8d5c0]">
        {/* Slideshow background */}
        <motion.div className="absolute top-0 left-0 right-0 -bottom-[150px] z-0" style={{ scale: heroBgScale, y: heroBgY }}>
          {heroSlides.map((src, i) => (
            <img
              key={src}
              src={src}
              alt=""
              className="absolute inset-0 w-full h-full object-cover transition-opacity duration-[1500ms] ease-in-out"
              style={{ opacity: heroSlide % heroSlides.length === i ? 1 : 0 }}
            />
          ))}
        </motion.div>

        <motion.div
          className="relative z-10 max-w-3xl mx-auto text-center w-full"
          style={{ y: heroTextY, opacity: heroTextOpacity }}
        >
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2, ease: EASE_OUT_EXPO }}
            className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black text-white mb-4 leading-tight"
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
              <>{cyclingSubtitle}<span className="animate-pulse">|</span></>
            )}
          </motion.p>

          {/* Search Bar */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.6, ease: EASE_OUT_EXPO }}
            className="max-w-2xl mx-auto"
          >
            <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
              <div className="flex items-center p-1.5 gap-2">
                <div className="flex-1 flex items-center gap-3 px-4 min-w-0">
                  <Search className="text-gray-400 shrink-0" size={18} />
                  <input
                    type="text"
                    value={tripQuery}
                    onChange={(e) => setTripQuery(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && onSearch()}
                    placeholder={tripQuery ? "" : (heroConfig?.search_placeholder ?? typingPlaceholder)}
                    className="flex-1 py-2 text-sm text-gray-900 outline-none placeholder:text-gray-400 min-w-0"
                  />
                </div>
                <button
                  ref={sendButtonRef}
                  onClick={onSearch}
                  className="bg-[#1e3a5f] hover:bg-[#162d4a] text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors flex items-center gap-2 shrink-0"
                >
                  <PaperPlane size={16} />
                </button>
              </div>
            </div>

            {/* Suggestion Pills — cycling groups */}
            <div className="flex justify-center gap-1.5 sm:gap-2 mt-4 h-[36px]">
              <AnimatePresence mode="wait">
                <motion.div
                  key={pillGroup}
                  className="flex justify-center gap-1.5 sm:gap-2"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.4 }}
                >
                  {visiblePills.map((s) => (
                    <motion.button
                      key={s.id}
                      onClick={() => setTripQuery(s.label)}
                      className="text-[10px] sm:text-xs text-white font-medium border border-white/40 rounded-full px-2 sm:px-3 py-1 sm:py-1.5 hover:bg-white/20 transition-colors backdrop-blur-sm bg-white/10 shadow-sm drop-shadow-sm whitespace-nowrap"
                    >
                      {s.label}
                    </motion.button>
                  ))}
                </motion.div>
              </AnimatePresence>
            </div>
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
          ].map((item, i) => (
            <motion.div
              key={item.label}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.6, delay: i * 0.15, ease: EASE_OUT_EXPO }}
            >
              <p className="text-2xl sm:text-4xl md:text-5xl font-[550] tracking-tight mb-1 text-[#2a1f17]">
                <AnimatedCounter value={item.value} suffix={item.suffix} decimals={item.decimals} />
              </p>
              <p className="text-[8px] sm:text-xs font-bold uppercase tracking-widest mb-1 sm:mb-2 text-[#5c4a3a]">{item.label}</p>
              <p className="text-[11px] sm:text-sm max-w-[220px] mx-auto leading-snug sm:leading-relaxed text-[#3d2f23]">{item.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ─── Recent Trips (logged-in users) ───────────────────── */}
      {showRecentTrips && (
        <section className="py-12 px-6">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-foreground">
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
              {recentTrips.map((trip) => (
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
            <h2 className="text-xl font-bold text-foreground mb-2">
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
      <TravelMosaic />

      {/* ─── Parallax Divider — cycling quotes + images ─────── */}
      <ParallaxQuoteDivider ref={dividerRef} bgY={dividerBgY} />

      <GetInspired />
      <TagUs />
      <ExplorePreview onItemClick={(item) => setSelectedPlace(item)} />

      {/* ─── Ocean Wave ─────────────────────────────────────── */}
      <OceanWave />

      {/* ─── Footer ─────────────────────────────────────────── */}
      <Footer />

      {/* ─── Place Detail Overlay ────────────────────────────── */}
      <AnimatePresence>
        {selectedPlace && (
          <PlaceDetailOverlay
            place={selectedPlace}
            onClose={() => setSelectedPlace(null)}
            onNavigate={(p) => setSelectedPlace(p)}
          />
        )}
      </AnimatePresence>

      {/* ─── Takeoff Animation Overlay ─────────────────────────── */}
      <TakeoffTransition
        visible={showTakeoff}
        buttonRect={buttonRect}
        onComplete={() => {
          setShowTakeoff(false);
          router.push("/trips");
        }}
      />
    </div>
  );
}
