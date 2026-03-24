'use client';

import { useState, useRef, useCallback } from 'react';
import { Heart, MapPin, Star, Clock, Globe, DollarSign, Repeat, Timer, ChevronLeft, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Navy } from '@travyl/shared';
import type { PlaceItem } from '@travyl/shared';

// ─── Deterministic hash for consistent randomization ────────
function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

function getCardHeight(id: string): number {
  // Vary height for visual interest in columns: 320–420px
  return 320 + (hashCode(id + 'h') % 100);
}

export interface PinCardProps {
  item: PlaceItem;
  index: number;
  isFavorited: boolean;
  onFavorite: (id: string) => void;
  onClick?: (id: string) => void;
}

export function PinCard({ item, index, isFavorited, onFavorite, onClick }: PinCardProps) {
  const [imgIdx, setImgIdx] = useState(0);
  const [imgError, setImgError] = useState(false);
  const [isFlipped, setIsFlipped] = useState(false);
  const hasAnimated = useRef(false);
  const cardHeight = getCardHeight(item.id);

  const images = item.images?.length ? item.images : [item.image];
  const hasMultipleImages = images.length > 1;

  const shouldAnimate = !hasAnimated.current;
  if (shouldAnimate) hasAnimated.current = true;

  const handleFlip = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setIsFlipped((f) => !f);
  }, []);

  const prevImage = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setImgIdx((i) => (i === 0 ? images.length - 1 : i - 1));
  }, [images.length]);

  const nextImage = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setImgIdx((i) => (i + 1) % images.length);
  }, [images.length]);

  // Check if card has any detail data worth showing on back
  const hasDetails = item.hours || item.address || item.website || item.duration ||
    item.priceLevel || item.admissionFee || item.bestTimeToVisit ||
    (item.tips && item.tips.length > 0) || item.description;

  return (
    <motion.div
      initial={shouldAnimate ? { opacity: 0, y: 28, scale: 0.93 } : false}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{
        duration: 0.5,
        delay: shouldAnimate ? Math.min(index * 0.06, 0.8) : 0,
        ease: [0.22, 1, 0.36, 1],
      }}
      layout
      className="break-inside-avoid min-w-0"
      style={{ perspective: 1000 }}
    >
      <motion.div
        animate={{ rotateY: isFlipped ? 180 : 0 }}
        transition={{ duration: 0.5, type: 'spring', damping: 18, stiffness: 120 }}
        style={{ height: cardHeight, transformStyle: 'preserve-3d', position: 'relative' }}
      >
        {/* ─── Front ─── */}
        <div
          className="absolute inset-0 group rounded-2xl overflow-hidden cursor-pointer transition-shadow duration-300 hover:shadow-2xl shadow-lg"
          style={{ backfaceVisibility: 'hidden' }}
          onClick={() => onClick?.(item.id)}
        >
          {/* Image with crossfade */}
          {imgError ? (
            <div
              className="absolute inset-0 flex items-center justify-center"
              style={{ background: `linear-gradient(135deg, ${Navy.DEFAULT}, #2563eb)` }}
            >
              <MapPin size={32} className="text-white/30" />
            </div>
          ) : (
            <AnimatePresence mode="wait">
              <motion.img
                key={imgIdx}
                src={images[imgIdx]}
                alt={item.name}
                referrerPolicy="no-referrer"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                onError={() => setImgError(true)}
              />
            </AnimatePresence>
          )}

          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-black/5" />

          {/* Type badge — top left */}
          <div className="absolute top-3 left-3 z-10">
            <span className="px-2.5 py-1 rounded-full bg-black/40 backdrop-blur-md text-[9px] font-bold uppercase tracking-wider text-white/90">
              {item.type}
            </span>
          </div>

          {/* Favorite button — top right */}
          <button
            onClick={(e) => { e.stopPropagation(); onFavorite(item.id); }}
            className={`absolute top-3 right-3 z-10 w-9 h-9 rounded-full flex items-center justify-center transition-all duration-200 hover:scale-110 ${
              isFavorited
                ? 'bg-red-500 shadow-lg shadow-red-500/30'
                : 'bg-black/30 backdrop-blur-md hover:bg-black/50'
            }`}
          >
            <Heart
              size={15}
              className={isFavorited ? 'text-white fill-white' : 'text-white/80'}
            />
          </button>

          {/* Image navigation arrows — show on hover when multiple images */}
          {hasMultipleImages && !imgError && (
            <>
              <button
                onClick={prevImage}
                className="absolute left-2 top-1/2 -translate-y-1/2 z-10 w-7 h-7 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/50"
              >
                <ChevronLeft size={14} className="text-white" />
              </button>
              <button
                onClick={nextImage}
                className="absolute right-2 top-1/2 -translate-y-1/2 z-10 w-7 h-7 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/50"
              >
                <ChevronRight size={14} className="text-white" />
              </button>
            </>
          )}

          {/* Image dots indicator */}
          {hasMultipleImages && !imgError && (
            <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10 flex items-center gap-1">
              {images.slice(0, 6).map((_, i) => (
                <button
                  key={i}
                  onClick={(e) => { e.stopPropagation(); setImgIdx(i); }}
                  className={`rounded-full transition-all duration-300 ${
                    i === imgIdx
                      ? 'w-4 h-1.5 bg-white'
                      : 'w-1.5 h-1.5 bg-white/40 hover:bg-white/60'
                  }`}
                />
              ))}
              {images.length > 6 && (
                <span className="text-[8px] text-white/50 ml-0.5">+{images.length - 6}</span>
              )}
            </div>
          )}

          {/* Bottom content overlay */}
          <div className="absolute bottom-0 left-0 right-0 p-4">
            {/* Rating */}
            {item.rating != null && item.rating > 0 && (
              <div className="flex items-center gap-1 mb-2">
                <div className="flex items-center gap-1 bg-black/40 backdrop-blur-md rounded-lg px-2 py-0.5">
                  <Star size={10} className="text-yellow-400 fill-yellow-400" />
                  <span className="text-[11px] font-bold text-white">{item.rating.toFixed(1)}</span>
                  {item.reviewCount && (
                    <span className="text-[9px] text-white/50">({item.reviewCount > 999 ? `${(item.reviewCount / 1000).toFixed(1)}k` : item.reviewCount})</span>
                  )}
                </div>
                {item.priceLevel && (
                  <span className="text-[11px] font-bold text-white/70 ml-1">
                    {'$'.repeat(item.priceLevel)}<span className="text-white/25">{'$'.repeat(4 - item.priceLevel)}</span>
                  </span>
                )}
              </div>
            )}

            {/* Name */}
            <h3 className="text-[15px] font-extrabold text-white leading-tight line-clamp-2 drop-shadow-md mb-1">
              {item.name}
            </h3>

            {/* Location */}
            {item.tagline && (
              <div className="flex items-center gap-1 mb-1.5">
                <MapPin size={10} className="text-white/50 shrink-0" />
                <span className="text-[11px] text-white/60 truncate">{item.tagline}</span>
              </div>
            )}

            {/* Tags */}
            {item.tags && item.tags.length > 0 && (
              <div className="flex gap-1.5 flex-wrap">
                {item.tags.slice(0, 3).map((tag) => (
                  <span key={tag} className="px-2 py-0.5 bg-white/15 backdrop-blur-sm rounded-full text-[9px] font-medium text-white/80">{tag}</span>
                ))}
              </div>
            )}
          </div>

          {/* Flip hint — bottom right */}
          {hasDetails && (
            <button
              onClick={handleFlip}
              className="absolute bottom-3 right-3 z-10 w-7 h-7 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center hover:bg-white/30 transition-colors"
              title="Tap for details"
            >
              <Repeat size={11} className="text-white/70" />
            </button>
          )}
        </div>

        {/* ─── Back ─── */}
        <div
          className="absolute inset-0 rounded-2xl overflow-hidden cursor-pointer shadow-lg"
          style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
          onClick={handleFlip}
        >
          {/* Background: blurred image */}
          {!imgError && (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={item.image}
                alt=""
                referrerPolicy="no-referrer"
                className="absolute inset-0 w-full h-full object-cover scale-110 blur-md"
              />
              <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
            </>
          )}
          {imgError && (
            <div className="absolute inset-0" style={{ background: Navy.DEFAULT }} />
          )}

          {/* Content */}
          <div className="relative h-full flex flex-col p-4 text-white overflow-y-auto">
            {/* Header */}
            <span className="text-[9px] font-bold uppercase tracking-widest text-sky-300 mb-1">
              {item.category} &middot; {item.type}
            </span>
            <h3 className="text-base font-extrabold leading-tight mb-0.5">{item.name}</h3>
            {item.rating != null && item.rating > 0 && (
              <div className="flex items-center gap-1.5 mb-3">
                <Star size={10} className="text-amber-400 fill-amber-400" />
                <span className="text-[11px] font-bold">{item.rating.toFixed(1)}</span>
                {item.reviewCount && (
                  <span className="text-[10px] text-white/40">({item.reviewCount.toLocaleString()} reviews)</span>
                )}
              </div>
            )}

            {/* Quick facts grid */}
            <div className="grid grid-cols-2 gap-1.5 mb-3">
              {item.hours && (
                <div className="bg-white/10 rounded-lg px-2.5 py-1.5">
                  <div className="flex items-center gap-1 mb-0.5">
                    <Clock size={9} className="text-sky-300/70" />
                    <span className="text-[8px] text-white/40 uppercase">Hours</span>
                  </div>
                  <span className="text-[10px] font-semibold leading-tight block">{item.hours}</span>
                </div>
              )}
              {item.duration && (
                <div className="bg-white/10 rounded-lg px-2.5 py-1.5">
                  <div className="flex items-center gap-1 mb-0.5">
                    <Timer size={9} className="text-sky-300/70" />
                    <span className="text-[8px] text-white/40 uppercase">Duration</span>
                  </div>
                  <span className="text-[10px] font-semibold">{item.duration}</span>
                </div>
              )}
              {item.priceLevel && (
                <div className="bg-white/10 rounded-lg px-2.5 py-1.5">
                  <div className="flex items-center gap-1 mb-0.5">
                    <DollarSign size={9} className="text-sky-300/70" />
                    <span className="text-[8px] text-white/40 uppercase">Price</span>
                  </div>
                  <span className="text-[10px] font-bold">
                    {'$'.repeat(item.priceLevel)}<span className="text-white/25">{'$'.repeat(4 - item.priceLevel)}</span>
                  </span>
                </div>
              )}
              {item.admissionFee && (
                <div className="bg-white/10 rounded-lg px-2.5 py-1.5">
                  <span className="text-[8px] text-white/40 uppercase block mb-0.5">Admission</span>
                  <span className="text-[10px] font-semibold">{item.admissionFee}</span>
                </div>
              )}
              {item.bestTimeToVisit && (
                <div className="bg-white/10 rounded-lg px-2.5 py-1.5 col-span-2">
                  <span className="text-[8px] text-white/40 uppercase block mb-0.5">Best Time to Visit</span>
                  <span className="text-[10px] font-semibold leading-tight">{item.bestTimeToVisit}</span>
                </div>
              )}
            </div>

            {/* Address */}
            {item.address && (
              <div className="flex items-start gap-1.5 mb-2">
                <MapPin size={10} className="text-white/40 shrink-0 mt-0.5" />
                <span className="text-[10px] text-white/60 leading-tight">{item.address}</span>
              </div>
            )}

            {/* Description */}
            {item.description && (
              <p className="text-[10px] text-white/60 leading-relaxed line-clamp-3 mb-2">{item.description}</p>
            )}

            {/* Website */}
            {item.website && (
              <a
                href={item.website}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="flex items-center gap-1.5 mb-2 hover:text-sky-300 transition-colors"
              >
                <Globe size={10} className="text-sky-300/60 shrink-0" />
                <span className="text-[10px] text-white/50 truncate hover:text-sky-300 transition-colors">
                  {item.website.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '')}
                </span>
              </a>
            )}

            {/* Tips */}
            {item.tips && item.tips.length > 0 && (
              <div className="mb-2">
                <span className="text-[8px] text-white/40 uppercase font-semibold block mb-1">Tips</span>
                {item.tips.slice(0, 2).map((tip, i) => (
                  <p key={i} className="text-[10px] text-white/55 leading-tight pl-2 mb-0.5">&bull; {tip}</p>
                ))}
              </div>
            )}

            {/* Spacer */}
            <div className="flex-1 min-h-1" />

            {/* Flip back hint */}
            <div className="text-center pt-1">
              <span className="text-[9px] text-white/30 flex items-center justify-center gap-1">
                <Repeat size={9} /> Tap to flip back
              </span>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
