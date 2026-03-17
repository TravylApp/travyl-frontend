'use client';

import { useState } from 'react';
import { MapPin, Clock, Heart } from 'lucide-react';
import { getActivityTypeColor, Navy } from '@travyl/shared';
import type { ActivityViewModel } from '@travyl/shared';

interface ActivityCardProps {
  activity: ActivityViewModel;
  onClick?: () => void;
}

export function ActivityCard({ activity, onClick }: ActivityCardProps) {
  const [isFavorited, setIsFavorited] = useState(false);
  const [imgError, setImgError] = useState(false);
  const typeColor = getActivityTypeColor(activity.category);
  const hasImage = !!(activity as any).image && !imgError;

  return (
    <div className="rounded-[14px] bg-white border border-gray-200 overflow-hidden cursor-pointer group transition-all hover:shadow-lg hover:scale-[1.02]" onClick={onClick}>
      {/* Image section */}
      <div className="relative h-[150px] overflow-hidden" style={{ backgroundColor: typeColor.bg }}>
        {hasImage ? (
          <img src={(activity as any).image} alt={activity.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" onError={() => setImgError(true)} />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center"
            style={{ background: `linear-gradient(135deg, ${Navy.DEFAULT}, #2563eb)` }}
          >
            <MapPin size={28} className="text-white/30" />
          </div>
        )}

        {/* Multi-stop gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/15 to-transparent" />

        {/* Favorite button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            setIsFavorited(!isFavorited);
          }}
          className="absolute top-2.5 right-2.5 w-[30px] h-[30px] bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-white transition-colors shadow-sm"
        >
          <Heart
            size={13}
            className={isFavorited ? 'text-red-500 fill-red-500' : 'text-gray-500'}
          />
        </button>

        {/* Title overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-3">
          <h3 className="text-white font-semibold text-[15px] line-clamp-1">{activity.name}</h3>
          {activity.locationName && (
            <div className="flex items-center gap-1 mt-0.5">
              <MapPin size={10} className="text-white/90" />
              <span className="text-[11px] text-white/90 truncate">{activity.locationName}</span>
            </div>
          )}
        </div>
      </div>

      {/* Info bar */}
      <div className="flex items-center justify-between px-3 py-2.5 bg-white">
        <div className="flex items-center gap-2.5">
          {activity.timeDisplay && (
            <div className="flex items-center gap-1">
              <Clock size={11} className="text-gray-400" />
              <span className="text-xs text-gray-600">{activity.timeDisplay}</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2.5">
          {activity.costDisplay && (
            <span className="text-[13px] font-bold text-gray-900">{activity.costDisplay}</span>
          )}
        </div>
      </div>
    </div>
  );
}
