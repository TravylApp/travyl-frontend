'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import dynamic from 'next/dynamic';
import { AnimatePresence, motion } from 'motion/react';
import {
  Heart, MapPin, Star, X, Share2, ExternalLink, ChevronLeft, ChevronRight,
  RotateCw, Clock, DollarSign, Phone, Ticket, Calendar, Accessibility, Lightbulb,
  ChevronDown, Navigation, BookOpen, Map as MapIcon, Globe, Search,
} from 'lucide-react';
import { ExplorePreview } from '@/components/home/ExplorePreview';
import { Footer } from '@/components/home/Footer';
import { OceanWave } from '@/components/home/OceanWave';
import { useSimilarPlaces, MOCK_PLACES, Navy } from '@travyl/shared';
import type { PlaceItem } from '@travyl/shared';

const LeafletMap = dynamic(() => import('@/components/leaflet-map'), { ssr: false });

// ═══════════════════════════════════════════════════════════════════════════
// Detail Overlay — 3D Flip Card with Discovery Navigation
// ═══════════════════════════════════════════════════════════════════════════

interface PlaceDetailOverlayProps {
  place: PlaceItem;
  isFavorited?: boolean;
  onToggleFavorite?: () => void;
  onClose: () => void;
  onNavigate?: (place: PlaceItem) => void;
  onSearchTag?: (tag: string) => void;
}

