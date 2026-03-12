'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { MapPin, Globe, Plane } from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { MockTripCard, TripRoute } from '@travyl/shared';

interface LocationHoverProps {
  trip: MockTripCard;
  variant?: 'dark' | 'light';
}

// Generate mock route data from destination string
function generateMockRoute(destination: string): TripRoute | null {
  // Common city coordinates
  const cityCoords: Record<string, { lat: number; lng: number; country: string; continent: string }> = {
    'Paris': { lat: 48.8566, lng: 2.3522, country: 'France', continent: 'Europe' },
    'Tokyo': { lat: 35.6762, lng: 139.6503, country: 'Japan', continent: 'Asia' },
    'Santorini': { lat: 36.3932, lng: 25.4615, country: 'Greece', continent: 'Europe' },
    'Bali': { lat: -8.3405, lng: 115.0920, country: 'Indonesia', continent: 'Asia' },
    'Barcelona': { lat: 41.3851, lng: 2.1734, country: 'Spain', continent: 'Europe' },
    'Zermatt': { lat: 46.0207, lng: 7.7491, country: 'Switzerland', continent: 'Europe' },
    'New York': { lat: 40.7128, lng: -74.0060, country: 'USA', continent: 'North America' },
    'Amsterdam': { lat: 52.3676, lng: 4.9041, country: 'Netherlands', continent: 'Europe' },
    'Reykjavik': { lat: 64.1466, lng: -21.9426, country: 'Iceland', continent: 'Europe' },
    'Rome': { lat: 41.9028, lng: 12.4964, country: 'Italy', continent: 'Europe' },
    'Sydney': { lat: -33.8688, lng: 151.2093, country: 'Australia', continent: 'Oceania' },
    'Marrakech': { lat: 31.6295, lng: -7.9811, country: 'Morocco', continent: 'Africa' },
    'Prague': { lat: 50.0755, lng: 14.4378, country: 'Czech Republic', continent: 'Europe' },
    'Cape Town': { lat: -33.9249, lng: 18.4241, country: 'South Africa', continent: 'Africa' },
    'Dubai': { lat: 25.2048, lng: 55.2708, country: 'UAE', continent: 'Asia' },
    'Hanoi': { lat: 21.0285, lng: 105.8542, country: 'Vietnam', continent: 'Asia' },
    'Edinburgh': { lat: 55.9533, lng: -3.1883, country: 'Scotland', continent: 'Europe' },
    'Male': { lat: 4.1755, lng: 73.5093, country: 'Maldives', continent: 'Asia' },
    'Buenos Aires': { lat: -34.6037, lng: -58.3816, country: 'Argentina', continent: 'South America' },
    'Tromsø': { lat: 69.6492, lng: 18.9553, country: 'Norway', continent: 'Europe' },
    'Kyoto': { lat: 35.0116, lng: 135.7681, country: 'Japan', continent: 'Asia' },
    'Banff': { lat: 51.1784, lng: -115.5708, country: 'Canada', continent: 'North America' },
    'Lisbon': { lat: 38.7223, lng: -9.1393, country: 'Portugal', continent: 'Europe' },
    'Nairobi': { lat: -1.2921, lng: 36.8219, country: 'Kenya', continent: 'Africa' },
    'Berlin': { lat: 52.5200, lng: 13.4050, country: 'Germany', continent: 'Europe' },
    'Dubrovnik': { lat: 42.6507, lng: 18.0944, country: 'Croatia', continent: 'Europe' },
    'Queenstown': { lat: -45.0312, lng: 168.6626, country: 'New Zealand', continent: 'Oceania' },
    'Seoul': { lat: 37.5665, lng: 126.9780, country: 'South Korea', continent: 'Asia' },
    'Mykonos': { lat: 37.4467, lng: 25.3289, country: 'Greece', continent: 'Europe' },
    'Cusco': { lat: -13.1631, lng: -72.5450, country: 'Peru', continent: 'South America' },
    'Stockholm': { lat: 59.3293, lng: 18.0686, country: 'Sweden', continent: 'Europe' },
    'Kona': { lat: 19.6400, lng: -155.9962, country: 'Hawaii', continent: 'North America' },
  };

  // Extract city name from destination string
  const cityMatch = Object.keys(cityCoords).find((city) =>
    destination.toLowerCase().includes(city.toLowerCase())
  );

  if (!cityMatch) return null;

  const coords = cityCoords[cityMatch];

  // Create a simple route with home origin and the destination
  return {
    origin: {
      name: 'Home',
      city: 'Home',
      lat: 40.7128,
      lng: -74.0060,
      country: 'USA',
      continent: 'North America',
    },
    stops: [],
    destinations: [
      {
        name: destination,
        city: cityMatch,
        lat: coords.lat,
        lng: coords.lng,
        country: coords.country,
        continent: coords.continent,
      },
    ],
  };
}

