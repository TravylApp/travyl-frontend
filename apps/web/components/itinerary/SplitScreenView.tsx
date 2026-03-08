'use client';

import { useState } from 'react';
import { Maximize2, Minimize2, Map, ExternalLink, MapPin, Clock, Navigation } from 'lucide-react';

interface SplitScreenViewProps {
  children: React.ReactNode;
  mapQuery?: string;
  locationName?: string;
  meetingPoint?: string;
  timeInfo?: string;
  layout?: '50-50' | '60-40' | '40-60';
}

const LAYOUT_CLASSES: Record<string, { left: string; right: string }> = {
  '50-50': { left: 'w-1/2', right: 'w-1/2' },
  '60-40': { left: 'w-3/5', right: 'w-2/5' },
  '40-60': { left: 'w-2/5', right: 'w-3/5' },
};

export function SplitScreenView({
  children,
  mapQuery,
  locationName,
  meetingPoint,
  timeInfo,
  layout = '50-50',
}: SplitScreenViewProps) {
  const [isMapExpanded, setIsMapExpanded] = useState(false);
  const [showMapOnMobile, setShowMapOnMobile] = useState(false);

  const encodedQuery = mapQuery
    ? encodeURIComponent(mapQuery)
    : locationName
      ? encodeURIComponent(locationName)
      : '';

  const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodedQuery}`;
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodedQuery}`;

  const layoutClasses = LAYOUT_CLASSES[layout] || LAYOUT_CLASSES['50-50'];

  return (
    <div className="relative">
      {/* Mobile toggle */}
      <button
        onClick={() => setShowMapOnMobile((v) => !v)}
        className="md:hidden fixed bottom-4 right-4 z-30 w-12 h-12 rounded-full bg-[#1e3a5f] text-white shadow-lg flex items-center justify-center hover:bg-[#2d4a6f] transition-colors"
        aria-label={showMapOnMobile ? 'Hide map' : 'Show map'}
      >
        <Map size={20} />
      </button>

      {/* Mobile map overlay */}
      {showMapOnMobile && (
        <div className="md:hidden fixed inset-0 z-20 bg-white flex flex-col">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
            <h3 className="text-sm font-semibold text-gray-900">Map</h3>
            <button
              onClick={() => setShowMapOnMobile(false)}
              className="text-sm text-[#1e3a5f] font-medium"
            >
              Close
            </button>
          </div>
          <div className="flex-1 relative">
            {encodedQuery && (
              <iframe
                title="Location Map"
                className="w-full h-full border-0"
                src={`https://maps.google.com/maps?q=${encodedQuery}&z=15&output=embed`}
                allowFullScreen
                loading="lazy"
              />
            )}
            <MapOverlay
              locationName={locationName}
              meetingPoint={meetingPoint}
              timeInfo={timeInfo}
              directionsUrl={directionsUrl}
              mapsUrl={mapsUrl}
            />
          </div>
        </div>
      )}

      {/* Desktop split layout */}
      <div className="flex gap-0">
        {/* Left panel: children */}
        <div
          className={`${
            isMapExpanded ? 'w-1/3' : layoutClasses.left
          } transition-all duration-300 ease-in-out hidden md:block`}
        >
          {children}
        </div>

        {/* Left panel: mobile (full width) */}
        <div className="md:hidden w-full">{children}</div>

        {/* Right panel: map (desktop only) */}
        <div
          className={`${
            isMapExpanded ? 'w-2/3' : layoutClasses.right
          } transition-all duration-300 ease-in-out hidden md:block relative border-l border-gray-200`}
        >
          {/* Expand/collapse button */}
          <button
            onClick={() => setIsMapExpanded((v) => !v)}
            className="absolute top-3 right-3 z-10 w-8 h-8 rounded-lg bg-white/90 backdrop-blur-sm shadow-md flex items-center justify-center hover:bg-white transition-colors border border-gray-200"
            aria-label={isMapExpanded ? 'Collapse map' : 'Expand map'}
          >
            {isMapExpanded ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
          </button>

          {/* Map iframe */}
          {encodedQuery ? (
            <iframe
              title="Location Map"
              className="w-full h-full border-0 min-h-[400px]"
              src={`https://maps.google.com/maps?q=${encodedQuery}&z=15&output=embed`}
              allowFullScreen
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full min-h-[400px] bg-gray-100 flex items-center justify-center">
              <div className="text-center text-gray-400">
                <Map size={32} className="mx-auto mb-2" />
                <p className="text-sm">No location specified</p>
              </div>
            </div>
          )}

          {/* Location info overlay */}
          <MapOverlay
            locationName={locationName}
            meetingPoint={meetingPoint}
            timeInfo={timeInfo}
            directionsUrl={directionsUrl}
            mapsUrl={mapsUrl}
          />
        </div>
      </div>
    </div>
  );
}

function MapOverlay({
  locationName,
  meetingPoint,
  timeInfo,
  directionsUrl,
  mapsUrl,
}: {
  locationName?: string;
  meetingPoint?: string;
  timeInfo?: string;
  directionsUrl: string;
  mapsUrl: string;
}) {
  if (!locationName && !meetingPoint && !timeInfo) return null;

  return (
    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 via-black/40 to-transparent p-4 pt-10">
      <div className="bg-white/95 backdrop-blur-sm rounded-xl p-3 shadow-lg">
        {locationName && (
          <div className="flex items-center gap-2 mb-1.5">
            <MapPin size={13} className="text-[#1e3a5f] shrink-0" />
            <span className="text-sm font-medium text-gray-900 line-clamp-1">
              {locationName}
            </span>
          </div>
        )}

        {meetingPoint && (
          <div className="flex items-start gap-2 mb-1.5">
            <Navigation size={12} className="text-gray-400 shrink-0 mt-0.5" />
            <span className="text-xs text-gray-600 line-clamp-2">{meetingPoint}</span>
          </div>
        )}

        {timeInfo && (
          <div className="flex items-center gap-2 mb-2">
            <Clock size={12} className="text-gray-400 shrink-0" />
            <span className="text-xs text-gray-600">{timeInfo}</span>
          </div>
        )}

        <div className="flex items-center gap-2 mt-2">
          <a
            href={directionsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-[#1e3a5f] text-white rounded-lg text-xs font-medium hover:bg-[#2d4a6f] transition-colors"
          >
            <Navigation size={11} />
            Get Directions
          </a>
          <a
            href={mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 px-3 py-2 border border-gray-200 rounded-lg text-xs text-gray-600 hover:bg-gray-50 transition-colors"
          >
            <ExternalLink size={11} />
            Open in Maps
          </a>
        </div>
      </div>
    </div>
  );
}