export function PlaceDetailOverlay({
  place,
  isFavorited = false,
  onToggleFavorite,
  onClose,
  onNavigate,
  onSearchTag,
}: PlaceDetailOverlayProps) {
  const [isFlipped, setIsFlipped] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [direction, setDirection] = useState(0);

  const similarPlaces = useSimilarPlaces(place, MOCK_PLACES, 12);

  const [discoveryIndex, setDiscoveryIndex] = useState(-1);

  const currentPlace = discoveryIndex === -1 ? place : similarPlaces[discoveryIndex];
  const totalCount = similarPlaces.length + 1;
  const currentNum = discoveryIndex + 2;

  const searchResults = searchQuery.trim().length >= 2
    ? MOCK_PLACES.filter((p) =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.tagline?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.category?.toLowerCase().includes(searchQuery.toLowerCase())
      ).filter((p) => p.id !== currentPlace?.id).slice(0, 6)
    : [];

  // Reset when place changes externally
  useEffect(() => {
    setDiscoveryIndex(-1);
    setIsFlipped(false);
  }, [place.id]);

  const goNext = useCallback(() => {
    if (discoveryIndex < similarPlaces.length - 1) {
      setDirection(1);
      setDiscoveryIndex((i) => i + 1);
      setIsFlipped(false);
    }
  }, [discoveryIndex, similarPlaces.length]);

  const goPrev = useCallback(() => {
    if (discoveryIndex > -1) {
      setDirection(-1);
      setDiscoveryIndex((i) => i - 1);
      setIsFlipped(false);
    }
  }, [discoveryIndex]);

  const handleSelectSearchResult = useCallback((p: PlaceItem) => {
    const idx = similarPlaces.findIndex((s) => s.id === p.id);
    if (idx !== -1) {
      setDirection(idx > discoveryIndex ? 1 : -1);
      setDiscoveryIndex(idx);
      setIsFlipped(false);
    } else {
      // Not in similar list — navigate via parent
      setDirection(1);
      onNavigate?.(p);
    }
    setSearchQuery('');
    setSearchFocused(false);
  }, [similarPlaces, discoveryIndex, onNavigate]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'ArrowRight') goNext();
      else if (e.key === 'ArrowLeft') goPrev();
      else if (e.key === 'Escape') onClose();
      else if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); setIsFlipped((f) => !f); }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [goNext, goPrev, onClose]);

  const hasCoords = !!(currentPlace?.latitude && currentPlace?.longitude);

  const directionsUrl = hasCoords
    ? `https://www.google.com/maps/dir/?api=1&destination=${currentPlace.latitude},${currentPlace.longitude}`
    : currentPlace.address
    ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(currentPlace.address)}`
    : undefined;

  const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(currentPlace.name + ' ' + (currentPlace.tagline || ''))}`;

  return (
    <motion.div
      key="detail-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { delay: 0.2, duration: 0.15 } }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-50 overflow-y-auto bg-gray-50"
      onClick={onClose}
    >
      <button
        onClick={onClose}
        className="fixed top-4 right-4 z-[60] w-9 h-9 rounded-full bg-white/90 shadow-md flex items-center justify-center hover:bg-white transition-colors"
      >
        <X size={16} className="text-gray-600" />
      </button>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-6 pb-4">
        {/* Search bar */}
        <div className="relative mb-3" onClick={(e) => e.stopPropagation()}>
          <div className="relative">
            <Search size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setTimeout(() => setSearchFocused(false), 200)}
              placeholder="Search for a place..."
              className="w-full pl-10 pr-10 py-2.5 rounded-full bg-white border border-gray-200 shadow-sm text-[13px] text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/15 focus:border-[#1e3a5f]/30 transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => { setSearchQuery(''); setSearchFocused(false); }}
                className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-gray-200 flex items-center justify-center hover:bg-gray-300 transition-colors"
              >
                <X size={10} className="text-gray-500" />
              </button>
            )}
          </div>

          {/* Search results dropdown */}
          {searchFocused && searchResults.length > 0 && (
            <div className="absolute top-full left-0 right-0 max-w-2xl mx-auto mt-1 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden z-50">
              {searchResults.map((p) => (
                <button
                  key={p.id}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => handleSelectSearchResult(p)}
                  className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 transition-colors text-left"
                >
                  <SearchThumb src={p.images?.[0] || p.image} alt={p.name} />
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-semibold text-gray-800 truncate">{p.name}</p>
                    <p className="text-[11px] text-gray-500 truncate">{p.tagline}</p>
                  </div>
                  {p.rating != null && (
                    <div className="flex items-center gap-1 shrink-0">
                      <Star size={10} className="text-amber-400 fill-amber-400" />
                      <span className="text-[11px] font-semibold text-gray-600">{p.rating.toFixed(1)}</span>
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}

          {searchFocused && searchQuery.trim().length >= 2 && searchResults.length === 0 && (
            <div className="absolute top-full left-0 right-0 max-w-2xl mx-auto mt-1 bg-white border border-gray-200 rounded-xl shadow-lg p-4 text-center z-50">
              <p className="text-[13px] text-gray-400">No places found</p>
            </div>
          )}

        </div>

        {/* Card column + Map column */}
        <div className="flex flex-col md:flex-row gap-4">
          {/* Left: Card + Discovery arrows */}
          <motion.div
            initial={{ opacity: 0, x: -60, scale: 0.96 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: -60, scale: 0.96, transition: { duration: 0.3, ease: [0.4, 0, 1, 1] } }}
            transition={{ duration: 0.35, ease: [0, 0, 0.2, 1] }}
            className="w-full md:flex-1 flex flex-col gap-3"
          >
            <div className="relative rounded-2xl shadow-lg border border-gray-200/60 overflow-hidden" style={{ minHeight: 520 }} onClick={(e) => e.stopPropagation()}>
              <AnimatePresence mode="popLayout" custom={direction}>
                <motion.div
                  key={currentPlace.id}
                  custom={direction}
                  variants={{
                    enter: (d: number) => ({
                      x: d > 0 ? 250 : -250,
                      y: -30,
                      opacity: 0,
                      rotate: d > 0 ? 12 : -12,
                      scale: 0.92,
                    }),
                    center: { x: 0, y: 0, opacity: 1, rotate: 0, scale: 1 },
                    exit: (d: number) => ({
                      x: d > 0 ? -200 : 200,
                      y: -50,
                      opacity: 0,
                      rotate: d > 0 ? -15 : 15,
                      scale: 0.88,
                    }),
                  }}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{ duration: 0.4, ease: [0, 0, 0.2, 1] }}
                  className="relative w-full h-full"
                >
                  <WebCardFront
                    place={currentPlace}
                    isFav={isFavorited}
                    onToggleFav={onToggleFavorite}
                    onFlip={() => setIsFlipped((f) => !f)}
                  />

                  {/* Animated info overlay */}
                  <AnimatePresence>
                    {isFlipped && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.25 }}
                        className="absolute inset-0 rounded-2xl overflow-hidden cursor-pointer"
                        onClick={() => setIsFlipped(false)}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={(currentPlace.images?.length ? currentPlace.images : [currentPlace.image])[0]}
                          alt=""
                          className="absolute inset-0 w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-black/65 backdrop-blur-sm" />

                        <div className="relative h-full flex flex-col p-5 text-white overflow-y-auto">
                          {/* Header */}
                          <motion.div
                            initial={{ opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.05, duration: 0.3 }}
                          >
                            <span className="text-[10px] font-bold uppercase tracking-widest text-sky-300 mb-1 block">
                              {currentPlace.category} &middot; {currentPlace.type}
                            </span>
                            <div className="flex items-center gap-2.5 mb-1">
                              <h3 className="text-2xl font-extrabold leading-tight">{currentPlace.name}</h3>
                              {currentPlace.rating != null && (
                                <div className="flex items-center gap-1 bg-white/15 px-2 py-0.5 rounded-lg shrink-0">
                                  <Star size={11} className="text-amber-400 fill-amber-400" />
                                  <span className="text-[12px] font-bold">{currentPlace.rating.toFixed(1)}</span>
                                </div>
                              )}
                            </div>
                            {currentPlace.tagline && (
                              <div className="flex items-center gap-1.5 mb-3">
                                <MapPin size={11} className="text-white/50 shrink-0" />
                                <span className="text-[12px] text-white/50">{currentPlace.tagline}</span>
                              </div>
                            )}
                          </motion.div>

                          {/* Quick stats */}
                          <motion.div
                            initial={{ opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.12, duration: 0.3 }}
                            className="grid grid-cols-2 gap-2 mb-3"
                          >
                            {currentPlace.priceLevel && (
                              <div className="bg-white/10 rounded-xl px-3 py-2">
                                <span className="text-[9px] text-white/45 block">Price</span>
                                <span className="text-[13px] font-bold">
                                  {'$'.repeat(currentPlace.priceLevel)}
                                  <span className="text-white/25">{'$'.repeat(4 - currentPlace.priceLevel)}</span>
                                </span>
                              </div>
                            )}
                            {currentPlace.duration && (
                              <div className="bg-white/10 rounded-xl px-3 py-2">
                                <span className="text-[9px] text-white/45 block">Duration</span>
                                <span className="text-[13px] font-bold">{currentPlace.duration}</span>
                              </div>
                            )}
                            {currentPlace.admissionFee && (
                              <div className="bg-white/10 rounded-xl px-3 py-2">
                                <span className="text-[9px] text-white/45 block">Admission</span>
                                <span className="text-[13px] font-bold">{currentPlace.admissionFee}</span>
                              </div>
                            )}
                            {currentPlace.rating != null && currentPlace.reviewCount && (
                              <div className="bg-white/10 rounded-xl px-3 py-2">
                                <span className="text-[9px] text-white/45 block">Reviews</span>
                                <span className="text-[13px] font-bold">{currentPlace.reviewCount.toLocaleString()}</span>
                              </div>
                            )}
                            {currentPlace.bestTimeToVisit && (
                              <div className="bg-white/10 rounded-xl px-3 py-2 col-span-2">
                                <span className="text-[9px] text-white/45 block">Best Time</span>
                                <span className="text-[11px] font-semibold leading-tight">{currentPlace.bestTimeToVisit}</span>
                              </div>
                            )}
                          </motion.div>

                          {/* Contact info */}
                          {(currentPlace.hours || currentPlace.phone || currentPlace.website) && (
                            <motion.div
                              initial={{ opacity: 0, y: 8 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: 0.15, duration: 0.3 }}
                              className="flex flex-wrap gap-1.5 mb-3"
                            >
                              {currentPlace.hours && (
                                <span className="flex items-center gap-1 px-2 py-1 rounded-full bg-white/10 border border-white/10">
                                  <Clock size={10} className="text-sky-300/70" />
                                  <span className="text-[10px] text-white/60">{currentPlace.hours}</span>
                                </span>
                              )}
                              {currentPlace.phone && (
                                <a href={`tel:${currentPlace.phone}`} onClick={(e) => e.stopPropagation()} className="flex items-center gap-1 px-2 py-1 rounded-full bg-white/10 border border-white/10 hover:bg-white/15 transition-colors">
                                  <Phone size={10} className="text-sky-300/70" />
                                  <span className="text-[10px] text-white/60">{currentPlace.phone}</span>
                                </a>
                              )}
                              {currentPlace.website && (
                                <a href={currentPlace.website} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="flex items-center gap-1 px-2 py-1 rounded-full bg-white/10 border border-white/10 hover:bg-white/15 transition-colors">
                                  <Globe size={10} className="text-sky-300/70" />
                                  <span className="text-[10px] text-white/60 truncate max-w-[120px]">{currentPlace.website.replace(/^https?:\/\/(www\.)?/, '')}</span>
                                </a>
                              )}
                            </motion.div>
                          )}

                          {/* Description */}
                          {currentPlace.description && (
                            <motion.p
                              initial={{ opacity: 0, y: 8 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: 0.18, duration: 0.3 }}
                              className="text-[13px] text-white/70 leading-[19px] line-clamp-3 mb-3"
                            >
                              {currentPlace.description}
                            </motion.p>
                          )}

                          {/* Tips */}
                          {currentPlace.tips && currentPlace.tips.length > 0 && (
                            <motion.div
                              initial={{ opacity: 0, y: 8 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: 0.2, duration: 0.3 }}
                              className="mb-3"
                            >
                              <div className="flex items-center gap-1.5 mb-1.5">
                                <Lightbulb size={11} className="text-sky-300/70" />
                                <span className="text-[10px] font-semibold text-white/50">Tips</span>
                              </div>
                              {currentPlace.tips.slice(0, 3).map((tip, i) => (
                                <p key={i} className="text-[11px] text-white/60 leading-[16px] pl-4 mb-1">
                                  &bull; {tip}
                                </p>
                              ))}
                            </motion.div>
                          )}

                          {/* Spacer */}
                          <div className="flex-1 min-h-2" />

                          {/* Action buttons */}
                          <motion.div
                            initial={{ opacity: 0, y: 16 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.22, duration: 0.3 }}
                            className="flex flex-col gap-2"
                          >
                            <WebOverlayActions place={currentPlace} />
                          </motion.div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Discovery arrows under card */}
            {similarPlaces.length > 0 && (
              <div className="flex items-center justify-center gap-4" onClick={(e) => e.stopPropagation()}>
                <button
                  onClick={goPrev}
                  disabled={discoveryIndex <= -1}
                  className="w-8 h-8 rounded-full border border-gray-200 bg-white flex items-center justify-center hover:bg-gray-50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed shadow-sm"
                >
                  <ChevronLeft size={14} className="text-gray-600" />
                </button>
                <span className="text-[12px] font-medium text-gray-500 tabular-nums min-w-[60px] text-center">
                  {currentNum} of {totalCount}
                </span>
                <button
                  onClick={goNext}
                  disabled={discoveryIndex >= similarPlaces.length - 1}
                  className="w-8 h-8 rounded-full border border-gray-200 bg-white flex items-center justify-center hover:bg-gray-50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed shadow-sm"
                >
                  <ChevronRight size={14} className="text-gray-600" />
                </button>
              </div>
            )}
          </motion.div>

          {/* Right: Map + Action buttons */}
          {hasCoords && (
            <motion.div
              initial={{ opacity: 0, x: 80, rotate: 4, scale: 0.94 }}
              animate={{ opacity: 1, x: 0, rotate: 0, scale: 1 }}
              exit={{ opacity: 0, x: 80, rotate: 4, scale: 0.94, transition: { duration: 0.3, ease: [0.4, 0, 1, 1] } }}
              transition={{ duration: 0.35, delay: 0.06, ease: [0, 0, 0.2, 1] }}
              className="hidden md:flex flex-1 flex-col gap-3"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="rounded-2xl shadow-lg border border-gray-200/60 overflow-hidden relative" style={{ height: 520 }}>
                <Suspense fallback={
                  <div className="flex items-center justify-center h-full w-full bg-gray-50">
                    <span className="text-sm text-gray-400">Loading map...</span>
                  </div>
                }>
                  <LeafletMap
                    lat={currentPlace.latitude!}
                    lng={currentPlace.longitude!}
                    label={currentPlace.name}
                    zoom={15}
                    height="100%"
                    className="!rounded-none !border-0"
                  />
                </Suspense>
              </div>

            </motion.div>
          )}
        </div>
      </div>

      {/* Explore section */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 16, transition: { duration: 0.2 } }}
        transition={{ duration: 0.35, delay: 0.15, ease: [0, 0, 0.2, 1] }}
        onClick={(e) => e.stopPropagation()}
      >
        <ExplorePreview onItemClick={(item) => {
          handleSelectSearchResult(item);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }} />
      </motion.div>

      {/* Ocean Wave + Footer */}
      <div onClick={(e) => e.stopPropagation()}>
        <OceanWave />
        <Footer />
      </div>
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Card Front
// ═══════════════════════════════════════════════════════════════════════════

function WebCardFront({
  place,
  isFav,
  onToggleFav,
  onFlip,
}: {
  place: PlaceItem;
  isFav: boolean;
  onToggleFav?: () => void;
  onFlip: () => void;
}) {
  const images = place.images?.length ? place.images : [place.image];
  const hasMultiple = images.length > 1;
  const [currentImgIndex, setCurrentImgIndex] = useState(0);
  const [imgErrors, setImgErrors] = useState<Set<number>>(new Set());

  const goNextImg = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentImgIndex((i) => (i + 1) % images.length);
  };
  const goPrevImg = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentImgIndex((i) => (i === 0 ? images.length - 1 : i - 1));
  };

  return (
    <div
      className="relative w-full h-full cursor-pointer bg-black"
      style={{ minHeight: 480 }}
      onClick={onFlip}
    >
      {imgErrors.has(currentImgIndex) ? (
        <div
          className="absolute inset-0 flex items-center justify-center"
          style={{ background: `linear-gradient(135deg, ${Navy.DEFAULT}, #2563eb)` }}
        >
          <MapPin size={36} className="text-white/30" />
        </div>
      ) : (
        <AnimatePresence mode="popLayout">
          <motion.img
            key={images[currentImgIndex]}
            src={images[currentImgIndex]}
            alt={place.name}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            className="absolute inset-0 w-full h-full object-cover"
            onError={() => setImgErrors((prev) => new Set(prev).add(currentImgIndex))}
          />
        </AnimatePresence>
      )}

      {/* Image navigation arrows */}
      {hasMultiple && (
        <>
          <button
            onClick={goPrevImg}
            className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/30 hover:bg-black/50 flex items-center justify-center transition-colors z-20"
          >
            <ChevronLeft size={16} className="text-white" />
          </button>
          <button
            onClick={goNextImg}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/30 hover:bg-black/50 flex items-center justify-center transition-colors z-20"
          >
            <ChevronRight size={16} className="text-white" />
          </button>
        </>
      )}

      {onToggleFav && (
        <button
          onClick={(e) => { e.stopPropagation(); onToggleFav(); }}
          className={`absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center transition-colors z-20 ${
            isFav ? 'bg-red-500/20 border border-red-400/60' : 'bg-white/90 backdrop-blur-sm'
          }`}
        >
          <Heart size={14} className={isFav ? 'text-red-400 fill-red-400' : 'text-gray-400'} />
        </button>
      )}

      {/* Image dots */}
      {hasMultiple && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 z-10">
          {images.slice(0, 6).map((_, i) => (
            <button
              key={i}
              onClick={(e) => { e.stopPropagation(); setCurrentImgIndex(i); }}
              className={`rounded-full transition-all ${
                i === currentImgIndex ? 'w-5 h-1.5 bg-white' : 'w-1.5 h-1.5 bg-white/50'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Card Back
// ═══════════════════════════════════════════════════════════════════════════

function WebCardBack({
  place,
  isFav,
  onToggleFav,
  onFlip,
  onSearchTag,
}: {
  place: PlaceItem;
  isFav: boolean;
  onToggleFav?: () => void;
  onFlip: () => void;
  onSearchTag?: (tag: string) => void;
}) {
  const hasCoords = !!(place.latitude && place.longitude);
  const images = place.images?.length ? place.images : [place.image];

  return (
    <div
      className="relative w-full overflow-y-auto cursor-pointer"
      style={{ minHeight: '100%' }}
      onClick={onFlip}
    >
      {/* Background image */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={images[0]}
        alt=""
        className="absolute inset-0 w-full h-full object-cover"
      />
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

      <div className="relative p-3.5">
        {/* Header with name + rating + favorite */}
        <div className="flex items-start gap-2.5 mb-1">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-[19px] font-extrabold text-white leading-tight truncate">{place.name}</h3>
              {place.rating != null && (
                <div className="flex items-center gap-0.5 shrink-0">
                  <Star size={11} className="text-amber-400 fill-amber-400" />
                  <span className="text-[12px] font-bold text-white">{place.rating.toFixed(1)}</span>
                </div>
              )}
            </div>
            <span className="text-[10px] text-sky-300 uppercase tracking-wide">
              {place.category} &middot; {place.type}
            </span>
          </div>
          {onToggleFav && (
            <button
              onClick={(e) => { e.stopPropagation(); onToggleFav(); }}
              className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors shrink-0 ${
                isFav ? 'bg-red-500/20 border border-red-400/60' : 'bg-white/10 border border-white/[0.08] hover:bg-white/[0.15]'
              }`}
            >
              <Heart size={14} className={isFav ? 'text-red-400 fill-red-400' : 'text-white/60'} />
            </button>
          )}
        </div>

        {/* Address row */}
        {(place.address || place.tagline) && (
          <div className="flex items-center gap-1.5 mb-2">
            <MapPin size={10} className="text-sky-300/70 shrink-0" />
            <span className="text-[10px] text-white/55 truncate">{place.address || place.tagline}</span>
            {hasCoords && (
              <span className="text-[8px] font-mono text-white/30 shrink-0 ml-auto">
                {place.latitude!.toFixed(4)}, {place.longitude!.toFixed(4)}
              </span>
            )}
          </div>
        )}

        {/* Contact pills */}
        {(place.phone || place.website || place.hours) && (
          <div className="flex flex-wrap gap-1.5 mb-2.5">
            {place.hours && (
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/[0.06] border border-white/[0.08]">
                <Clock size={9} className="text-sky-300/70" />
                <span className="text-[9px] text-white/50">{place.hours}</span>
              </span>
            )}
            {place.phone && (
              <a href={`tel:${place.phone}`} onClick={(e) => e.stopPropagation()} className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/[0.06] border border-white/[0.08] hover:bg-white/[0.12] transition-colors">
                <Phone size={9} className="text-sky-300/70" />
                <span className="text-[9px] text-white/50">{place.phone}</span>
              </a>
            )}
            {place.website && (
              <a href={place.website} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/[0.06] border border-white/[0.08] hover:bg-white/[0.12] transition-colors">
                <Globe size={9} className="text-sky-300/70" />
                <span className="text-[9px] text-white/50 truncate max-w-[100px]">{place.website.replace(/^https?:\/\/(www\.)?/, '')}</span>
              </a>
            )}
          </div>
        )}

        <div className="h-px bg-white/10 mb-2.5" />

        <div className="flex flex-col gap-2">
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0, duration: 0.25 }}
          >
            <WebQuickFacts place={place} />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.25 }}
          >
            <WebGettingThere place={place} />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.25 }}
          >
            <WebPlaceActions place={place} />
          </motion.div>
        </div>

        <div className="flex items-center justify-center gap-1 mt-2.5">
          <span className="text-[9px] text-white/30">Tap to flip</span>
          <RotateCw size={9} className="text-white/30" />
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Quick Facts
// ═══════════════════════════════════════════════════════════════════════════