// Create pushpin icon for Leaflet
function createPushPinIcon(color: string) {
  return L.divIcon({
    className: '',
    html: `
      <div style="position:relative;width:16px;height:24px;cursor:pointer;filter:drop-shadow(0 2px 3px rgba(0,0,0,0.35));">
        <div style="
          width:16px;height:16px;border-radius:50%;
          background:radial-gradient(circle at 38% 32%, #fff 0%, ${color} 45%, ${color}cc 100%);
          border:2px solid rgba(255,255,255,0.9);
          box-shadow:inset 0 -3px 6px rgba(0,0,0,0.25), inset 0 2px 4px rgba(255,255,255,0.5);
        "></div>
        <div style="
          position:absolute;left:50%;top:15px;transform:translateX(-50%);
          width:2px;height:8px;
          background:linear-gradient(to bottom,#777,#444);
          border-radius:0 0 1px 1px;
        "></div>
      </div>
    `,
    iconSize: [16, 24],
    iconAnchor: [8, 24],
  });
}

// Mini map component for hover popup
function MiniMap({ route, width = 296, height = 160 }: { route: TripRoute; width?: number; height?: number }) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!mapRef.current) return;

    // Clean up existing map if any
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    const allPoints = [route.origin, ...route.stops, ...route.destinations];
    const bounds = L.latLngBounds(allPoints.map((p) => [p.lat, p.lng] as [number, number]));

    const map = L.map(mapRef.current, {
      center: bounds.getCenter(),
      zoom: 2,
      zoomControl: false,
      scrollWheelZoom: false,
      dragging: false,
      doubleClickZoom: false,
      touchZoom: false,
      minZoom: 1,
      maxZoom: 8,
    });

    L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/NatGeo_World_Map/MapServer/tile/{z}/{y}/{x}',
      { attribution: '', maxZoom: 12 }
    ).addTo(map);

    // Add markers for all points
    allPoints.forEach((point, index) => {
      const isOrigin = index === 0;
      const isDestination = index === allPoints.length - 1;
      const color = isOrigin ? '#3b82f6' : isDestination ? '#10b981' : '#8b5cf6';

      const marker = L.marker([point.lat, point.lng], {
        icon: createPushPinIcon(color),
      });

      marker.bindTooltip(point.city || point.name, {
        permanent: false,
        direction: 'top',
        offset: [0, -24],
        className: 'mini-map-tooltip',
      });

      marker.addTo(map);
    });

    // Draw flight path
    const pathCoords: [number, number][] = allPoints.map((p) => [p.lat, p.lng]);
    L.polyline(pathCoords, {
      color: '#3b82f6',
      weight: 2,
      opacity: 0.7,
      dashArray: '5, 5',
    }).addTo(map);

    mapInstanceRef.current = map;

    // Wait for container to be sized, then fit bounds
    const timeout1 = setTimeout(() => {
      map.invalidateSize();
      map.fitBounds(bounds, { padding: [15, 15], maxZoom: 5, animate: false });
    }, 50);

    const timeout2 = setTimeout(() => {
      map.invalidateSize();
      map.fitBounds(bounds, { padding: [15, 15], maxZoom: 5, animate: false });
    }, 180);

    return () => {
      clearTimeout(timeout1);
      clearTimeout(timeout2);
      map.remove();
      mapInstanceRef.current = null;
    };
  }, [route]);

  return (
    <div
      ref={mapRef}
      style={{ width: `${width}px`, height: `${height}px`, borderRadius: '8px', overflow: 'hidden' }}
      className="mini-map-container"
    >
      <style>{`
        .mini-map-container { background: #1e3a5f; }
        .mini-map-container .leaflet-tile-pane { filter: sepia(0.15) saturate(0.9) brightness(0.95); }
        .mini-map-container .leaflet-container { background: #1e3a5f !important; font-family: system-ui, sans-serif; }
        .mini-map-tooltip {
          background: rgba(0,0,0,0.8) !important;
          border: none !important;
          border-radius: 4px !important;
          padding: 4px 8px !important;
          font-size: 10px !important;
          font-weight: 600 !important;
          color: white !important;
          box-shadow: 0 2px 8px rgba(0,0,0,0.3) !important;
        }
        .mini-map-tooltip::before { display: none !important; }
      `}</style>
    </div>
  );
}

