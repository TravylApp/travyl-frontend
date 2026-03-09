"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import {
  useHomeScreen,
  useHeroConfig,
  EASE_OUT_EXPO,
} from "@travyl/shared";
import { Search, ArrowRight, MapPin, Calendar, Users } from "lucide-react";
import { PaperPlane } from "@/components/icons/PaperPlane";
import {
  HowItWorks,
  QuickSteps,
  GetInspired,
  TravelMosaic,
  ExplorePreview,
  TagUs,
  OceanWave,
  TakeoffTransition,
  Footer,
  AppDownload,
} from "@/components/home";
import { GlassPill } from "@/components/ui";

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

  const onSearch = () => {
    if (handleSearch()) {
      setButtonRect(sendButtonRef.current?.getBoundingClientRect() ?? null);
      setShowTakeoff(true);
    }
  };

  return (
    <div className="flex flex-col min-h-[calc(100vh-4rem)]">
      {/* ─── Hero Section ─────────────────────────────────────── */}
      <section className="relative flex items-center justify-center px-6 py-24 md:py-32 overflow-hidden">
        <img
          src={heroConfig?.background_image_url ?? "https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=1920&fit=crop"}
          alt=""
          className="absolute inset-0 w-full h-full object-cover z-0"
        />
        <div className="absolute inset-0 z-0 bg-gradient-to-b from-black/50 via-black/30 to-black/60" />

        <div className="relative z-10 max-w-3xl mx-auto text-center w-full">
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
            className="text-base sm:text-lg md:text-xl text-white/90 mb-10 max-w-2xl mx-auto"
          >
            {heroConfig?.subtitle ?? "Type your dream trip and let us plan it for you"}
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
                  className="bg-primary hover:opacity-90 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-opacity flex items-center gap-2 shrink-0"
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
      <QuickSteps />
      <HowItWorks onCtaPress={() => router.push("/trips")} />
      <TravelMosaic />
      <AppDownload />
      <GetInspired />
      <ExplorePreview />
      <TagUs />

      {/* ─── Ocean Wave ─────────────────────────────────────── */}
      <OceanWave />

      {/* ─── Footer ─────────────────────────────────────────── */}
      <Footer />

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