function WebQuickFacts({ place }: { place: PlaceItem }) {
  const facts: { icon: React.ReactNode; label: string; value: React.ReactNode }[] = [];

  if (place.priceLevel) {
    facts.push({
      icon: <DollarSign size={11} className="text-sky-300" />,
      label: 'Price',
      value: (
        <span className="flex">
          {Array.from({ length: 4 }, (_, i) => (
            <span key={i} className={`text-[11px] font-semibold ${i < place.priceLevel! ? 'text-white' : 'text-white/20'}`}>$</span>
          ))}
        </span>
      ),
    });
  }

  if (place.duration) {
    facts.push({ icon: <Clock size={11} className="text-sky-300" />, label: 'Duration', value: place.duration });
  }

  if (place.rating != null && place.reviewCount) {
    facts.push({ icon: <Star size={11} className="text-sky-300" />, label: 'Reviews', value: `${place.reviewCount.toLocaleString()} reviews` });
  }

  facts.push({ icon: <Ticket size={11} className="text-sky-300" />, label: 'Admission', value: place.admissionFee || 'Free' });

  if (place.bestTimeToVisit) {
    facts.push({ icon: <Calendar size={11} className="text-sky-300" />, label: 'Best Time', value: place.bestTimeToVisit });
  }

  return (
    <div className="bg-white/[0.08] border border-white/[0.12] rounded-xl p-3">
      <h4 className="text-[12px] font-bold text-white mb-2">Quick Facts</h4>
      <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
        {facts.map((fact, idx) => (
          <div key={idx}>
            <div className="flex items-center gap-1">
              {fact.icon}
              <span className="text-[9px] text-white/45">{fact.label}</span>
            </div>
            {typeof fact.value === 'string' ? (
              <span className="text-[11px] font-semibold text-white leading-tight">{fact.value}</span>
            ) : (
              fact.value
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Getting There
// ═══════════════════════════════════════════════════════════════════════════

function WebGettingThere({ place }: { place: PlaceItem }) {
  const [expanded, setExpanded] = useState(false);

  // Only show items not already in the header (address, phone, website, hours are shown above)
  const hasContent =
    (place.accessibility && place.accessibility.length > 0) ||
    (place.tips && place.tips.length > 0);

  if (!hasContent) return null;

  return (
    <div className="bg-white/[0.08] border border-white/[0.12] rounded-xl p-3">
      <button
        onClick={(e) => { e.stopPropagation(); setExpanded((v) => !v); }}
        className="w-full flex items-center justify-between"
      >
        <h4 className="text-[12px] font-bold text-white">Tips & Access</h4>
        <motion.div animate={{ rotate: expanded ? 180 : 0 }} transition={{ duration: 0.25 }}>
          <ChevronDown size={11} className="text-white/50" />
        </motion.div>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="mt-2 flex flex-col gap-2">
              {place.accessibility && place.accessibility.length > 0 && (
                <InfoRow icon={<Accessibility size={11} className="text-sky-300" />} text={place.accessibility.join(', ')} />
              )}
              {place.tips?.map((tip, idx) => (
                <InfoRow key={idx} icon={<Lightbulb size={11} className="text-sky-300" />} text={tip} italic />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function InfoRow({ icon, text, italic }: { icon: React.ReactNode; text: string; italic?: boolean }) {
  return (
    <div className="flex items-start gap-2">
      <span className="mt-0.5 shrink-0">{icon}</span>
      <span className={`text-[12px] text-white/80 ${italic ? 'italic' : ''}`}>{text}</span>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Actions
// ═══════════════════════════════════════════════════════════════════════════

function WebOverlayActions({ place }: { place: PlaceItem }) {
  const typeActions = getWebTypeActions(place);
  const hasCoords = !!(place.latitude && place.longitude);
  const directionsUrl = hasCoords
    ? `https://www.google.com/maps/dir/?api=1&destination=${place.latitude},${place.longitude}`
    : place.address
    ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(place.address)}`
    : undefined;

  // Primary action = first type-specific action
  const primary = typeActions[0];
  const secondary = typeActions.slice(1);

  return (
    <div className="flex flex-col gap-2">
      {/* Primary CTA */}
      {primary && (
        <a
          href={primary.href}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="flex items-center justify-center gap-2 py-3 rounded-xl bg-white text-[#1e3a5f] font-bold text-[13px] hover:bg-white/90 transition-colors [&_svg]:text-[#1e3a5f]"
        >
          {primary.icon}
          {primary.label}
        </a>
      )}

      {/* Secondary actions row */}
      <div className={`grid gap-2 ${secondary.length > 0 ? 'grid-cols-3' : 'grid-cols-2'}`}>
        {secondary.map((action, idx) => (
          <a
            key={idx}
            href={action.href}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="flex flex-col items-center gap-1 py-2.5 rounded-xl bg-white/10 border border-white/15 hover:bg-white/20 transition-colors"
          >
            {action.icon}
            <span className="text-[10px] font-semibold text-white/85">{action.label}</span>
          </a>
        ))}
        {directionsUrl && (
          <a
            href={directionsUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="flex flex-col items-center gap-1 py-2.5 rounded-xl bg-white/10 border border-white/15 hover:bg-white/20 transition-colors"
          >
            <Navigation size={14} className="text-sky-300" />
            <span className="text-[10px] font-semibold text-white/85">Directions</span>
          </a>
        )}
        <button
          onClick={(e) => {
            e.stopPropagation();
            const text = `Check out ${place.name}!${place.website ? `\n${place.website}` : ''}`;
            if (navigator.share) navigator.share({ title: place.name, text });
            else navigator.clipboard.writeText(text);
          }}
          className="flex flex-col items-center gap-1 py-2.5 rounded-xl bg-white/10 border border-white/15 hover:bg-white/20 transition-colors"
        >
          <Share2 size={14} className="text-sky-300" />
          <span className="text-[10px] font-semibold text-white/85">Share</span>
        </button>
      </div>
    </div>
  );
}

function getWebTypeActions(place: PlaceItem): { icon: React.ReactNode; label: string; href: string }[] {
  const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(place.name + ' ' + place.tagline)}`;

  switch (place.type) {
    case 'restaurant':
      return [
        { icon: <BookOpen size={13} className="text-sky-300" />, label: 'View Menu', href: searchUrl + '+menu' },
        { icon: <Calendar size={13} className="text-sky-300" />, label: 'Book a Table', href: searchUrl + '+reservation' },
      ];
    case 'attraction':
      return [
        { icon: <Ticket size={13} className="text-sky-300" />, label: 'Buy Tickets', href: searchUrl + '+tickets' },
      ];
    case 'experience':
      return [
        { icon: <Calendar size={13} className="text-sky-300" />, label: 'Check Availability', href: searchUrl + '+availability' },
      ];
    case 'destination':
      return [
        { icon: <MapIcon size={13} className="text-sky-300" />, label: 'Plan Trip', href: searchUrl + '+travel' },
      ];
    case 'event':
      return [
        { icon: <Ticket size={13} className="text-sky-300" />, label: 'Get Tickets', href: searchUrl + '+tickets' },
      ];
    default:
      return [];
  }
}

function WebPlaceActions({ place }: { place: PlaceItem }) {
  const typeActions = getWebTypeActions(place);
  const hasCoords = !!(place.latitude && place.longitude);
  const directionsUrl = hasCoords
    ? `https://www.google.com/maps/dir/?api=1&destination=${place.latitude},${place.longitude}`
    : place.address
    ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(place.address)}`
    : undefined;

  return (
    <div className="flex flex-col gap-1.5">
      {/* Type-specific actions */}
      {typeActions.length > 0 && (
        <div className={`grid gap-1.5 ${typeActions.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
          {typeActions.map((action, idx) => (
            <a
              key={idx}
              href={action.href}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="flex flex-col items-center gap-0.5 py-2 rounded-lg border bg-white/[0.08] border-white/10 hover:bg-white/[0.15] transition-colors"
            >
              {action.icon}
              <span className="text-[10px] font-semibold text-white/85">{action.label}</span>
            </a>
          ))}
        </div>
      )}

      {/* Directions + Share row */}
      <div className="grid grid-cols-2 gap-1.5">
        {directionsUrl && (
          <a
            href={directionsUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="flex flex-col items-center gap-0.5 py-2 rounded-lg border bg-white/[0.08] border-white/10 hover:bg-white/[0.15] transition-colors"
          >
            <Navigation size={13} className="text-sky-300" />
            <span className="text-[10px] font-semibold text-white/85">Directions</span>
          </a>
        )}
        <button
          onClick={(e) => {
            e.stopPropagation();
            const text = `Check out ${place.name}!${place.website ? `\n${place.website}` : ''}`;
            if (navigator.share) navigator.share({ title: place.name, text });
            else navigator.clipboard.writeText(text);
          }}
          className="flex flex-col items-center gap-0.5 py-2 rounded-lg border bg-white/[0.08] border-white/10 hover:bg-white/[0.15] transition-colors"
        >
          <Share2 size={13} className="text-sky-300" />
          <span className="text-[10px] font-semibold text-white/85">Share</span>
        </button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Search Thumbnail — small image with error fallback
// ═══════════════════════════════════════════════════════════════════════════

function SearchThumb({ src, alt }: { src?: string; alt: string }) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div
        className="w-10 h-10 rounded-lg shrink-0 flex items-center justify-center"
        style={{ background: `linear-gradient(135deg, ${Navy.DEFAULT}, #2563eb)` }}
      >
        <MapPin size={14} className="text-white/40" />
      </div>
    );
  }

  return (
    <div className="w-10 h-10 rounded-lg overflow-hidden bg-gray-100 shrink-0">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        className="w-full h-full object-cover"
        onError={() => setFailed(true)}
      />
    </div>
  );
}
