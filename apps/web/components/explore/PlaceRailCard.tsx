'use client';

import { useState } from 'react';
import { Heart, MapPin, Star } from 'lucide-react';
import type { PlaceItem } from '@travyl/shared';

export interface PlaceRailCardProps {
  place: PlaceItem;
  isFavorited: boolean;
  onFavorite: (id: string) => void;
  onClick: (place: PlaceItem) => void;
}

export function PlaceRailCard({ place, isFavorited, onFavorite, onClick }: PlaceRailCardProps) {
  const [imageBroken, setImageBroken] = useState(false);
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onClick(place)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick(place);
        }
      }}
      className="group shrink-0 snap-start w-[260px] sm:w-[280px] text-left rounded-2xl overflow-hidden bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.08] hover:shadow-lg dark:hover:border-white/20 transition-all duration-300 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--trip-base)]"
    >
      <div className="relative h-[180px] overflow-hidden bg-gradient-to-br from-[#e8d5c0] to-[#d4b896]">
        {place.image && !imageBroken ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={place.image}
            alt={place.name}
            referrerPolicy="no-referrer"
            loading="lazy"
            onError={() => setImageBroken(true)}
            className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-white/70">
            <MapPin size={28} />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onFavorite(place.id); }}
          aria-label={isFavorited ? 'Remove from favorites' : 'Save to favorites'}
          className={`absolute top-2.5 right-2.5 w-8 h-8 rounded-full flex items-center justify-center backdrop-blur-sm transition-colors ${
            isFavorited ? 'bg-red-500 text-white' : 'bg-white/85 dark:bg-black/55 text-gray-700 dark:text-white hover:bg-white'
          }`}
        >
          <Heart size={14} className={isFavorited ? 'fill-current' : ''} />
        </button>
        {place.category && (
          <span className="absolute bottom-2.5 left-2.5 px-2 h-6 inline-flex items-center rounded-full bg-white/90 dark:bg-black/60 backdrop-blur-sm text-[10px] font-semibold uppercase tracking-[0.08em] text-[#1e3a5f] dark:text-white">
            {place.category}
          </span>
        )}
      </div>

      <div className="px-3.5 py-3">
        <h3 className="text-[15px] font-semibold text-gray-900 dark:text-white leading-tight line-clamp-1 mb-1">
          {place.name}
        </h3>
        <div className="flex items-center gap-2 text-[12px] text-gray-500 dark:text-white/60">
          {place.rating > 0 && (
            <span className="inline-flex items-center gap-0.5">
              <Star size={11} className="fill-amber-400 text-amber-400" />
              <span className="tabular-nums">{place.rating.toFixed(1)}</span>
            </span>
          )}
          {place.address && (
            <span className="truncate">{place.address}</span>
          )}
        </div>
      </div>
    </div>
  );
}
