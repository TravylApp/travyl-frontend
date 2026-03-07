'use client';

import { useState } from 'react';
import {
  Heart, Star, MapPin, ChevronLeft, ChevronRight,
  Plus, X, CalendarCheck, Clock, Images, ExternalLink, TicketPercent,
  Image as ImageIcon,
} from 'lucide-react';
import type { DiscoverItem } from '@travyl/shared';

interface DiscoverCardProps {
  item: DiscoverItem;
  accentColor?: string;
  onFavorite?: (id: string) => void;
  isFavorited?: boolean;
  onAddToItinerary?: (id: string) => void;
  onRemoveFromItinerary?: (id: string) => void;
  compact?: boolean;
  onClick?: () => void;
}

function RatingStars({ rating, size = 11 }: { rating: number; size?: number }) {
  const full = Math.floor(rating);
  const half = rating - full >= 0.3;
  const empty = 5 - full - (half ? 1 : 0);
  return (
    <div className="flex items-center gap-px">
      {Array.from({ length: full }).map((_, i) => (
        <Star key={`f${i}`} size={size} className="text-amber-400" fill="#fbbf24" />
      ))}
      {half && (
        <div className="relative" style={{ width: size, height: size }}>
          <Star size={size} className="text-gray-200 absolute" fill="#e5e7eb" />
          <div className="absolute overflow-hidden" style={{ width: size / 2 }}>
            <Star size={size} className="text-amber-400" fill="#fbbf24" />
          </div>
        </div>
      )}
      {Array.from({ length: empty }).map((_, i) => (
        <Star key={`e${i}`} size={size} className="text-gray-200" fill="#e5e7eb" />
      ))}
    </div>
  );
}