export function LocationHover({ trip, variant = 'dark' }: LocationHoverProps) {
  const [showHover, setShowHover] = useState(false);
  const [popupPosition, setPopupPosition] = useState<'left' | 'right'>('right');
  const triggerRef = useRef<HTMLDivElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Use existing route or generate mock route
  const route = trip.route || generateMockRoute(trip.destination);

  const isDark = variant === 'dark';

  // Calculate which side to show popup based on trigger position in viewport
  const updatePosition = useCallback(() => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      // If trigger is on the right half of the screen, show popup on left
      setPopupPosition(rect.left > viewportWidth / 2 ? 'left' : 'right');
    }
  }, []);

  useEffect(() => {
    if (showHover) {
      updatePosition();
      window.addEventListener('scroll', updatePosition, true);
      window.addEventListener('resize', updatePosition);

      return () => {
        window.removeEventListener('scroll', updatePosition, true);
        window.removeEventListener('resize', updatePosition);
      };
    }
  }, [showHover, updatePosition]);

  // Handle mouse enter - calculate position synchronously before showing
  const handleMouseEnter = useCallback(() => {
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }
    updatePosition();
    setShowHover(true);
  }, [updatePosition]);

  // Handle mouse leave with delay to allow moving to popup
  const handleMouseLeave = useCallback(() => {
    hideTimeoutRef.current = setTimeout(() => {
      setShowHover(false);
    }, 100);
  }, []);

  // Cancel hide when entering popup
  const handlePopupMouseEnter = useCallback(() => {
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }
  }, []);

  const handlePopupMouseLeave = useCallback(() => {
    setShowHover(false);
  }, []);

  if (!route) {
    return (
      <div className={`flex items-center gap-1.5 ${isDark ? 'text-white/90' : 'text-gray-600'}`}>
        <MapPin size={14} className="text-amber-400 shrink-0" />
        <span className={`text-xs line-clamp-1 ${isDark ? '' : 'text-gray-600'}`}>{trip.destination}</span>
      </div>
    );
  }

  // Get unique continents and countries
  const allLocations = [route.origin, ...route.stops, ...route.destinations];
  const continents = [...new Set(allLocations.map((l) => l.continent).filter(Boolean))];
  const countries = [...new Set(allLocations.map((l) => l.country).filter(Boolean))];

  return (
    <>
      {/* Trigger */}
      <div
        ref={triggerRef}
        className="inline-flex items-center gap-1.5 cursor-pointer group"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <MapPin size={14} className={`shrink-0 group-hover:text-amber-300 transition-colors ${isDark ? 'text-amber-400' : 'text-accent-amber'}`} />
        <span className={`text-xs line-clamp-1 group-hover:transition-colors ${isDark ? 'group-hover:text-white' : 'group-hover:text-primary-dark'}`}>{trip.destination}</span>
      </div>

      {/* Portal popup - positioned to the side */}
      {showHover && typeof document !== 'undefined' && createPortal(
        (() => {
          const triggerRect = triggerRef.current?.getBoundingClientRect();
          const triggerCenter = (triggerRect?.top ?? 0) + ((triggerRect?.height ?? 0) / 2);
          // Position popup so arrow (at 16px from top) points at trigger center
          const popupTop = Math.max(10, triggerCenter - 16);

          return (
          <div
            ref={popupRef}
            className="fixed z-[9999] animate-in fade-in-0 zoom-in-95 duration-150"
            style={{
              top: popupTop,
              [popupPosition === 'right' ? 'left' : 'right']: popupPosition === 'right'
                ? ((triggerRect?.right ?? 0) + 12)
                : window.innerWidth - (triggerRect?.left ?? 0) + 12,
            }}
            onMouseEnter={handlePopupMouseEnter}
            onMouseLeave={handlePopupMouseLeave}
          >
          <div className="bg-white rounded-xl shadow-2xl border border-gray-100 overflow-hidden w-[300px]">
            {/* Header */}
            <div className="p-3 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
              <div className="flex items-center gap-2 mb-1.5">
                <div className="p-1.5 rounded-lg bg-blue-50">
                  <Globe size={14} className="text-blue-500" />
                </div>
                <span className="text-sm font-semibold text-gray-800">Trip Location</span>
              </div>
              <div className="flex flex-wrap gap-1">
                {continents.map((continent) => (
                  <span
                    key={continent}
                    className="px-1.5 py-0.5 text-[10px] font-medium rounded-full bg-blue-50 text-blue-600 border border-blue-100"
                  >
                    {continent}
                  </span>
                ))}
              </div>
              <div className="flex flex-wrap gap-1 mt-1.5">
                {countries.slice(0, 3).map((country) => (
                  <span
                    key={country}
                    className="px-1.5 py-0.5 text-[10px] text-gray-600 bg-gray-100 rounded"
                  >
                    {country}
                  </span>
                ))}
                {countries.length > 3 && (
                  <span className="px-1.5 py-0.5 text-[10px] text-gray-400">
                    +{countries.length - 3} more
                  </span>
                )}
              </div>
            </div>

            {/* Leaflet Map with Pins */}
            <div className="p-2">
              <MiniMap route={route} width={296} height={160} />
            </div>

            {/* Route summary */}
            <div className="px-3 py-2.5 border-t border-gray-100 flex items-center justify-between bg-gray-50/50">
              <div className="flex items-center gap-1.5 text-xs text-gray-500">
                <Plane size={12} className="text-blue-500" />
                <span>
                  {route.stops.length + route.destinations.length} {route.stops.length + route.destinations.length === 1 ? 'stop' : 'stops'}
                </span>
              </div>
              <div className="text-[10px] text-gray-400 italic">
                Click card for full itinerary
              </div>
            </div>
          </div>
          {/* Arrow pointer */}
          <div
            className={`absolute top-4 w-2.5 h-2.5 bg-white border-t border-l border-gray-100 rotate-45 ${
              popupPosition === 'right' ? '-left-1.5' : '-right-1.5 border-t-0 border-l-0 border-b border-r'
            }`}
          />
        </div>
          );
        })(),
        document.body
      )}
    </>
  );
}
