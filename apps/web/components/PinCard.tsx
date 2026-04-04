'use client';

import { useState, useRef, useCallback } from 'react';
import { Heart, MapPin, Star, Clock, Globe, DollarSign, Repeat, Timer, ChevronLeft, ChevronRight, Plus, Phone, Accessibility, MapPinned } from 'lucide-react';
import { motion } from 'motion/react';
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
  return 320 + (hashCode(id + 'h') % 100);
}

export interface PinCardProps {
  item: PlaceItem;
  index: number;
  isFavorited: boolean;
  onFavorite: (id: string) => void;
  onClick?: (id: string) => void;
  onAddToTrip?: (item: PlaceItem) => void;
  flush?: boolean;
}

const FLUSH_HEIGHT = 360;

export function PinCard({ item, index, isFavorited, onFavorite, onClick, onAddToTrip, flush }: PinCardProps) {
  const [imgIdx, setImgIdx] = useState(0);
  const [imgError, setImgError] = useState(false);
  const [fallbackSrc, setFallbackSrc] = useState<string | null>(null);
  const [isFlipped, setIsFlipped] = useState(false);
  const [addedToTrip, setAddedToTrip] = useState(false);
  const hasAnimated = useRef(false);
  const cardHeight = flush ? FLUSH_HEIGHT : getCardHeight(item.id);

  const images = (item.images?.length ? item.images : [item.image]).filter(Boolean) as string[];
  const hasMultipleImages = images.length > 1;

  // Only animate on first mount — never re-animate when grid is shown/hidden
  const shouldAnimate = !hasAnimated.current;
  if (!hasAnimated.current) hasAnimated.current = true;

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

  return (
    <div
      className="break-inside-avoid min-w-0"
      style={{
        perspective: 1000,
        animation: shouldAnimate ? `card-fade-in 0.3s ease-out ${Math.min(index * 0.02, 0.12)}s both` : undefined,
      }}
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
          {imgError || images.length === 0 ? (
            <div
              className="absolute inset-0 flex flex-col items-center justify-center px-4 text-center"
              style={{ background: `linear-gradient(135deg, ${Navy.DEFAULT}, #2563eb)` }}
            >
              <MapPin size={28} className="text-white/20 mb-2" />
              <span className="text-white/40 text-[11px] font-medium leading-tight line-clamp-2">{item.name}</span>
            </div>
          ) : (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={fallbackSrc || images[imgIdx]}
              alt={item.name}
              loading="lazy"
              decoding="async"
              className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
              onError={() => {
                if (!fallbackSrc) {
                  // Try next image in the array, or use Unsplash fallback
                  const nextIdx = imgIdx + 1;
                  if (nextIdx < images.length) {
                    setImgIdx(nextIdx);
                  } else {
                    setFallbackSrc(`https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=800&fit=crop&q=80&fm=webp`);
                  }
                } else {
                  setImgError(true);
                }
              }}
            />
          )}

          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-black/5" />

          {/* Type badge */}
          <div className="absolute top-3 left-3 z-10">
            <span className="px-2.5 py-1 rounded-full bg-black/40 backdrop-blur-md text-[9px] font-bold uppercase tracking-wider text-white/90">
              {item.type}
            </span>
          </div>

          {/* Favorite */}
          <button
            onClick={(e) => { e.stopPropagation(); onFavorite(item.id); }}
            className={`absolute top-3 right-3 z-10 w-9 h-9 rounded-full flex items-center justify-center transition-all duration-200 hover:scale-110 ${
              isFavorited
                ? 'bg-red-500 shadow-lg shadow-red-500/30'
                : 'bg-black/30 backdrop-blur-md hover:bg-black/50'
            }`}
          >
            <Heart size={15} className={isFavorited ? 'text-white fill-white' : 'text-white/80'} />
          </button>

          {/* Image nav arrows */}
          {hasMultipleImages && !imgError && (
            <>
              <button onClick={prevImage} className="absolute left-2 top-1/2 -translate-y-1/2 z-10 w-7 h-7 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/50">
                <ChevronLeft size={14} className="text-white" />
              </button>
              <button onClick={nextImage} className="absolute right-2 top-1/2 -translate-y-1/2 z-10 w-7 h-7 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/50">
                <ChevronRight size={14} className="text-white" />
              </button>
            </>
          )}

          {/* Image dots */}
          {hasMultipleImages && !imgError && (
            <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10 flex items-center gap-1">
              {images.slice(0, 6).map((_, i) => (
                <button
                  key={i}
                  onClick={(e) => { e.stopPropagation(); setImgIdx(i); }}
                  className={`rounded-full transition-all duration-300 ${
                    i === imgIdx ? 'w-4 h-1.5 bg-white' : 'w-1.5 h-1.5 bg-white/40 hover:bg-white/60'
                  }`}
                />
              ))}
              {images.length > 6 && <span className="text-[8px] text-white/50 ml-0.5">+{images.length - 6}</span>}
            </div>
          )}

          {/* Bottom content */}
          <div className="absolute bottom-0 left-0 right-0 p-4">
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
            <h3 className="text-[15px] font-extrabold text-white leading-tight line-clamp-2 drop-shadow-md mb-1">{item.name}</h3>
            {item.tagline && (
              <div className="flex items-center gap-1 mb-1.5">
                <MapPin size={10} className="text-white/50 shrink-0" />
                <span className="text-[11px] text-white/60 truncate">{item.tagline}</span>
              </div>
            )}
            {item.tags && item.tags.length > 0 && (
              <div className="flex gap-1.5 flex-wrap">
                {item.tags.slice(0, 3).map((tag) => (
                  <span key={tag} className="px-2 py-0.5 bg-white/15 backdrop-blur-sm rounded-full text-[9px] font-medium text-white/80">{tag}</span>
                ))}
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="absolute bottom-3 right-3 z-10 flex items-center gap-1.5">
            {onAddToTrip && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onAddToTrip(item);
                  setAddedToTrip(true);
                  setTimeout(() => setAddedToTrip(false), 2000);
                }}
                className={`w-7 h-7 rounded-full flex items-center justify-center transition-all duration-200 ${
                  addedToTrip
                    ? 'bg-emerald-500 scale-110'
                    : 'bg-white/20 backdrop-blur-sm hover:bg-sky-500 hover:scale-110'
                }`}
                title={addedToTrip ? 'Added!' : 'Add to trip'}
              >
                {addedToTrip ? (
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg>
                ) : (
                  <Plus size={13} className="text-white" />
                )}
              </button>
            )}
          </div>
        </div>

        {/* ─── Back (only renders content when flipped) ─── */}
        <div
          className="absolute inset-0 rounded-2xl overflow-hidden cursor-pointer shadow-lg"
          style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)', background: Navy.DEFAULT }}
          onClick={handleFlip}
        >
          {/* Only load the blurred background image when actually flipped */}
          {isFlipped && !imgError && (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={item.image} alt="" loading="lazy" className="absolute inset-0 w-full h-full object-cover scale-110 blur-md" />
              <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
            </>
          )}

          <div className="relative h-full flex flex-col p-4 text-white overflow-y-auto">
            <span className="text-[9px] font-bold uppercase tracking-widest text-sky-300 mb-1">
              {item.category} &middot; {item.type}
            </span>
            <h3 className="text-base font-extrabold leading-tight mb-0.5">{item.name}</h3>
            {item.rating != null && item.rating > 0 && (
              <div className="flex items-center gap-1.5 mb-3">
                <Star size={10} className="text-amber-400 fill-amber-400" />
                <span className="text-[11px] font-bold">{item.rating.toFixed(1)}</span>
                {item.reviewCount && <span className="text-[10px] text-white/40">({item.reviewCount.toLocaleString()} reviews)</span>}
              </div>
            )}

            <div className="grid grid-cols-2 gap-1.5 mb-3">
              {item.hours && (
                <div className="bg-white/10 rounded-lg px-2.5 py-1.5">
                  <div className="flex items-center gap-1 mb-0.5"><Clock size={9} className="text-sky-300/70" /><span className="text-[8px] text-white/40 uppercase">Hours</span></div>
                  <span className="text-[10px] font-semibold leading-tight block">{item.hours}</span>
                </div>
              )}
              {item.duration && (
                <div className="bg-white/10 rounded-lg px-2.5 py-1.5">
                  <div className="flex items-center gap-1 mb-0.5"><Timer size={9} className="text-sky-300/70" /><span className="text-[8px] text-white/40 uppercase">Duration</span></div>
                  <span className="text-[10px] font-semibold">{item.duration}</span>
                </div>
              )}
              {item.priceLevel && (
                <div className="bg-white/10 rounded-lg px-2.5 py-1.5">
                  <div className="flex items-center gap-1 mb-0.5"><DollarSign size={9} className="text-sky-300/70" /><span className="text-[8px] text-white/40 uppercase">Price</span></div>
                  <span className="text-[10px] font-bold">{'$'.repeat(item.priceLevel)}<span className="text-white/25">{'$'.repeat(4 - item.priceLevel)}</span></span>
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

            {item.address && (
              <div className="flex items-start gap-1.5 mb-2">
                <MapPin size={10} className="text-white/40 shrink-0 mt-0.5" />
                <span className="text-[10px] text-white/60 leading-tight">{item.address}</span>
              </div>
            )}
            {item.description && <p className="text-[10px] text-white/60 leading-relaxed line-clamp-3 mb-2">{item.description}</p>}
            {/* Contact & links */}
            <div className="flex flex-col gap-1.5 mb-2">
              {item.phone && (
                <a href={`tel:${item.phone}`} onClick={(e) => e.stopPropagation()} className="flex items-center gap-1.5 hover:text-sky-300 transition-colors">
                  <Phone size={10} className="text-sky-300/60 shrink-0" />
                  <span className="text-[10px] text-white/50 hover:text-sky-300 transition-colors">{item.phone}</span>
                </a>
              )}
              {item.website && (
                <a href={item.website} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="flex items-center gap-1.5 hover:text-sky-300 transition-colors">
                  <Globe size={10} className="text-sky-300/60 shrink-0" />
                  <span className="text-[10px] text-white/50 truncate hover:text-sky-300 transition-colors">{item.website.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '')}</span>
                </a>
              )}
            </div>

            {/* Accessibility */}
            {item.accessibility && item.accessibility.length > 0 && (
              <div className="mb-2">
                <div className="flex items-center gap-1 mb-1">
                  <Accessibility size={9} className="text-emerald-400/70" />
                  <span className="text-[8px] text-white/40 uppercase font-semibold">Accessibility</span>
                </div>
                <div className="flex gap-1 flex-wrap">
                  {item.accessibility.slice(0, 4).map((feat) => (
                    <span key={feat} className="px-1.5 py-0.5 bg-emerald-500/15 rounded text-[8px] text-emerald-300/80">{feat}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Nearby places count */}
            {item.nearbyPlaces && item.nearbyPlaces.length > 0 && (
              <div className="flex items-center gap-1.5 mb-2">
                <MapPinned size={10} className="text-amber-400/60 shrink-0" />
                <span className="text-[10px] text-white/50">{item.nearbyPlaces.length} nearby place{item.nearbyPlaces.length !== 1 ? 's' : ''}</span>
              </div>
            )}

            {item.tips && item.tips.length > 0 && (
              <div className="mb-2">
                <span className="text-[8px] text-white/40 uppercase font-semibold block mb-1">Tips</span>
                {item.tips.slice(0, 2).map((tip, i) => (
                  <p key={i} className="text-[10px] text-white/55 leading-tight pl-2 mb-0.5">&bull; {tip}</p>
                ))}
              </div>
            )}
            <div className="flex-1 min-h-1" />
            <div className="text-center pt-1">
              <span className="text-[9px] text-white/30 flex items-center justify-center gap-1"><Repeat size={9} /> Tap to flip back</span>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
