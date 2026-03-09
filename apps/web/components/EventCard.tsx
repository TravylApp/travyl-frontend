'use client';

import { useState } from 'react';
import { Heart, Star, MapPin, CalendarDays, Clock, ExternalLink } from 'lucide-react';
import { motion } from 'motion/react';
import type { GlobeLocation } from '@travyl/shared';

interface EventCardProps {
  event: GlobeLocation;
  isFavorited?: boolean;
  isSelected?: boolean;
  onSelect?: (id: string) => void;
  onToggleFavorite?: (id: string) => void;
  onViewDetail?: (id: string) => void;
  compact?: boolean;
}

export function EventCard({
  event,
  isFavorited = true,
  isSelected = false,
  onSelect,
  onToggleFavorite,
  onViewDetail,
  compact = false,
}: EventCardProps) {
  const [liked, setLiked] = useState(isFavorited);
  const [imgLoaded, setImgLoaded] = useState(false);

  const handleFavorite = (e: React.MouseEvent) => {
    e.stopPropagation();
    setLiked(!liked);
    onToggleFavorite?.(event.id);
  };

  const handleClick = () => onSelect?.(event.id);

  const handleViewDetail = (e: React.MouseEvent) => {
    e.stopPropagation();
    onViewDetail?.(event.id);
  };

  if (compact) {
    return (
      <motion.div
        layout
        onClick={handleClick}
        className={`flex items-center gap-3 p-2.5 rounded-xl cursor-pointer transition-all ${
          isSelected
            ? 'bg-[#1e3a5f]/[0.08] border border-[#1e3a5f]/20'
            : 'hover:bg-gray-50 border border-transparent'
        }`}
        whileHover={{ x: 2 }}
      >
        <div className="w-11 h-11 rounded-lg overflow-hidden shrink-0 relative">
          {event.imageUrl ? (
            <img src={event.imageUrl} alt={event.name} className="w-full h-full object-cover" onLoad={() => setImgLoaded(true)} />
          ) : (
            <div className="w-full h-full flex items-center justify-center" style={{ backgroundColor: event.color + '20' }}>
              <CalendarDays size={14} style={{ color: event.color }} />
            </div>
          )}
          <div className="absolute bottom-0.5 right-0.5 w-2.5 h-2.5 rounded-full border-[1.5px] border-white" style={{ backgroundColor: event.color }} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[13px] text-[#314158] truncate font-semibold">{event.name}</p>
          <div className="flex items-center gap-2 mt-0.5">
            <p className="text-[11px] text-gray-400 flex items-center gap-1">
              <MapPin size={9} /> {event.location}
            </p>
            {event.date && (
              <p className="text-[11px] text-gray-400 flex items-center gap-1">
                <Clock size={9} /> {event.date}
              </p>
            )}
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      layout
      onClick={handleClick}
      className={`bg-white rounded-xl border overflow-hidden cursor-pointer transition-all ${
        isSelected
          ? 'border-[#1e3a5f]/30 ring-2 ring-[#1e3a5f]/10 shadow-md'
          : 'border-gray-200 hover:shadow-md hover:border-gray-300'
      }`}
      whileHover={{ y: -2 }}
      transition={{ duration: 0.15 }}
    >
      <div className="relative h-[160px] overflow-hidden">
        {event.imageUrl ? (
          <img
            src={event.imageUrl}
            alt={event.name}
            className={`w-full h-full object-cover transition-opacity duration-300 ${imgLoaded ? 'opacity-100' : 'opacity-0'}`}
            onLoad={() => setImgLoaded(true)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center" style={{ backgroundColor: event.color + '15' }}>
            <CalendarDays size={32} style={{ color: event.color }} className="opacity-30" />
          </div>
        )}
        <span className="absolute top-3 left-3 px-2.5 py-0.5 rounded-full text-[10px] text-white backdrop-blur-sm" style={{ backgroundColor: event.color + 'CC' }}>
          {event.category}
        </span>
        <button onClick={handleFavorite} className="absolute top-3 right-3 p-1.5 rounded-full bg-white/90 backdrop-blur-sm hover:bg-white transition-colors cursor-pointer">
          <Heart size={14} className={liked ? 'fill-red-500 text-red-500' : 'text-gray-500'} />
        </button>
        {event.date && (
          <span className="absolute bottom-3 right-3 px-2 py-0.5 rounded-md bg-[#1e3a5f]/80 backdrop-blur-sm text-[10px] text-white flex items-center gap-1">
            <CalendarDays size={9} /> {event.date}
          </span>
        )}
        {event.rating && (
          <span className="absolute bottom-3 left-3 px-2 py-0.5 rounded-md bg-black/50 backdrop-blur-sm text-[10px] text-white flex items-center gap-1">
            <Star size={10} className="fill-yellow-400 text-yellow-400" /> {event.rating}
          </span>
        )}
      </div>
      <div className="p-3">
        <div className="flex items-center gap-1 text-[11px] text-gray-400 mb-1">
          <MapPin size={10} /> {event.location}
        </div>
        <h4 className="text-[14px] text-gray-900 mb-1">{event.name}</h4>
        {event.date && (
          <div className="flex items-center gap-1.5 text-[11px] text-[#1e3a5f] mb-2">
            <CalendarDays size={11} /> {event.date}
          </div>
        )}
        {event.board && (
          <div className="flex items-center justify-between mt-1">
            <span className="text-[11px] text-[#3b82f6] flex items-center gap-1">{event.board}</span>
            <button onClick={handleViewDetail} className="text-[11px] text-gray-400 hover:text-[#1e3a5f] flex items-center gap-1 cursor-pointer transition-colors">
              <ExternalLink size={10} /> View
            </button>
          </div>
        )}
      </div>
    </motion.div>
  );
}
