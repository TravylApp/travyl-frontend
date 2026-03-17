'use client';

import { MapPin, LogIn, LogOut, Star, Image as ImageIcon, Building2 } from 'lucide-react';
import type { HotelViewModel } from '@travyl/shared';

interface HotelCardProps {
  hotel: HotelViewModel;
}

export function HotelCard({ hotel }: HotelCardProps) {
  return (
    <div className="rounded-xl bg-white overflow-hidden border border-gray-200 shadow-sm hover:shadow-md transition-shadow mb-3">
      {/* Navy gradient header band */}
      <div
        className="px-3.5 py-2.5 flex items-center justify-between"
        style={{ background: 'linear-gradient(to right, var(--trip-base), var(--trip-base-light))' }}
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <Building2 size={14} className="text-white flex-shrink-0" />
          <div className="min-w-0 flex-1">
            <span className="block text-[13px] font-semibold text-white truncate">{hotel.name}</span>
            {hotel.starRating != null && (
              <div className="flex gap-0.5 mt-0.5">
                {Array.from({ length: hotel.starRating }).map((_, i) => (
                  <Star key={i} size={8} className="text-amber-400 fill-amber-400" />
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0 ml-2">
          <span className="bg-emerald-500 text-white text-[10px] font-medium px-2 py-0.5 rounded-full">
            Booked
          </span>
          {hotel.priceDisplay && (
            <span className="text-sm font-bold text-white">{hotel.priceDisplay}</span>
          )}
        </div>
      </div>

      {/* Image */}
      {hotel.imageUrl ? (
        <div className="relative">
          <img src={hotel.imageUrl} alt={hotel.name} className="w-full h-[160px] object-cover" />
          {hotel.rating != null && (
            <div className="absolute bottom-2 left-2 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-md flex items-center gap-1">
              <Star size={10} className="text-amber-400 fill-amber-400" />
              <span className="text-xs font-bold" style={{ color: 'var(--trip-base)' }}>{hotel.rating}</span>
            </div>
          )}
        </div>
      ) : (
        <div className="h-[120px] bg-blue-50 flex items-center justify-center">
          <ImageIcon size={28} style={{ color: 'rgb(var(--trip-base-rgb) / 0.2)' }} />
        </div>
      )}

      {/* Details */}
      <div className="p-3.5">
        {hotel.address && (
          <div className="flex items-center gap-1 mb-2.5">
            <MapPin size={10} className="text-gray-400 flex-shrink-0" />
            <span className="text-[11px] text-gray-500 truncate">{hotel.address}</span>
          </div>
        )}

        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-600 text-[10px] font-medium px-1.5 py-0.5 rounded-full">
            <LogIn size={8} />
            {hotel.checkInDisplay}
          </span>
          <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-600 text-[10px] font-medium px-1.5 py-0.5 rounded-full">
            <LogOut size={8} />
            {hotel.checkOutDisplay}
          </span>
          <span className="text-[11px] text-gray-500">{hotel.nightsLabel}</span>
        </div>

        {/* Book button */}
        <button className="w-full mt-3 py-2.5 bg-[#60a5fa] hover:bg-[#3b82f6] text-white text-[13px] font-semibold rounded-xl shadow-md hover:shadow-lg transition-all">
          Book Hotel
        </button>
      </div>
    </div>
  );
}
