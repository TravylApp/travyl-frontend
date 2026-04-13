'use client';

import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Heart, MapPin, Star, ExternalLink, Phone, Globe } from 'lucide-react';
import dynamic from 'next/dynamic';
import type { PlaceItem } from '@travyl/shared';
import { usePlaceEnrich } from '@travyl/shared';

const LeafletMap = dynamic(() => import('@/components/leaflet-map'), { ssr: false });

interface PlaceDetailModalProps {
  place: PlaceItem;
  isFavorited?: boolean;
  onToggleFavorite?: () => void;
  onClose: () => void;
}

export function PlaceDetailModal({ place, isFavorited = false, onToggleFavorite, onClose }: PlaceDetailModalProps) {
  // Enrich with cross-source data (extra photos, reviews, etc.)
  const { data: enrichData } = usePlaceEnrich(place.id, place.name);
  const enrichedPlace = { ...place };
  if (enrichData?.photos?.length) {
    enrichedPlace.images = [...(enrichedPlace.images ?? []), ...enrichData.photos];
  }
  if (enrichData?.website && !enrichedPlace.website) enrichedPlace.website = enrichData.website;
  if (enrichData?.phone && !enrichedPlace.phone) enrichedPlace.phone = enrichData.phone;

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  // Prevent body scroll
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  const hasCoords = enrichedPlace.latitude && enrichedPlace.longitude && (enrichedPlace.latitude !== 0 || enrichedPlace.longitude !== 0);

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center" onClick={onClose}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Modal */}
      <div
        className="relative z-10 w-[90vw] max-w-5xl max-h-[85vh] bg-white dark:bg-[#1a1a2e] rounded-2xl overflow-hidden shadow-2xl flex flex-col sm:flex-row"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button onClick={onClose} className="absolute top-3 right-3 z-20 w-8 h-8 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/60 transition-colors">
          <X size={16} />
        </button>

        {/* Left: Image */}
        <div className="relative sm:w-[55%] shrink-0 min-h-[250px] sm:min-h-0">
          {enrichedPlace.image ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={enrichedPlace.image} alt={enrichedPlace.name} className="w-full h-full object-cover" style={{ minHeight: 250 }}
                onError={(e) => { e.currentTarget.style.display = 'none'; }} />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
            </>
          ) : (
            <div className="w-full h-full min-h-[250px]" style={{ background: 'linear-gradient(135deg, #1a1a2e, #16213e)' }} />
          )}

          {/* Favorite */}
          <button
            onClick={(e) => { e.stopPropagation(); onToggleFavorite?.(); }}
            className={`absolute top-3 left-3 w-9 h-9 rounded-full backdrop-blur-sm flex items-center justify-center shadow-md hover:scale-110 transition-transform ${isFavorited ? 'bg-red-500' : 'bg-black/30'}`}
          >
            <Heart size={16} className={isFavorited ? 'text-white fill-white' : 'text-white'} />
          </button>

          {/* Info overlay on image */}
          <div className="absolute bottom-0 left-0 right-0 p-5">
            {place.category && (
              <span className="text-[10px] uppercase tracking-wider font-semibold text-white/60 mb-1 block">{place.category}</span>
            )}
            <h2 className="text-xl sm:text-2xl font-bold text-white leading-tight mb-2">{place.name}</h2>
            <div className="flex items-center gap-3 flex-wrap">
              {place.rating > 0 && (
                <span className="flex items-center gap-1 text-[13px] text-white/90">
                  <Star size={14} className="fill-amber-400 text-amber-400" />
                  <span className="font-semibold">{place.rating}</span>
                  {place.reviewCount && <span className="text-white/50">({place.reviewCount})</span>}
                </span>
              )}
              {place.priceLevel && (
                <span className="text-[13px] text-white/70">{'$'.repeat(place.priceLevel)}</span>
              )}
              {place.address && (
                <span className="flex items-center gap-1 text-[12px] text-white/60">
                  <MapPin size={11} />
                  <span className="truncate max-w-[200px]">{place.address}</span>
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Right: Details + Map */}
        <div className="flex-1 flex flex-col overflow-y-auto">
          {/* Description */}
          <div className="p-5 flex-1">
            {place.description && (
              <p className="text-[14px] leading-[1.7] text-gray-700 dark:text-gray-300 mb-4">{place.description}</p>
            )}

            {place.tagline && place.tagline !== place.description && (
              <p className="text-[13px] text-gray-500 dark:text-gray-400 italic mb-4">{place.tagline}</p>
            )}

            {/* Tags */}
            {place.tags && place.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-4">
                {place.tags.map((tag) => (
                  <span key={tag} className="px-2.5 py-1 rounded-full text-[11px] font-medium bg-gray-100 dark:bg-white/[0.08] text-gray-600 dark:text-gray-400">
                    {tag}
                  </span>
                ))}
              </div>
            )}

            {/* Quick info */}
            <div className="space-y-2">
              {place.hours && (
                <p className="text-[12px] text-gray-500 dark:text-gray-400"><span className="font-semibold text-gray-700 dark:text-gray-300">Hours:</span> {place.hours}</p>
              )}
              {enrichedPlace.phone && (
                <a href={`tel:${enrichedPlace.phone}`} className="flex items-center gap-1.5 text-[12px] text-blue-600 hover:underline">
                  <Phone size={11} /> {enrichedPlace.phone}
                </a>
              )}
              {enrichedPlace.website && (
                <a href={enrichedPlace.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-[12px] text-blue-600 hover:underline">
                  <Globe size={11} /> Visit website
                </a>
              )}
            </div>

            {/* Links */}
            <div className="flex gap-2 mt-4">
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.name + (place.address ? ' ' + place.address : ''))}`}
                target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium bg-gray-100 dark:bg-white/[0.08] text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-white/[0.12] transition-colors"
              >
                <ExternalLink size={11} /> Google Maps
              </a>
              <a
                href={`https://www.google.com/search?q=${encodeURIComponent(place.name)}`}
                target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium bg-gray-100 dark:bg-white/[0.08] text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-white/[0.12] transition-colors"
              >
                <ExternalLink size={11} /> Search
              </a>
            </div>
          </div>

          {/* Map */}
          {hasCoords && (
            <div className="h-[200px] sm:h-[250px] border-t border-gray-100 dark:border-white/[0.06]">
              <LeafletMap
                lat={place.latitude!}
                lng={place.longitude!}
                label={place.name}
                zoom={14}
                height="100%"
                className="!rounded-none !border-0"
              />
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