export function DiscoverCard({
  item,
  accentColor = '#1e3a5f',
  onFavorite,
  isFavorited = false,
  onAddToItinerary,
  onRemoveFromItinerary,
  compact = false,
  onClick,
}: DiscoverCardProps) {
  const [imgIndex, setImgIndex] = useState(0);
  const [hovered, setHovered] = useState(false);
  const [imgError, setImgError] = useState(false);

  const hasBooking = !!item.bookingUrl;
  const bookLabel = item.bookingLabel || (hasBooking ? 'Book Now' : '');
  const hasImages = item.images.length > 0 && !imgError;

  return (
    <div
      className={`bg-white rounded-2xl overflow-hidden transition-all duration-300 group cursor-pointer border-2 ${
        item.isBooked ? '' : 'border-transparent'
      }`}
      style={{
        borderColor: item.isBooked ? accentColor : undefined,
        boxShadow: hovered
          ? '0px 20px 25px -5px rgba(0,0,0,0.1), 0px 8px 10px -6px rgba(0,0,0,0.1)'
          : '0px 10px 15px -3px rgba(0,0,0,0.08), 0px 4px 6px -4px rgba(0,0,0,0.05)',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={onClick}
    >
      {/* Image Section */}
      <div className={`relative ${compact ? 'h-[220px]' : 'h-[260px]'} overflow-hidden`}>
        {hasImages ? (
          <img
            src={item.images[imgIndex]}
            alt={item.name}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="w-full h-full bg-gray-100 flex items-center justify-center">
            <ImageIcon size={32} className="text-gray-300" />
          </div>
        )}

        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/0 to-transparent" />

        {/* Carousel arrows */}
        {item.images.length > 1 && hovered && (
          <>
            <button
              onClick={(e) => { e.stopPropagation(); setImgIndex((p) => (p - 1 + item.images.length) % item.images.length); }}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 w-7 h-7 bg-white/90 hover:bg-white rounded-full flex items-center justify-center shadow-lg transition-all"
            >
              <ChevronLeft size={14} className="text-gray-700" />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); setImgIndex((p) => (p + 1) % item.images.length); }}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 w-7 h-7 bg-white/90 hover:bg-white rounded-full flex items-center justify-center shadow-lg transition-all"
            >
              <ChevronRight size={14} className="text-gray-700" />
            </button>
          </>
        )}

        {/* Carousel dots */}
        {item.images.length > 1 && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5">
            {item.images.map((_, i) => (
              <button
                key={i}
                onClick={(e) => { e.stopPropagation(); setImgIndex(i); }}
                className={`rounded-full transition-all ${
                  i === imgIndex ? 'w-5 h-1.5 bg-white' : 'w-1.5 h-1.5 bg-white/60 hover:bg-white/80'
                }`}
              />
            ))}
          </div>
        )}

        {/* Photo count */}
        {item.images.length > 1 && (
          <div className="absolute bottom-3 right-3 flex items-center gap-1 bg-black/50 backdrop-blur-sm px-1.5 py-0.5 rounded text-[9px] text-white/90">
            <Images size={9} />
            {item.images.length}
          </div>
        )}

        {/* Favorite */}
        <button
          onClick={(e) => { e.stopPropagation(); onFavorite?.(item.id); }}
          className="absolute top-3 right-3 w-8 h-8 bg-white/95 hover:bg-white rounded-full flex items-center justify-center shadow-lg transition-all hover:scale-110"
        >
          <Heart size={15} className={isFavorited ? 'text-red-500 fill-red-500' : 'text-gray-400'} />
        </button>

        {/* Rating badge */}
        <div className="absolute bottom-3 left-3 flex items-center gap-1.5 bg-white/80 backdrop-blur-sm px-2 py-1 rounded-lg shadow-sm">
          <Star size={12} className="text-amber-400" fill="#fbbf24" />
          <span className="text-xs text-gray-900" style={{ fontWeight: 600 }}>{item.rating}</span>
        </div>

        {/* Booked badge */}
        {item.isBooked && (
          <div className="absolute top-3 left-3 flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] text-white bg-emerald-500 shadow-lg" style={{ fontWeight: 500 }}>
            <CalendarCheck size={11} />
            Day {item.bookedDay}{item.mealType ? ` · ${item.mealType}` : ''}
          </div>
        )}

        {/* Price badge (non-booked) */}
        {item.price && !item.isBooked && (
          <div
            className="absolute top-3 left-3 px-2.5 py-1 rounded-lg text-[11px] text-white shadow-lg"
            style={{ backgroundColor: accentColor, fontWeight: 500 }}
          >
            {item.price}
          </div>
        )}

        {/* Deal badge */}
        {item.dealPrice && item.originalPrice && (
          <div className="absolute top-12 left-3 flex items-center gap-1.5 bg-red-500 px-2 py-1 rounded-lg shadow-lg">
            <TicketPercent size={10} className="text-white" />
            <span className="text-[10px] text-white/70 line-through">{item.originalPrice}</span>
            <span className="text-[11px] text-white" style={{ fontWeight: 600 }}>{item.dealPrice}</span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        {/* Location + distance */}
        <div className="flex items-center justify-between gap-2 mb-1">
          <div className="flex items-center gap-1 text-[12px] text-gray-500 min-w-0">
            <MapPin size={11} className="flex-shrink-0 text-gray-400" />
            <span className="truncate">{item.location}</span>
          </div>
          {item.distance && (
            <span className="text-[10px] text-gray-400 whitespace-nowrap flex-shrink-0">{item.distance}</span>
          )}
        </div>

        {/* Title */}
        <h3 className="text-[17px] text-gray-900 mb-1 line-clamp-1 tracking-tight" style={{ fontWeight: 700 }}>
          {item.name}
        </h3>

        {/* Stars + reviews */}
        <div className="flex items-center gap-2 mb-1.5 flex-wrap">
          <RatingStars rating={item.rating} size={12} />
          {item.reviewCount && (
            <span className="text-[11px] text-gray-400">{item.reviewCount.toLocaleString()} reviews</span>
          )}
        </div>

        {/* Price · Cuisine · Time · Open status */}
        <div className="flex items-center gap-1.5 mb-1.5 text-[12px] flex-wrap">
          {item.price && (
            <span className="text-gray-900" style={{ fontWeight: 600 }}>{item.price}</span>
          )}
          {item.price && item.cuisine && <span className="text-gray-300">·</span>}
          {item.cuisine && <span className="text-gray-500">{item.cuisine}</span>}
          {item.bookedTime && (
            <>
              <span className="text-gray-300">·</span>
              <span className="flex items-center gap-0.5 text-gray-400">
                <Clock size={10} />{item.bookedTime}
              </span>
            </>
          )}
          {item.isOpen !== undefined && (
            <>
              <span className="text-gray-300">·</span>
              <span className={`text-[11px] ${item.isOpen ? 'text-emerald-600' : 'text-red-500'}`} style={{ fontWeight: 500 }}>
                {item.isOpen ? 'Open Now' : 'Closed'}
              </span>
            </>
          )}
        </div>

        {/* Description */}
        <p className="text-[13px] text-gray-500 leading-[20px] line-clamp-2 mb-2.5 tracking-tight">
          {item.description}
        </p>

        {/* Tags */}
        <div className="flex flex-wrap gap-1.5">
          {item.tags.slice(0, 3).map((tag, i) => (
            <span
              key={i}
              className="px-2.5 py-1 rounded-full text-[11px] border"
              style={{
                backgroundColor: `${accentColor}0a`,
                color: accentColor,
                borderColor: `${accentColor}20`,
              }}
            >
              {tag}
            </span>
          ))}
        </div>

        {/* Action Row */}
        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100">
          {item.isBooked && onRemoveFromItinerary && (
            <button
              onClick={(e) => { e.stopPropagation(); onRemoveFromItinerary(item.id); }}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] transition-all border border-gray-200 text-gray-400 hover:text-red-500 hover:border-red-200 hover:bg-red-50"
              style={{ fontWeight: 500 }}
            >
              <X size={11} />
              Remove
            </button>
          )}

          {!item.isBooked && onAddToItinerary && (
            <button
              onClick={(e) => { e.stopPropagation(); onAddToItinerary(item.id); }}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] transition-all border text-gray-600 hover:text-white"
              style={{
                fontWeight: 500,
                borderColor: `${accentColor}30`,
              }}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = accentColor; e.currentTarget.style.color = '#fff'; e.currentTarget.style.borderColor = accentColor; }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = ''; e.currentTarget.style.color = ''; e.currentTarget.style.borderColor = `${accentColor}30`; }}
            >
              <Plus size={11} />
              Add to Itinerary
            </button>
          )}

          <div className="flex-1" />

          {hasBooking && (
            <a
              href={item.bookingUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] text-white transition-all hover:opacity-90 shadow-sm"
              style={{ backgroundColor: '#10b981', fontWeight: 600 }}
            >
              <ExternalLink size={10} />
              {bookLabel}
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
