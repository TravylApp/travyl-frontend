'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Heart, Star, MapPin, ChevronLeft, ChevronRight, CalendarCheck, TicketPercent, Clock, ExternalLink, PlusCircle, MinusCircle } from 'lucide-react';
import { motion } from 'motion/react';
import type { DiscoverItem } from '@travyl/shared';

// ─── Deterministic hash ─────────────────────────────────────
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
  return 140 + (hashCode(id + 'h') % 120); // 140–260px
}

function getRotation(id: string): number {
  const seed = hashCode(id + 'rot');
  if (seed % 4 !== 0) return 0;
  return ((seed % 5) - 2) * 0.6;
}

function hasTape(id: string): boolean {
  return hashCode(id + 'tape') % 4 === 0;
}

const frameClasses: Record<FrameStyle, { container: string; image: string }> = {
  polaroid: { container: 'rounded-sm bg-white p-1.5 pb-2.5 shadow-md', image: 'rounded-sm' },
  rounded: { container: 'rounded-2xl overflow-hidden shadow-sm', image: 'rounded-2xl' },
  sharp: { container: 'rounded-none overflow-hidden shadow-sm', image: 'rounded-none' },
  asymmetric: { container: 'rounded-tl-3xl rounded-br-3xl rounded-tr-md rounded-bl-md overflow-hidden shadow-sm', image: 'rounded-tl-3xl rounded-br-3xl rounded-tr-md rounded-bl-md' },
  normal: { container: 'rounded-xl overflow-hidden shadow-sm', image: 'rounded-xl' },
};

export interface ItineraryPinCardProps {
  item: DiscoverItem;
  index: number;
  accentColor: string;
  isFavorited: boolean;
  onFavorite: (id: string) => void;
  onClick?: () => void;
  onAddToItinerary?: (id: string) => void;
  onRemoveFromItinerary?: (id: string) => void;
  flat?: boolean;
}

