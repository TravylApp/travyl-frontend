'use client';

import Image from 'next/image';
import { Heart, MapPin, Star } from 'lucide-react';
import { motion } from 'motion/react';
import type { PlaceItem } from '@travyl/shared';

// ─── Deterministic hash for consistent randomization ────────
function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

type FrameStyle = 'polaroid' | 'rounded' | 'sharp' | 'asymmetric' | 'normal';

const FRAME_STYLES: FrameStyle[] = ['polaroid', 'rounded', 'sharp', 'asymmetric', 'normal'];

function getFrameStyle(id: string): FrameStyle {
  return FRAME_STYLES[hashCode(id) % FRAME_STYLES.length];
}

function getImageHeight(id: string): number {
  return 160 + (hashCode(id + 'h') % 241); // 160–400px
}

function getRotation(id: string): number {
  const seed = hashCode(id + 'rot');
  if (seed % 3 !== 0) return 0; // ~30% get rotation
  return ((seed % 5) - 2) * 0.8; // ±1.6 deg
}

function hasTape(id: string): boolean {
  return hashCode(id + 'tape') % 3 === 0; // ~33%
}

const frameClasses: Record<FrameStyle, { container: string; image: string }> = {
  polaroid: {
    container: 'rounded-sm bg-white p-1.5 pb-3 shadow-md',
    image: 'rounded-sm',
  },
  rounded: {
    container: 'rounded-2xl overflow-hidden shadow-sm',
    image: 'rounded-2xl',
  },
  sharp: {
    container: 'rounded-none overflow-hidden shadow-sm',
    image: 'rounded-none',
  },
  asymmetric: {
    container: 'rounded-tl-3xl rounded-br-3xl rounded-tr-md rounded-bl-md overflow-hidden shadow-sm',
    image: 'rounded-tl-3xl rounded-br-3xl rounded-tr-md rounded-bl-md',
  },
  normal: {
    container: 'rounded-xl overflow-hidden shadow-sm',
    image: 'rounded-xl',
  },
};

export interface PinCardProps {
  item: PlaceItem;
  index: number;
  isFavorited: boolean;
  onFavorite: (id: string) => void;
  onClick?: (id: string) => void;
}

export function PinCard({ item, index, isFavorited, onFavorite, onClick }: PinCardProps) {
  const frame = getFrameStyle(item.id);
  const imgHeight = getImageHeight(item.id);
  const rotation = getRotation(item.id);
  const showTape = hasTape(item.id);
  const fc = frameClasses[frame];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: Math.min(index * 0.04, 0.6) }}
      style={{ rotate: rotation ? `${rotation}deg` : undefined }}
      className="break-inside-avoid mb-2"
    >
      <div
        className={`group relative bg-white border border-gray-100 cursor-pointer transition-all duration-300 hover:shadow-xl hover:-translate-y-0.5 ${fc.container}`}
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
        <div className={`relative overflow-hidden ${fc.image}`} style={{ height: imgHeight }}>
          <Image
            src={item.image}
            alt={item.name}
            fill
            className="object-cover group-hover:scale-110 transition-transform duration-500"
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
          />
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

          {/* Category badge */}
          <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-white/80 backdrop-blur-sm text-[10px] font-medium text-gray-700 z-10">
            {item.category}
          </div>

          {/* Rating badge */}
          <div className="absolute bottom-2 left-2 flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-black/50 backdrop-blur-sm z-10">
            <Star size={10} className="text-amber-400 fill-amber-400" />
            <span className="text-[10px] font-medium text-white">{item.rating}</span>
          </div>
        </div>

        {/* Content */}
        <div className="px-2.5 pt-2 pb-2.5">
          <div className="flex items-center gap-1 text-[10px] text-gray-500 mb-0.5">
            <MapPin size={9} className="shrink-0" />
            <span className="truncate">{item.tagline}</span>
          </div>
          <h3 className="text-[13px] font-semibold text-gray-900 leading-tight mb-0.5 line-clamp-1">{item.name}</h3>
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
