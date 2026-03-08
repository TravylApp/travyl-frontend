'use client';

import { useState } from 'react';
import { Heart, Clock, Star, Image as ImageIcon } from 'lucide-react';
import { getActivityTypeColor } from '@travyl/shared';
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
  const hasImage = images.length > 0 && !imgError;

  return (
    <div
      className="flex items-center gap-2.5 rounded-lg bg-white border border-gray-100 px-2.5 py-2 cursor-pointer group transition-all hover:bg-gray-50 hover:border-gray-200"
      onClick={onClick}
    >
      {/* Thumbnail */}
      <div className="w-12 h-12 rounded-lg overflow-hidden shrink-0" style={{ backgroundColor: typeColor.bg }}>
        {hasImage ? (
          <img
            src={images[0]}
            alt={activity.name}
            className="w-full h-full object-cover"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <ImageIcon size={14} style={{ color: typeColor.primary + '40' }} />
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <h3 className="text-[13px] font-semibold text-gray-900 line-clamp-1">{activity.name}</h3>
        <div className="flex items-center gap-2.5 mt-0.5 text-[11px] text-gray-500">
          <span
            className="font-medium"
            style={{ color: typeColor.primary }}
          >
            {activity.category}
          </span>
          {activity.startTime && (
            <span className="flex items-center gap-0.5">
              <Clock size={9} className="text-gray-400" />
              {activity.startTime}
            </span>
          )}
          {rating && (
            <span className="flex items-center gap-0.5">
              <Star size={9} className="text-amber-400" fill="#fbbf24" />
              {rating.toFixed(1)}
            </span>
          )}
        </div>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-2 shrink-0">
        {activity.costDisplay && (
          <span className="text-[13px] font-bold text-gray-900">{activity.costDisplay}</span>
        )}
        <button
          onClick={(e) => { e.stopPropagation(); onFavorite?.(); }}
          className="w-6 h-6 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-gray-100"
        >
          <Heart size={11} className={isFavorited ? 'text-red-500 fill-red-500' : 'text-gray-400'} />
        </button>
      </div>
    </div>
  );
}
