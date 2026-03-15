'use client';

import { useState } from 'react';
import { Heart, Clock, MapPin, Star, ChevronLeft, ChevronRight, CalendarCheck } from 'lucide-react';
import { getActivityTypeColor, Navy } from '@travyl/shared';
import type { ActivityViewModel } from '@travyl/shared';

interface CompactActivityCardProps {
  activity: ActivityViewModel;
  images?: string[];
  rating?: number;
  onClick?: () => void;
  onFavorite?: () => void;
  isFavorited?: boolean;
}

export function CompactActivityCard({
  activity,
  images = [],
  rating,
  onClick,
  onFavorite,
  isFavorited = false,
}: CompactActivityCardProps) {
  const [currentImage, setCurrentImage] = useState(0);
  const [imgError, setImgError] = useState(false);
  const typeColor = getActivityTypeColor(activity.category);
  const hasImages = images.length > 0 && !imgError;

  const prevImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentImage((i) => (i === 0 ? images.length - 1 : i - 1));
  };

  const nextImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentImage((i) => (i === images.length - 1 ? 0 : i + 1));
  };

  return (
    <div
      className="rounded-xl bg-white border border-gray-200 overflow-hidden cursor-pointer group transition-all hover:shadow-lg hover:scale-[1.01]"
      onClick={onClick}
    >
      {/* Image section */}
      <div className="relative h-40 overflow-hidden" style={{ backgroundColor: typeColor.bg }}>
        {hasImages ? (
          <img
            src={images[currentImage]}
            alt={activity.name}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            onError={() => setImgError(true)}
          />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center"
            style={{ background: `linear-gradient(135deg, ${Navy.DEFAULT}, #2563eb)` }}
          >
            <MapPin size={28} className="text-white/30" />
          </div>
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />

        {/* Favorite button */}
        <button
          onClick={(e) => { e.stopPropagation(); onFavorite?.(); }}
          className="absolute top-2 right-2 w-7 h-7 bg-white/90 rounded-full flex items-center justify-center hover:bg-white transition-colors shadow-sm"
        >
          <Heart size={12} className={isFavorited ? 'text-red-500 fill-red-500' : 'text-gray-500'} />
        </button>

        {/* Carousel arrows (on hover) */}
        {images.length > 1 && (
          <>
            <button
              onClick={prevImage}
              className="absolute left-1.5 top-1/2 -translate-y-1/2 w-6 h-6 bg-white/80 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
            >
              <ChevronLeft size={12} className="text-gray-700" />
            </button>
            <button
              onClick={nextImage}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 w-6 h-6 bg-white/80 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
            >
              <ChevronRight size={12} className="text-gray-700" />
            </button>
          </>
        )}

        {/* Dots indicator */}
        {images.length > 1 && (
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-1">
            {images.map((_, i) => (
              <div
                key={i}
                className={`w-1.5 h-1.5 rounded-full transition-all ${
                  i === currentImage ? 'bg-white w-3' : 'bg-white/50'
                }`}
              />
            ))}
          </div>
        )}

        {/* Title overlay */}
        <div className="absolute bottom-0 left-0 right-0 px-3 pb-2">
          <h3 className="text-white font-semibold text-sm line-clamp-1">{activity.name}</h3>
          {activity.locationName && (
            <div className="flex items-center gap-1 mt-0.5">
              <MapPin size={9} className="text-white/85" />
              <span className="text-[10px] text-white/85 truncate">{activity.locationName}</span>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="px-3 pt-1.5 pb-2.5">
        {/* Location */}
        {activity.locationName && (
          <div className="flex items-center gap-1 text-[10px] text-gray-500">
            <MapPin size={9} />
            <span className="truncate">{activity.locationName}</span>
          </div>
        )}

        {/* Rating stars + time */}
        <div className="flex items-center gap-2 mt-1">
          <div className="flex items-center gap-0.5">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star
                key={i}
                size={9}
                className={i < Math.floor(rating ?? 4.5) ? 'text-amber-400 fill-amber-400' : 'text-gray-300'}
              />
            ))}
            <span className="text-[10px] text-gray-500 ml-0.5">{(rating ?? 4.5).toFixed(1)}</span>
          </div>
          {activity.timeDisplay && (
            <div className="flex items-center gap-0.5 text-[10px] text-gray-500">
              <Clock size={9} className="text-gray-400" />
              <span>{activity.timeDisplay}</span>
            </div>
          )}
        </div>

        {/* Price */}
        {activity.costDisplay && (
          <div className="text-[11px] font-semibold text-gray-900 mt-1">{activity.costDisplay}</div>
        )}

        {/* Description / Notes */}
        {activity.notes && (
          <p className="text-[10px] text-gray-600 mt-1 line-clamp-2 leading-relaxed">{activity.notes}</p>
        )}


        {/* Booked info bar */}
        {activity.startTime && (
          <div className="flex items-center gap-1.5 mt-2 pt-1.5 border-t border-gray-100">
            <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-medium">
              <CalendarCheck size={9} />
              Booked
            </div>
            <span className="text-[10px] text-gray-400">{activity.startTime}{activity.endTime ? ` – ${activity.endTime}` : ''}</span>
          </div>
        )}
      </div>
    </div>
  );
}