export function ItineraryPinCard({ item, index, accentColor, isFavorited, onFavorite, onClick, onAddToItinerary, onRemoveFromItinerary, flat = false }: ItineraryPinCardProps) {
  const [imageIndex, setImageIndex] = useState(0);
  const frame = flat ? 'normal' as FrameStyle : getFrameStyle(item.id);
  const imgHeight = flat ? 160 : getImageHeight(item.id);
  const rotation = flat ? 0 : getRotation(item.id);
  const showTape = flat ? false : hasTape(item.id);
  const fc = frameClasses[frame];
  const images = item.images.length > 0 ? item.images : [''];
  const hasMultiple = images.length > 1;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: Math.min(index * 0.03, 0.5) }}
      style={{ rotate: rotation ? `${rotation}deg` : undefined }}
      className="break-inside-avoid mb-2"
    >
      <div
        className={`group relative bg-white cursor-pointer transition-all duration-300 hover:shadow-xl hover:-translate-y-0.5 ${fc.container}`}
        style={{
          border: item.isBooked ? `2px solid ${accentColor}` : '1px solid #e5e7eb',
        }}
        onClick={onClick}
      >
        {/* Tape */}
        {showTape && (
          <div
            className="absolute -top-2 left-1/2 -translate-x-1/2 z-10 w-10 h-4"
            style={{
              background: 'linear-gradient(135deg, #f59e0b80, #fbbf2480)',
              clipPath: 'polygon(10% 0%, 90% 0%, 100% 100%, 0% 100%)',
            }}
          />
        )}

        {/* Image carousel */}
        <div className={`relative overflow-hidden ${fc.image}`} style={{ height: imgHeight }}>
          {images[0] ? (
            <Image
              src={images[imageIndex] || images[0]}
              alt={item.name}
              fill
              className="object-cover group-hover:scale-110 transition-transform duration-500"
              sizes="(max-width: 640px) 100vw, (max-width: 900px) 50vw, 33vw"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-gray-200 to-gray-300" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-60 group-hover:opacity-80 transition-opacity duration-300" />

          {/* Carousel arrows */}
          {hasMultiple && (
            <>
              <button
                onClick={(e) => { e.stopPropagation(); setImageIndex((i) => (i > 0 ? i - 1 : images.length - 1)); }}
                className="absolute left-1 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-white/80 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10"
              >
                <ChevronLeft size={12} />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); setImageIndex((i) => (i < images.length - 1 ? i + 1 : 0)); }}
                className="absolute right-1 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-white/80 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10"
              >
                <ChevronRight size={12} />
              </button>
              {/* Dots */}
              <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 flex gap-1 z-10">
                {images.map((_, i) => (
                  <div key={i} className={`w-1.5 h-1.5 rounded-full transition-all ${i === imageIndex ? 'bg-white w-3' : 'bg-white/50'}`} />
                ))}
              </div>
              {/* Photo count */}
              <div className="absolute bottom-1.5 right-1.5 px-1.5 py-0.5 rounded bg-black/50 text-[9px] text-white z-10">
                {imageIndex + 1}/{images.length}
              </div>
            </>
          )}

          {/* Booked badge */}
          {item.isBooked && !flat && (
            <div className="absolute top-1.5 left-1.5 flex items-center gap-1 z-10">
              <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/90 text-white text-[10px] font-medium">
                <CalendarCheck size={10} />
                Day {item.bookedDay} · {item.category}
              </div>
              {item.bookedTime && (
                <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-black/50 text-white text-[10px] font-medium">
                  <Clock size={10} />
                  {item.bookedTime}
                </div>
              )}
            </div>
          )}
          {/* Flat mode: category badge only */}
          {item.isBooked && flat && (
            <div className="absolute top-1.5 left-1.5 z-10">
              <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/90 text-white text-[10px] font-medium">
                <CalendarCheck size={10} />
                {item.category}
              </div>
            </div>
          )}

          {/* Deal badge */}
          {item.dealPrice && (
            <div className="absolute top-1.5 right-10 flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-500/90 text-white text-[10px] font-medium z-10">
              <TicketPercent size={10} />
              <span className="line-through opacity-70">{item.originalPrice}</span>
              <span>{item.dealPrice}</span>
            </div>
          )}

          {/* Favorite */}
          <button
            onClick={(e) => { e.stopPropagation(); onFavorite(item.id); }}
            className={`absolute top-1.5 right-1.5 w-7 h-7 rounded-full backdrop-blur-sm flex items-center justify-center shadow-sm hover:scale-110 transition-transform z-10 ${isFavorited ? 'bg-red-500 shadow-lg' : 'bg-white/90'}`}
          >
            <Heart size={12} className={isFavorited ? 'text-white fill-white' : 'text-gray-500'} />
          </button>
        </div>

        {/* Content */}
        <div className="px-2.5 pt-1.5 pb-2">
          <h3 className="text-[12px] font-semibold text-gray-900 leading-tight line-clamp-1">{item.name}</h3>

          <div className="flex items-center gap-2 mt-0.5">
            <div className="flex items-center gap-0.5 text-[10px] text-gray-500">
              <MapPin size={9} />
              <span className="truncate">{item.location}</span>
            </div>
            {item.distance && (
              <span className="text-[9px] text-gray-400">{item.distance}</span>
            )}
          </div>

          <div className="flex items-center gap-2 mt-1">
            {/* Rating stars */}
            <div className="flex items-center gap-0.5">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star
                  key={i}
                  size={9}
                  className={i < Math.floor(item.rating) ? 'text-amber-400 fill-amber-400' : 'text-gray-300'}
                />
              ))}
              <span className="text-[10px] text-gray-500 ml-0.5">{item.rating}</span>
            </div>

            {item.isOpen !== undefined && (
              <span className={`text-[9px] font-medium ${item.isOpen ? 'text-emerald-600' : 'text-red-500'}`}>
                {item.isOpen ? 'Open' : 'Closed'}
              </span>
            )}
          </div>

          {item.price && (
            <div className="text-[11px] font-semibold text-gray-900 mt-1">{item.price}</div>
          )}

          {/* Description */}
          {item.description && (
            <p className="text-[10px] text-gray-600 mt-1 line-clamp-2 leading-relaxed">{item.description}</p>
          )}

          {/* Tags */}
          {item.tags && item.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1.5">
              {item.tags.slice(0, 3).map(tag => (
                <span key={tag} className="px-2 py-0.5 rounded-md text-[9px] bg-gray-100 border border-gray-200 text-gray-500">{tag}</span>
              ))}
            </div>
          )}

          {/* Time display (flat mode) */}
          {flat && item.bookedTime && (
            <div className="flex items-center gap-1 mt-1.5 text-[10px] text-gray-500">
              <Clock size={9} className="text-gray-400" />
              <span>{item.bookedTime}</span>
            </div>
          )}

          {/* Compact action row */}
          <div className="flex items-center justify-between border-t border-gray-100 pt-1.5 mt-1.5">
            {/* Left: Add/Remove button */}
            {item.isBooked && onRemoveFromItinerary ? (
              <button
                onClick={(e) => { e.stopPropagation(); onRemoveFromItinerary(item.id); }}
                className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-medium text-red-600 bg-red-50 border border-red-100 hover:bg-red-100 transition-colors"
              >
                <MinusCircle size={10} />
                Remove
              </button>
            ) : !item.isBooked && onAddToItinerary ? (
              <button
                onClick={(e) => { e.stopPropagation(); onAddToItinerary(item.id); }}
                className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-semibold text-white transition-colors"
                style={{ backgroundColor: accentColor }}
              >
                <PlusCircle size={10} />
                Add
              </button>
            ) : (
              <span />
            )}

            {/* Right: Book Now link */}
            {item.bookingUrl && (
              <a
                href={item.bookingUrl}
                onClick={(e) => e.stopPropagation()}
                className="flex items-center gap-1 text-[10px] font-semibold transition-colors hover:opacity-80"
                style={{ color: accentColor }}
              >
                <ExternalLink size={10} />
                {item.bookingLabel || 'Book Now'}
              </a>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
