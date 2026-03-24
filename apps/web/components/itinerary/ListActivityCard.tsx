'use client';

import { useState } from 'react';
import { Heart, Clock, Star, MapPin, ChevronRight } from 'lucide-react';
import { getActivityTypeColor, Navy } from '@travyl/shared';
import type { ActivityViewModel } from '@travyl/shared';

interface ListActivityCardProps {
  activity: ActivityViewModel;
  images?: string[];
  rating?: number;
  onClick?: () => void;
  onFavorite?: () => void;
  isFavorited?: boolean;
}

export function ListActivityCard({
  activity,
  images = [],
  rating,
  onClick,
  onFavorite,
  isFavorited = false,
}: ListActivityCardProps) {
  const [imgError, setImgError] = useState(false);
  const typeColor = getActivityTypeColor(activity.category);
  const actImg = activity.image;
  const imgSrc = images[0] || actImg;
  const hasImage = !!imgSrc && !imgError;

  return (
    <div
      className="flex gap-3 rounded-xl bg-white dark:bg-[var(--muted)] border border-gray-100 dark:border-white/[0.08] overflow-hidden cursor-pointer group transition-all hover:shadow-md hover:border-gray-200 dark:hover:border-white/[0.15]"
      onClick={onClick}
    >
      {/* Image — fixed square */}
      <div className="w-[88px] h-[88px] shrink-0 relative overflow-hidden">
        {hasImage ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imgSrc!}
              alt={activity.name}
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              onError={() => setImgError(true)}
            />
            <div className="absolute inset-0 bg-gradient-to-r from-transparent to-black/5" />
          </>
        ) : (
          <div
            className="w-full h-full flex items-center justify-center"
            style={{ background: `linear-gradient(135deg, ${typeColor.primary}20, ${typeColor.primary}40)` }}
          >
            <MapPin size={20} style={{ color: typeColor.primary, opacity: 0.4 }} />
          </div>
        )}
        {/* Category pill on image */}
        <div className="absolute bottom-1.5 left-1.5">
          <span
            className="px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider text-white"
            style={{ backgroundColor: typeColor.primary + 'CC' }}
          >
            {activity.category}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 py-2 pr-2 flex flex-col justify-center">
        <h3 className="text-[13px] font-semibold text-gray-900 dark:text-gray-100 leading-tight line-clamp-1">
          {activity.name}
        </h3>

        {activity.locationName && (
          <div className="flex items-center gap-1 mt-0.5">
            <MapPin size={9} className="text-gray-400 shrink-0" />
            <span className="text-[10px] text-gray-500 dark:text-gray-400 truncate">{activity.locationName}</span>
          </div>
        )}

        <div className="flex items-center gap-3 mt-1.5">
          {activity.timeDisplay && (
            <span className="flex items-center gap-1 text-[10px] font-medium text-gray-600 dark:text-gray-300">
              <Clock size={9} className="text-gray-400" />
              {activity.timeDisplay}
            </span>
          )}
          {rating != null && rating > 0 && (
            <span className="flex items-center gap-0.5 text-[10px] text-gray-500">
              <Star size={9} className="text-amber-400 fill-amber-400" />
              {rating.toFixed(1)}
            </span>
          )}
          {activity.costDisplay && (
            <span className="text-[10px] font-semibold text-gray-700 dark:text-gray-200">{activity.costDisplay}</span>
          )}
        </div>
      </div>

      {/* Right arrow + favorite */}
      <div className="flex flex-col items-center justify-center gap-1 pr-2 shrink-0">
        <button
          onClick={(e) => { e.stopPropagation(); onFavorite?.(); }}
          className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
        >
          <Heart size={12} className={isFavorited ? 'text-red-500 fill-red-500' : 'text-gray-300'} />
        </button>
        <ChevronRight size={12} className="text-gray-300 group-hover:text-gray-500 transition-colors" />
      </div>
    </div>
  );
}
