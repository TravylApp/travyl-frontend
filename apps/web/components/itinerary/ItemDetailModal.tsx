'use client';

import { useEffect } from 'react';
import { X } from 'lucide-react';
import type { DiscoverItem } from '@travyl/shared';
import { DiscoverCard } from './DiscoverCard';

interface ItemDetailModalProps {
  item: DiscoverItem;
  accentColor: string;
  isFavorited?: boolean;
  onClose: () => void;
  onFavorite?: (id: string) => void;
  onAddToItinerary?: (id: string) => void;
  onRemoveFromItinerary?: (id: string) => void;
}

export function ItemDetailModal({
  item,
  accentColor,
  isFavorited = false,
  onClose,
  onFavorite,
  onAddToItinerary,
  onRemoveFromItinerary,
}: ItemDetailModalProps) {
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-md animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute -top-3 -right-3 z-10 w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-lg hover:bg-gray-100 transition-colors"
        >
          <X size={16} className="text-gray-600" />
        </button>
        <DiscoverCard
          item={item}
          accentColor={accentColor}
          isFavorited={isFavorited}
          onFavorite={onFavorite}
          onAddToItinerary={onAddToItinerary}
          onRemoveFromItinerary={onRemoveFromItinerary}
        />
      </div>
    </div>
  );
}
