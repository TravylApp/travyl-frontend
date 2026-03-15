"use client";

import { useState, useCallback, useEffect } from "react";
import { AnimatePresence, motion, type PanInfo } from "motion/react";
import Image from "next/image";
import { ChevronLeft, ChevronRight, Heart, Star, MapPin, Repeat, Clock, Globe, Lightbulb } from "lucide-react";
import { MOCK_PLACES, EASE_OUT_EXPO, Navy } from "@travyl/shared";
import type { PlaceItem } from "@travyl/shared";

const INSPIRED_PLACES = MOCK_PLACES.slice(0, 8);
const SWIPE_THRESHOLD = 80;

function InspirationCard({ place, isFront }: { place: PlaceItem; isFront: boolean }) {
  const [imgIdx, setImgIdx] = useState(0);
  const images = place.images?.length ? place.images : [place.image];

  const goNextImg = () => setImgIdx((i) => (i + 1) % images.length);
  const goPrevImg = () => setImgIdx((i) => (i === 0 ? images.length - 1 : i - 1));

  return (
    <div className="w-full h-full rounded-2xl overflow-hidden bg-black relative group">
      <Image
        src={images[imgIdx]}
        alt={place.name}
        fill
        className="object-cover"
        sizes="(max-width: 640px) 85vw, 380px"
        priority={isFront}
      />

      {/* Gradient */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />

      {/* Tap zones for image navigation (like Instagram stories) */}
      {images.length > 1 && isFront && (
        <>
          <button
            onClick={(e) => { e.stopPropagation(); goPrevImg(); }}
            className="absolute left-0 top-0 w-1/3 h-2/3 z-20"
            aria-label="Previous image"
          />
          <button
            onClick={(e) => { e.stopPropagation(); goNextImg(); }}
            className="absolute right-0 top-0 w-1/3 h-2/3 z-20"
            aria-label="Next image"
          />
        </>
      )}


      {/* Flip hint */}
      {isFront && (
        <div className="absolute bottom-3 right-3 z-30">
          <Repeat size={12} className="text-white/40" />
        </div>
      )}

      {/* Bottom content */}
      <div className="absolute bottom-0 left-0 right-0 p-5">
        <p className="font-bold uppercase tracking-wider text-[#7dd3fc] text-[10px] mb-1.5">
          {place.type}
        </p>
        <div className="flex items-center gap-2.5 mb-1.5">
          <h3 className="text-white font-extrabold text-xl leading-tight drop-shadow-md">
            {place.name}
          </h3>
          {place.rating != null && (
            <span className="flex items-center gap-1 bg-black/45 text-white rounded-lg px-2 py-0.5 shrink-0">
              <Star size={11} className="text-yellow-400 fill-yellow-400" />
              <span className="text-xs font-bold">{place.rating.toFixed(1)}</span>
            </span>
          )}
        </div>
        {place.tagline && (
          <div className="flex items-center gap-1 mb-2">
            <MapPin size={12} className="text-white/60 shrink-0" />
            <span className="text-sm text-white/60 truncate">{place.tagline}</span>
          </div>
        )}
        {place.description && (
          <p className="text-[13px] text-white/70 leading-snug line-clamp-2">
            {place.description}
          </p>
        )}
        {/* Image dots */}
        {images.length > 1 && isFront && (
          <div className="flex items-center justify-center gap-1.5 mt-3">
            {images.slice(0, 5).map((_, i) => (
              <button
                key={i}
                onClick={(e) => { e.stopPropagation(); setImgIdx(i); }}
                className={`rounded-full transition-all ${
                  i === imgIdx ? "w-5 h-1.5 bg-white" : "w-1.5 h-1.5 bg-white/50"
                }`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function InspirationCardBack({ place }: { place: PlaceItem }) {
  return (
    <div
      className="w-full h-full rounded-2xl overflow-hidden text-white"
      style={{ backgroundColor: Navy.DEFAULT }}
    >
      <div className="h-full overflow-y-auto p-5">
        {/* Header */}
        <p className="font-bold uppercase tracking-wider text-[#7dd3fc] text-[10px] mb-1">
          {place.type}
        </p>
        <h3 className="text-xl font-extrabold mb-1">{place.name}</h3>
        {place.tagline && (
          <div className="flex items-center gap-1 mb-3">
            <MapPin size={12} className="text-white/50 shrink-0" />
            <span className="text-sm text-white/50">{place.tagline}</span>
          </div>
        )}

        <div className="border-t border-white/10 pt-3 space-y-3">
          {/* Quick facts grid */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            {place.rating != null && (
              <div className="bg-white/10 rounded-lg p-2.5">
                <span className="text-white/50 block mb-0.5">Rating</span>
                <span className="font-bold flex items-center gap-1">
                  <Star size={10} className="text-yellow-400 fill-yellow-400" />
                  {place.rating.toFixed(1)}
                  {place.reviewCount && (
                    <span className="text-white/50 font-normal">({place.reviewCount.toLocaleString()})</span>
                  )}
                </span>
              </div>
            )}
            {place.priceLevel && (
              <div className="bg-white/10 rounded-lg p-2.5">
                <span className="text-white/50 block mb-0.5">Price</span>
                <span className="font-bold">
                  {"$".repeat(place.priceLevel)}
                  <span className="text-white/30">{"$".repeat(4 - place.priceLevel)}</span>
                </span>
              </div>
            )}
            {place.duration && (
              <div className="bg-white/10 rounded-lg p-2.5">
                <span className="text-white/50 block mb-0.5">Duration</span>
                <span className="font-bold">{place.duration}</span>
              </div>
            )}
            {place.bestTimeToVisit && (
              <div className="bg-white/10 rounded-lg p-2.5">
                <span className="text-white/50 block mb-0.5">Best Time</span>
                <span className="font-bold text-[10px] leading-tight">{place.bestTimeToVisit}</span>
              </div>
            )}
          </div>

          {/* Hours */}
          {place.hours && (
            <div className="flex items-start gap-2 text-xs">
              <Clock size={12} className="text-white/50 shrink-0 mt-0.5" />
              <span className="text-white/80">{place.hours}</span>
            </div>
          )}

          {/* Website */}
          {place.website && (
            <div className="flex items-center gap-2 text-xs">
              <Globe size={12} className="text-white/50 shrink-0" />
              <span className="text-[#7dd3fc] truncate">{place.website.replace(/^https?:\/\//, "")}</span>
            </div>
          )}

          {/* Description */}
          {place.description && (
            <p className="text-[13px] text-white/70 leading-snug">{place.description}</p>
          )}

          {/* Tips */}
          {place.tips?.length ? (
            <div className="text-xs space-y-1.5">
              <span className="text-white/50 font-medium flex items-center gap-1">
                <Lightbulb size={11} /> Tips
              </span>
              {place.tips.map((tip, i) => (
                <p key={i} className="text-white/70 text-[11px] leading-snug pl-4">• {tip}</p>
              ))}
            </div>
          ) : null}
        </div>

        {/* Flip hint */}
        <div className="text-center mt-4 pb-2">
          <Repeat size={12} className="text-white/40 inline-block" />
          <span className="text-white/40 text-[10px] ml-1">Tap to flip back</span>
        </div>
      </div>
    </div>
  );
}

export function GetInspired() {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [direction, setDirection] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const cards = INSPIRED_PLACES;

  // Reset flip when card changes
  useEffect(() => {
    setIsFlipped(false);
  }, [currentIdx]);

  const goNext = useCallback(() => {
    setDirection(1);
    setCurrentIdx((i) => (i + 1) % cards.length);
  }, [cards.length]);

  const goPrev = useCallback(() => {
    setDirection(-1);
    setCurrentIdx((i) => (i === 0 ? cards.length - 1 : i - 1));
  }, [cards.length]);

  // Keyboard navigation
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "ArrowRight") goNext();
      if (e.key === "ArrowLeft") goPrev();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [goNext, goPrev]);

  const handleDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.x < -SWIPE_THRESHOLD) goNext();
    else if (info.offset.x > SWIPE_THRESHOLD) goPrev();
  };

  const prevIdx = currentIdx === 0 ? cards.length - 1 : currentIdx - 1;
  const nextIdx = (currentIdx + 1) % cards.length;
  const nextNextIdx = (currentIdx + 2) % cards.length;

  // Shuffle animation: card lifts up, rotates out to the side, new card sweeps in from opposite side
  const cardVariants = {
    enter: (d: number) => ({
      x: d > 0 ? 250 : -250,
      y: -30,
      opacity: 0,
      rotate: d > 0 ? 15 : -15,
      scale: 0.92,
    }),
    center: {
      x: 0,
      y: 0,
      opacity: 1,
      rotate: 0,
      scale: 1,
    },
    exit: (d: number) => ({
      x: d > 0 ? -200 : 200,
      y: -60,
      opacity: 0,
      rotate: d > 0 ? -18 : 18,
      scale: 0.88,
    }),
  };

  return (
    <section className="py-16 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8">
          <motion.h2
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            whileInView={{ opacity: 1, y: 0, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, ease: EASE_OUT_EXPO }}
            className="text-2xl md:text-3xl text-foreground mb-1"
          >
            <span className="font-extrabold">Get</span>{" "}
            <span className="font-normal italic">Inspired</span>
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: 0.15, ease: EASE_OUT_EXPO }}
            className="text-muted-foreground max-w-md mx-auto text-sm"
          >
            Explore popular destinations and start travyling.
          </motion.p>
        </div>

        {/* Card carousel with side peeks */}
        <div className="relative mx-auto flex items-center justify-center" style={{ maxWidth: 700, height: 480 }}>
          {/* Left peek card — angled, peeking from behind */}
          <div
            className="hidden md:block absolute rounded-2xl overflow-hidden cursor-pointer transition-all duration-300 hover:opacity-50"
            style={{ width: 280, height: 420, opacity: 0.35, zIndex: 1, left: 20, top: '50%', transform: 'translateY(-50%) rotate(-6deg)' }}
            onClick={goPrev}
          >
            <InspirationCard place={cards[prevIdx]} isFront={false} />
          </div>

          {/* Center card stack */}
          <div className="relative" style={{ width: 380, height: 480, zIndex: 5 }}>
            {/* Background card 2 */}
            <div
              className="absolute inset-0 rounded-2xl bg-gray-200 overflow-hidden"
              style={{ transform: "scale(0.88) translateY(24px)", opacity: 0.4 }}
            >
              <InspirationCard place={cards[nextNextIdx]} isFront={false} />
            </div>

            {/* Background card 1 */}
            <div
              className="absolute inset-0 rounded-2xl overflow-hidden shadow-lg"
              style={{ transform: "scale(0.94) translateY(12px)", opacity: 0.7 }}
            >
              <InspirationCard place={cards[nextIdx]} isFront={false} />
            </div>

            {/* Active card */}
            <AnimatePresence mode="popLayout" custom={direction}>
              <motion.div
                key={currentIdx}
                custom={direction}
                variants={cardVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                drag={isFlipped ? false : "x"}
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={0.7}
                onDragEnd={handleDragEnd}
                className="absolute inset-0 shadow-xl"
                style={{ zIndex: 10, perspective: 1000 }}
              >
                {/* Heart — floats above flip so it's always visible */}
                <button
                  onClick={(e) => e.stopPropagation()}
                  className="absolute top-4 right-4 w-9 h-9 bg-white/90 hover:bg-white rounded-full flex items-center justify-center shadow-sm transition-all z-30"
                >
                  <Heart size={16} className="text-gray-400" />
                </button>
                <motion.div
                  animate={{ rotateY: isFlipped ? 180 : 0 }}
                  transition={{ duration: 0.6, type: "spring", damping: 15, stiffness: 100 }}
                  className="w-full h-full relative cursor-pointer"
                  style={{ transformStyle: "preserve-3d" }}
                  onClick={() => setIsFlipped((f) => !f)}
                >
                  {/* Front */}
                  <div className="absolute inset-0 rounded-2xl overflow-hidden" style={{ backfaceVisibility: "hidden" }}>
                    <InspirationCard place={cards[currentIdx]} isFront />
                  </div>
                  {/* Back */}
                  <div className="absolute inset-0 rounded-2xl overflow-hidden" style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}>
                    <InspirationCardBack place={cards[currentIdx]} />
                  </div>
                </motion.div>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Right peek card — angled, peeking from behind */}
          <div
            className="hidden md:block absolute rounded-2xl overflow-hidden cursor-pointer transition-all duration-300 hover:opacity-50"
            style={{ width: 280, height: 420, opacity: 0.35, zIndex: 1, right: 20, top: '50%', transform: 'translateY(-50%) rotate(6deg)' }}
            onClick={goNext}
          >
            <InspirationCard place={cards[nextIdx]} isFront={false} />
          </div>
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-center gap-4 mt-6">
          <button
            onClick={goPrev}
            className="w-10 h-10 rounded-full border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50 hover:border-gray-300 transition-colors"
          >
            <ChevronLeft size={20} />
          </button>
          <span className="text-sm text-muted-foreground tabular-nums">
            {currentIdx + 1} / {cards.length}
          </span>
          <button
            onClick={goNext}
            className="w-10 h-10 rounded-full border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50 hover:border-gray-300 transition-colors"
          >
            <ChevronRight size={20} />
          </button>
        </div>
      </div>
    </section>
  );
}
