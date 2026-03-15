'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { motion } from 'motion/react';
import { Heart, MapPin, Star, Clock, Repeat } from 'lucide-react';
import { Navy, type PlaceItem, PLACE_CARD_SIZES, type PlaceCardSize } from '@travyl/shared';

function getDimensions(size: PlaceCardSize, overrideW?: number, overrideH?: number) {
  const preset = PLACE_CARD_SIZES[size];
  return { width: overrideW ?? preset.width, height: overrideH ?? preset.height };
}

function PriceLevel({ level }: { level: number }) {
  return (
    <span className="text-[11px] font-bold text-white ml-1.5">
      {'$'.repeat(level)}
      <span className="text-white/30">{'$'.repeat(4 - level)}</span>
    </span>
  );
}

// ─── Card Front ──────────────────────────────────────────────
function CardFrontInternal({
  place, size, isFav, onToggleFav, onClick, imageIndex = 0, width, height,
}: {
  place: PlaceItem; size: PlaceCardSize; isFav: boolean; onToggleFav: () => void;
  onClick?: () => void; imageIndex?: number; width: number; height: number;
}) {
  const images = place.images?.length ? place.images : [place.image];
  const isCompact = size === 'compact';
  const isFull = size === 'full';
  const [currentImg, setCurrentImg] = useState(images[imageIndex % images.length]);
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    setCurrentImg(images[imageIndex % images.length]);
    setImgError(false);
  }, [imageIndex, images]);

  return (
    <div
      onClick={onClick}
      className={`relative overflow-hidden bg-black group ${onClick ? 'cursor-pointer' : ''}`}
      style={{ width: width || '100%', height, borderRadius: 16 }}
    >
      {/* Background image */}
      {imgError ? (
        <div
          className="absolute inset-0 flex items-center justify-center"
          style={{ background: `linear-gradient(135deg, ${Navy.DEFAULT}, #2563eb)` }}
        >
          <MapPin size={isCompact ? 20 : 32} className="text-white/30" />
        </div>
      ) : (
        <Image
          src={currentImg}
          alt={place.name}
          fill
          className="object-cover transition-opacity duration-700 group-hover:scale-105 transition-transform"
          sizes={width ? `${width}px` : '100vw'}
          onError={() => setImgError(true)}
        />
      )}

      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />


      {/* Heart button — hidden on compact */}
      {!isCompact && (
        <button
          onClick={(e) => { e.stopPropagation(); onToggleFav(); }}
          className={`absolute rounded-full flex items-center justify-center transition-all z-10 ${
            isFav ? 'bg-red-500 shadow-lg' : 'bg-white/90 hover:bg-white shadow-sm'
          }`}
          style={{ top: 10, right: 10, width: 32, height: 32 }}
        >
          <Heart size={14} className={isFav ? 'text-white fill-white' : 'text-gray-400'} />
        </button>
      )}

      {/* Text overlay */}
      <div className="absolute bottom-0 left-0 right-0" style={{ padding: isCompact ? 10 : 14, paddingTop: 40 }}>
        {/* Type */}
        <p className="font-bold uppercase tracking-wider text-[#7dd3fc] drop-shadow-md" style={{ fontSize: isCompact ? 8 : 10, marginBottom: isCompact ? 2 : 4 }}>
          {place.type}
        </p>

        {/* Name + Rating */}
        <div className="flex items-center gap-2" style={{ marginBottom: isCompact ? 0 : 4 }}>
          <h3 className="font-extrabold text-white truncate drop-shadow-md" style={{ fontSize: isCompact ? 13 : isFull ? 20 : 16 }}>
            {place.name}
          </h3>
          {!isCompact && place.rating != null && (
            <span className="flex items-center gap-1 bg-black/45 text-white rounded-lg px-2 py-0.5 shrink-0">
              <Star size={10} className="text-yellow-400 fill-yellow-400" />
              <span className="text-[11px] font-bold">{place.rating.toFixed(1)}</span>
              {isFull && place.reviewCount && (
                <span className="text-[9px] text-white/60">({place.reviewCount.toLocaleString()})</span>
              )}
            </span>
          )}
          {!isCompact && place.type === 'restaurant' && place.priceLevel && (
            <PriceLevel level={place.priceLevel} />
          )}
        </div>

        {/* Location */}
        {!isCompact && place.tagline && (
          <div className="flex items-center gap-1 mb-1">
            <MapPin size={11} className="text-white/65 shrink-0" />
            <span className="text-xs text-white/65 truncate drop-shadow-md">{place.tagline}</span>
          </div>
        )}

        {/* Duration for experiences */}
        {!isCompact && (place.type === 'experience' || place.type === 'event') && place.duration && (
          <div className="flex items-center gap-1 mb-1">
            <Clock size={11} className="text-white/65" />
            <span className="text-xs text-white/65">{place.duration}</span>
          </div>
        )}

        {/* Hours — full only */}
        {isFull && place.hours && (
          <div className="flex items-center gap-1 mb-1">
            <Clock size={11} className="text-white/65" />
            <span className="text-xs text-white/65">{place.hours}</span>
          </div>
        )}

        {/* Description */}
        {!isCompact && place.description && (
          <p className="text-[13px] text-white/70 leading-snug drop-shadow-md" style={{ display: '-webkit-box', WebkitLineClamp: isFull ? 2 : 1, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
            {place.description}
          </p>
        )}
      </div>

      {/* Flip hint */}
      {!isCompact && (
        <div className="absolute bottom-3 right-3">
          <Repeat size={12} className="text-white/40" />
        </div>
      )}
    </div>
  );
}

// ─── Card Back (web version) ─────────────────────────────────
function CardBackWeb({ place, onFlip, width, height }: { place: PlaceItem; onFlip: () => void; width: number; height: number }) {
  return (
    <div
      onClick={onFlip}
      className="cursor-pointer overflow-hidden text-white"
      style={{ width, height, borderRadius: 16, backgroundColor: Navy.DEFAULT }}
    >
      <div className="h-full overflow-y-auto p-4">
        {/* Header */}
        <h3 className="text-lg font-bold mb-1">{place.name}</h3>
        <p className="text-xs text-white/60 uppercase tracking-wider mb-4">{place.category} · {place.type}</p>

        <div className="border-t border-white/10 pt-3 space-y-3">
          {/* Quick Facts */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            {place.rating != null && (
              <div className="bg-white/10 rounded-lg p-2">
                <span className="text-white/50 block mb-0.5">Rating</span>
                <span className="font-bold flex items-center gap-1">
                  <Star size={10} className="text-yellow-400 fill-yellow-400" />
                  {place.rating.toFixed(1)}
                  {place.reviewCount && <span className="text-white/50 font-normal">({place.reviewCount.toLocaleString()})</span>}
                </span>
              </div>
            )}
            {place.priceLevel && (
              <div className="bg-white/10 rounded-lg p-2">
                <span className="text-white/50 block mb-0.5">Price</span>
                <span className="font-bold">{'$'.repeat(place.priceLevel)}<span className="text-white/30">{'$'.repeat(4 - place.priceLevel)}</span></span>
              </div>
            )}
            {place.duration && (
              <div className="bg-white/10 rounded-lg p-2">
                <span className="text-white/50 block mb-0.5">Duration</span>
                <span className="font-bold">{place.duration}</span>
              </div>
            )}
            {place.hours && (
              <div className="bg-white/10 rounded-lg p-2">
                <span className="text-white/50 block mb-0.5">Hours</span>
                <span className="font-bold text-[10px]">{place.hours}</span>
              </div>
            )}
            {place.admissionFee && (
              <div className="bg-white/10 rounded-lg p-2">
                <span className="text-white/50 block mb-0.5">Admission</span>
                <span className="font-bold">{place.admissionFee}</span>
              </div>
            )}
            {place.bestTimeToVisit && (
              <div className="bg-white/10 rounded-lg p-2">
                <span className="text-white/50 block mb-0.5">Best Time</span>
                <span className="font-bold text-[10px]">{place.bestTimeToVisit}</span>
              </div>
            )}
          </div>

          {/* Address */}
          {place.address && (
            <div className="text-xs">
              <span className="text-white/50 block mb-0.5">Address</span>
              <span>{place.address}</span>
            </div>
          )}

          {/* Tips */}
          {place.tips?.length ? (
            <div className="text-xs">
              <span className="text-white/50 block mb-1">Tips</span>
              {place.tips.map((tip, i) => (
                <p key={i} className="text-white/80 italic mb-1 text-[11px]">💡 {tip}</p>
              ))}
            </div>
          ) : null}
        </div>

        {/* Flip hint */}
        <div className="text-center mt-4">
          <Repeat size={12} className="text-white/40 inline-block" />
          <span className="text-white/40 text-[10px] ml-1">Tap to flip</span>
        </div>
      </div>
    </div>
  );
}

// ─── Main PlaceCard Component ────────────────────────────────
interface PlaceCardProps {
  place: PlaceItem;
  size: PlaceCardSize;
  isFav: boolean;
  onToggleFav: () => void;
  onClick?: () => void;
  imageIndex?: number;
  width?: number;
  height?: number;
}

export function PlaceCard({
  place, size, isFav, onToggleFav, onClick, imageIndex = 0, width: overrideW, height: overrideH,
}: PlaceCardProps) {
  const { width, height } = getDimensions(size, overrideW, overrideH);
  const [isFlipped, setIsFlipped] = useState(false);

  if (size === 'compact') {
    return (
      <motion.div whileHover={{ y: -4 }} transition={{ duration: 0.2 }}>
        <CardFrontInternal
          place={place} size={size} isFav={isFav} onToggleFav={onToggleFav}
          onClick={onClick} imageIndex={imageIndex} width={width} height={height}
        />
      </motion.div>
    );
  }

  return (
    <div className="relative" style={{ width, height, perspective: 1000 }}>
      <motion.div
        animate={{ rotateY: isFlipped ? 180 : 0 }}
        transition={{ duration: 0.6, type: 'spring', damping: 15, stiffness: 100 }}
        style={{ width, height, transformStyle: 'preserve-3d', position: 'relative' }}
      >
        {/* Front */}
        <div style={{ position: 'absolute', width, height, backfaceVisibility: 'hidden' }}>
          <CardFrontInternal
            place={place} size={size} isFav={isFav} onToggleFav={onToggleFav}
            onClick={() => setIsFlipped(true)} imageIndex={imageIndex} width={width} height={height}
          />
        </div>
        {/* Back */}
        <div style={{ position: 'absolute', width, height, backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}>
          <CardBackWeb place={place} onFlip={() => setIsFlipped(false)} width={width} height={height} />
        </div>
      </motion.div>
    </div>
  );
}
