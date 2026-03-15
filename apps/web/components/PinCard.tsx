'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Heart, MapPin, Star } from 'lucide-react';
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

function getAspectRatio(id: string): number {
  return 0.95 + (hashCode(id + 'ar') % 20) / 100; // 0.95–1.14 (tighter range for balanced masonry)
}

function getRotation(_id: string): number {
  return 0; // disabled — rotation causes visual overlap in tight masonry grids
}

function hasTape(id: string): boolean {
  return hashCode(id + 'tape') % 4 === 0; // ~25%
}

export interface PinCardProps {
  item: PlaceItem;
  index: number;
  isFavorited: boolean;
  onFavorite: (id: string) => void;
  onClick?: (id: string) => void;
}

export function PinCard({ item, index, isFavorited, onFavorite, onClick }: PinCardProps) {
  const [imgError, setImgError] = useState(false);
  const aspectRatio = getAspectRatio(item.id);
  const rotation = getRotation(item.id);
  const showTape = hasTape(item.id);

  return (
    <motion.div
      initial={{ opacity: 0, y: 28, scale: 0.93 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{
        duration: 0.5,
        delay: Math.min(index * 0.06, 0.8),
        ease: [0.22, 1, 0.36, 1],
      }}
      style={{ rotate: rotation ? `${rotation}deg` : undefined }}
      className="break-inside-avoid"
    >
      <div
        className="group relative bg-white border border-gray-100 rounded-xl overflow-hidden cursor-pointer transition-all duration-300 hover:shadow-xl hover:-translate-y-0.5 shadow-sm"
        onClick={() => onClick?.(item.id)}
      >
        {/* Decorative tape */}
        {showTape && (
          <div
            className="absolute -top-2 left-1/2 -translate-x-1/2 z-10 w-12 h-5"
            style={{
              background: 'linear-gradient(135deg, #f59e0b80, #fbbf2480)',
              clipPath: 'polygon(10% 0%, 90% 0%, 100% 100%, 0% 100%)',
            }}
          />
        )}

        {/* Image */}
        <div className="relative overflow-hidden rounded-t-xl" style={{ aspectRatio }}>
          {imgError ? (
            <div
              className="absolute inset-0 flex items-center justify-center"
              style={{ background: `linear-gradient(135deg, ${Navy.DEFAULT}, #2563eb)` }}
            >
              <MapPin size={28} className="text-white/30" />
            </div>
          ) : (
            <Image
              src={item.image}
              alt={item.name}
              fill
              className="object-cover group-hover:scale-110 transition-transform duration-500"
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
              onError={() => setImgError(true)}
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />

          {/* Favorite button */}
          <button
            onClick={(e) => { e.stopPropagation(); onFavorite(item.id); }}
            className="absolute top-2 right-2 w-8 h-8 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center shadow-sm hover:scale-110 transition-transform z-10"
          >
            <Heart
              size={14}
              className={isFavorited ? 'text-red-500 fill-red-500' : 'text-gray-500'}
            />
          </button>
        </div>

        {/* Content */}
        <div className="px-2.5 pt-2 pb-2.5">
          <div className="flex items-center gap-1 text-[10px] text-gray-500 mb-0.5">
            <MapPin size={9} className="shrink-0" />
            <span className="truncate">{item.tagline}</span>
          </div>
          <div className="flex items-center gap-1.5 mb-0.5">
            <h3 className="text-[13px] font-semibold text-gray-900 leading-tight line-clamp-1 flex-1 min-w-0">{item.name}</h3>
            <div className="flex items-center gap-0.5 shrink-0">
              <Star size={10} className="text-amber-400 fill-amber-400" />
              <span className="text-[10px] font-medium text-gray-600">{item.rating}</span>
            </div>
          </div>
          {item.description && (
            <p className="text-[11px] text-gray-500 line-clamp-2 leading-relaxed">{item.description}</p>
          )}
          {item.tags && item.tags.length > 0 && (
            <div className="flex gap-1 mt-1.5 flex-wrap">
              {item.tags.slice(0, 3).map((tag) => (
                <span key={tag} className="px-1.5 py-0.5 bg-gray-100 rounded-full text-[9px] text-gray-500">{tag}</span>
              ))}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
