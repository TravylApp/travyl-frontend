"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import {
  useHomeScreen,
  useHeroConfig,
  EASE_OUT_EXPO,
} from "@travyl/shared";
import { Search, ChevronLeft, ChevronRight } from "lucide-react";
import { PaperPlane } from "@/components/icons/PaperPlane";
import {
  StatsSection,
  BrowseByCategory,
  TopDestinations,
  SocialProof,
  AppFeatureSection,
  OceanWave,
  Footer,
  HowItWorksWing,
} from "@/components/home";
import { GlassPill } from "@/components/ui";

// Hero carousel images
const heroImages = [
  "https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=1920&fit=crop",
  "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=1920&fit=crop",
  "https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=1920&fit=crop",
  "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=1920&fit=crop",
];

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

  const sendButtonRef = useRef<HTMLButtonElement>(null);
  const [showTakeoff, setShowTakeoff] = useState(false);
  const [buttonRect, setButtonRect] = useState<DOMRect | null>(null);
  const [currentSlide, setCurrentSlide] = useState(0);

  // Auto-advance carousel
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % heroImages.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const onSearch = () => {
    if (handleSearch()) {
      setButtonRect(sendButtonRef.current?.getBoundingClientRect() ?? null);
      setShowTakeoff(true);
    }
  };

  const goToSlide = (index: number) => {
    setCurrentSlide((index + heroImages.length) % heroImages.length);
  };

  const goToPrevious = () => goToSlide(currentSlide - 1);
  const goToNext = () => goToSlide(currentSlide + 1);

  return (
    <div className="flex flex-col min-h-[calc(100vh-4rem)]">
      {/* ─── Hero Section with Carousel ─────────────────────────── */}
      <section className="relative flex items-center justify-center px-6 py-20 overflow-hidden h-screen group">
        {/* Carousel Background */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentSlide}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8 }}
            className="absolute inset-0 z-0"
          >
            <Image
              src={heroImages[currentSlide]}
              alt=""
              fill
              priority={currentSlide === 0}
              sizes="100vw"
              className="object-cover"
            />
          </motion.div>
        </AnimatePresence>
        <div className="absolute inset-0 z-0 bg-gradient-to-b from-black/50 via-black/30 to-black/60" />

        {/* Aurora Effect */}
        <div className="absolute inset-0 z-[1] overflow-hidden pointer-events-none">
          <div
            className="absolute -top-1/2 -left-1/2 w-[200%] h-[200%] opacity-30"
            style={{
              background: `
                radial-gradient(ellipse 80% 50% at 50% 50%, rgba(16, 185, 129, 0.3), transparent),
                radial-gradient(ellipse 60% 40% at 70% 60%, rgba(59, 130, 246, 0.2), transparent),
                radial-gradient(ellipse 50% 30% at 30% 40%, rgba(245, 158, 11, 0.15), transparent)
              `,
              animation: 'aurora 15s ease-in-out infinite alternate',
            }}
          />
        </div>

        {/* Carousel Arrow Navigation */}
        <button
          onClick={goToPrevious}
          className="absolute left-4 md:left-8 top-1/2 -translate-y-1/2 z-20 w-12 h-12 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 hover:bg-white/20 hover:scale-110"
          aria-label="Previous slide"
        >
          <ChevronLeft size={24} className="text-white" />
        </button>
        <button
          onClick={goToNext}
          className="absolute right-4 md:right-8 top-1/2 -translate-y-1/2 z-20 w-12 h-12 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 hover:bg-white/20 hover:scale-110"
          aria-label="Next slide"
        >
          <ChevronRight size={24} className="text-white" />
        </button>

        <div className="relative z-10 max-w-3xl mx-auto text-center w-full">
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2, ease: EASE_OUT_EXPO }}
            className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black text-white mb-4 leading-tight"
          >
            {heroConfig?.title ?? "Find your adventure"}
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.4, ease: EASE_OUT_EXPO }}
            className="text-base sm:text-lg md:text-xl text-white/90 mb-10 max-w-2xl mx-auto"
          >
            {heroConfig?.subtitle ?? "Search by city, country, or trip type to plan your perfect getaway"}
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
                    placeholder={heroConfig?.search_placeholder ?? "7 days in Paris with my partner..."}
                    className="flex-1 py-2 text-sm text-gray-900 outline-none placeholder:text-gray-400 min-w-0"
                  />
                </div>
                <button
                  ref={sendButtonRef}
                  onClick={onSearch}
                  className="bg-[#F59E0B] hover:bg-[#F59E0B]/90 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-all hover:shadow-lg hover:shadow-[#F59E0B]/25 flex items-center gap-2 shrink-0"
                >
                  <PaperPlane size={16} className="-rotate-12" />
                  <span className="hidden sm:inline">Plan Trip</span>
                </button>
              </div>
            </div>

            {/* Suggestion Pills */}
            {(() => {
              const suggestions = heroConfig?.suggestions?.length
                ? heroConfig.suggestions
                : [
                    { id: 'ps-1', label: 'Beach getaway', short_label: null },
                    { id: 'ps-2', label: 'City break', short_label: null },
                    { id: 'ps-3', label: 'Mountain retreat', short_label: null },
                    { id: 'ps-4', label: 'Cultural tour', short_label: null },
                  ];
              return (
                <div className="flex flex-wrap justify-center gap-2 mt-4">
                  {suggestions.map((s) => (
                    <GlassPill
                      key={s.id}
                      onClick={() => setTripQuery(s.label)}
                    >
                      {s.label}
                    </GlassPill>
                  ))}
                </div>
              );
            })()}
          </motion.div>

          {/* Carousel Navigation */}
          <div className="flex items-center justify-center gap-2 mt-8">
            {heroImages.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentSlide(idx)}
                className={`w-2 h-2 rounded-full transition-all ${
                  currentSlide === idx ? "bg-white w-6" : "bg-white/50 hover:bg-white/75"
                }`}
                aria-label={`Go to slide ${idx + 1}`}
              />
            ))}
          </div>
        </div>
      </section>

      {/* ─── Stats Section ───────────────────────────────────────── */}
      <StatsSection />

      {/* ─── How It Works (Wing-style) ──────────────────────────── */}
      <HowItWorksWing />

      {/* ─── Browse by Category ──────────────────────────────────── */}
      <BrowseByCategory />

      {/* ─── App Feature Section ─────────────────────────────────── */}
      <AppFeatureSection />

      {/* ─── Social Proof Section ────────────────────────────────── */}
      <SocialProof />

      {/* ─── Top Destinations ────────────────────────────────────── */}
      <TopDestinations />

      {/* ─── Ocean Wave ─────────────────────────────────────────── */}
      <OceanWave />

      {/* ─── Footer ─────────────────────────────────────────────── */}
      <Footer />

      {/* ─── Takeoff Animation Overlay ─────────────────────────── */}
      {showTakeoff && buttonRect && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={() => {
            setShowTakeoff(false);
            router.push("/trips");
          }}
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            className="text-white text-2xl font-bold"
          >
            <PaperPlane size={64} className="-rotate-12 animate-bounce" />
          </motion.div>
        </motion.div>
      )}
    </div>
  );
}
