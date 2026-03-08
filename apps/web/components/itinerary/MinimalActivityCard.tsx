'use client';

import { useState } from 'react';
import { Heart, Clock, Star, Image as ImageIcon } from 'lucide-react';
import { getActivityTypeColor } from '@travyl/shared';
import type { ActivityViewModel } from '@travyl/shared';

interface MinimalActivityCardProps {
  activity: ActivityViewModel;
  images?: string[];
  rating?: number;
  onClick?: () => void;
  onFavorite?: () => void;
  isFavorited?: boolean;
}

export function MinimalActivityCard({
  activity,
  images = [],
  rating,
  onClick,
  onFavorite,
  isFavorited = false,
}: MinimalActivityCardProps) {
  const [imgError, setImgError] = useState(false);
  const typeColor = getActivityTypeColor(activity.category);
  const hasImage = images.length > 0 && !imgError;

  return (
    <div
      className="flex items-center gap-3 rounded-xl bg-white border border-gray-200 p-2.5 cursor-pointer group transition-all hover:shadow-md hover:border-gray-300"
      onClick={onClick}
    >
      {/* Thumbnail */}
      <div className="w-20 h-20 rounded-lg overflow-hidden shrink-0" style={{ backgroundColor: typeColor.bg }}>
        {hasImage ? (
          <img
            src={images[0]}
            alt={activity.name}
            className="w-full h-full object-cover"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <ImageIcon size={20} style={{ color: typeColor.primary + '40' }} />
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span
            className="text-[9px] font-semibold px-1.5 py-0.5 rounded"
            style={{ backgroundColor: typeColor.bg, color: typeColor.primary }}
          >
            {activity.category}
          </span>
        </div>
        <h3 className="text-sm font-semibold text-gray-900 line-clamp-1">{activity.name}</h3>
        <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
          {activity.timeDisplay && (
            <span className="flex items-center gap-1">
              <Clock size={10} className="text-gray-400" />
              {activity.timeDisplay}
            </span>
          )}
          {rating && (
            <span className="flex items-center gap-0.5">
              <Star size={10} className="text-amber-400" fill="#fbbf24" />
              {rating.toFixed(1)}
            </span>
          )}
        </div>
      </div>

      {/* Right side */}
      <div className="flex flex-col items-end gap-2 shrink-0">
        <button
          onClick={(e) => { e.stopPropagation(); onFavorite?.(); }}
          className="w-7 h-7 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-gray-100"
        >
          <Heart size={12} className={isFavorited ? 'text-red-500 fill-red-500' : 'text-gray-400'} />
        </button>
        {activity.costDisplay && (
          <span className="text-sm font-bold text-gray-900">{activity.costDisplay}</span>
        )}
      </div>
    </div>
  );
}
