'use client';

import { useMemo } from 'react';
import { Plane, MapPin, Building2 } from 'lucide-react';
import type { MockTripCard, RouteLocation } from '@travyl/shared';
import { RouteMap } from './RouteMap';

interface TripRouteHoverProps {
  trip: MockTripCard;
}

// Continent colors for visual distinction (dark theme)
const CONTINENT_COLORS: Record<string, { bg: string; text: string; border: string; dot: string }> = {
  'North America': { bg: 'bg-blue-950/50', text: 'text-blue-300', border: 'border-blue-700/50', dot: 'bg-blue-400' },
  'South America': { bg: 'bg-emerald-950/50', text: 'text-emerald-300', border: 'border-emerald-700/50', dot: 'bg-emerald-400' },
  Europe: { bg: 'bg-violet-950/50', text: 'text-violet-300', border: 'border-violet-700/50', dot: 'bg-violet-400' },
  Asia: { bg: 'bg-rose-950/50', text: 'text-rose-300', border: 'border-rose-700/50', dot: 'bg-rose-400' },
  Africa: { bg: 'bg-amber-950/50', text: 'text-amber-300', border: 'border-amber-700/50', dot: 'bg-amber-400' },
  Oceania: { bg: 'bg-teal-950/50', text: 'text-teal-300', border: 'border-teal-700/50', dot: 'bg-teal-400' },
  default: { bg: 'bg-slate-800/50', text: 'text-slate-300', border: 'border-slate-600/50', dot: 'bg-slate-400' },
};

function getContinentColor(continent: string) {
  return CONTINENT_COLORS[continent] || CONTINENT_COLORS.default;
}

function LocationNode({
  location,
  isOrigin,
  isLast,
  showConnector,
}: {
  location: RouteLocation;
  isOrigin: boolean;
  isLast: boolean;
  showConnector: boolean;
}) {
  const colors = getContinentColor(location.continent);

  return (
    <div className="flex items-start gap-2">
      {/* Vertical line connector */}
      <div className="flex flex-col items-center">
        <div
          className={`w-2.5 h-2.5 ${colors.dot} rotate-45 ring-2 ring-slate-900 shadow-sm flex-shrink-0 mt-1.5`}
        />
        {showConnector && (
          <div className="w-0.5 h-8 bg-gradient-to-b from-slate-600 to-slate-700 my-0.5" />
        )}
      </div>

      {/* Location details */}
      <div className={`flex-1 rounded-lg ${colors.bg} border ${colors.border} p-2.5 ${isLast ? 'mb-0' : 'mb-1'}`}>
        <div className="flex items-center gap-1.5 mb-0.5">
          {isOrigin ? (
            <Building2 size={12} className={colors.text} />
          ) : (
            <MapPin size={12} className={colors.text} />
          )}
          <span className={`font-semibold text-sm ${colors.text}`}>
            {location.city}
            {location.iata && (
              <span className="ml-1 text-xs opacity-70">({location.iata})</span>
            )}
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-slate-400">
          <span>{location.country}</span>
          <span className="text-slate-600">•</span>
          <span className={colors.text}>{location.continent}</span>
        </div>
      </div>
    </div>
  );
}

function FlightConnector() {
  return (
    <div className="flex items-center gap-1 px-2 py-1.5 ml-1">
      <div className="w-0.5 h-4 bg-slate-700" />
      <div className="flex items-center gap-1 px-2 py-0.5 bg-slate-800/80 rounded-full border border-slate-700/50">
        <Plane size={10} className="text-blue-400 rotate-90" />
        <span className="text-[10px] text-slate-300 font-medium">flight</span>
      </div>
      <div className="flex-1 h-px bg-gradient-to-r from-slate-600 to-transparent" />
    </div>
  );
}

export function TripRouteHover({ trip }: TripRouteHoverProps) {
  const { route } = trip;

  // Build the route visualization
  const routePoints = useMemo(() => {
    if (!route) return null;

    const points: Array<{ location: RouteLocation; type: 'origin' | 'stop' | 'destination' }> = [
      { location: route.origin, type: 'origin' },
    ];

    if (route.stops) {
      route.stops.forEach((stop) => {
        points.push({ location: stop, type: 'stop' });
      });
    }

    route.destinations.forEach((dest) => {
      points.push({ location: dest, type: 'destination' });
    });

    return points;
  }, [route]);

  // Get unique continents for the overview
  const continents = useMemo(() => {
    if (!routePoints) return [];
    const unique = new Set(routePoints.map((p) => p.location.continent));
    return Array.from(unique);
  }, [routePoints]);

  // Get unique countries for the overview
  const countries = useMemo(() => {
    if (!routePoints) return [];
    const unique = new Set(routePoints.map((p) => p.location.country));
    return Array.from(unique);
  }, [routePoints]);

  if (!route) {
    return (
      <div className="p-3 text-center text-sm text-gray-500">
        <MapPin size={16} className="mx-auto mb-1 text-gray-300" />
        <span>No route information</span>
      </div>
    );
  }

  return (
    <div className="p-3 min-w-[280px]">
      {/* Route Header */}
      <div className="mb-3 pb-2 border-b border-gray-100">
        <div className="flex items-center gap-2 mb-1.5">
          <Plane size={14} className="text-[#1e3a5f]" />
          <span className="text-sm font-semibold text-gray-800">Trip Route</span>
        </div>

        {/* Continent/Country summary */}
        <div className="flex flex-wrap gap-1">
          {continents.map((continent) => {
            const colors = getContinentColor(continent);
            return (
              <span
                key={continent}
                className={`px-1.5 py-0.5 text-[10px] font-medium rounded ${colors.bg} ${colors.text}`}
              >
                {continent}
              </span>
            );
          })}
        </div>
        <div className="flex flex-wrap gap-1 mt-1">
          {countries.map((country) => (
            <span
              key={country}
              className="px-1.5 py-0.5 text-[10px] text-gray-500 bg-gray-50 rounded"
            >
              {country}
            </span>
          ))}
        </div>
      </div>

      {/* Visual Route Map */}
      <div className="mb-3 rounded-lg overflow-hidden border border-slate-700/50 shadow-inner">
        <RouteMap route={route} width={280} height={160} />
      </div>

      {/* Route Points - Compact list */}
      <div className="space-y-0">
        {routePoints?.map((point, index) => (
          <div key={`${point.location.city}-${index}`}>
            <LocationNode
              location={point.location}
              isOrigin={point.type === 'origin'}
              isLast={index === routePoints.length - 1}
              showConnector={index < routePoints.length - 1}
            />
            {index < routePoints.length - 1 && <FlightConnector />}
          </div>
        ))}
      </div>

      {/* Visual route line at bottom */}
      <div className="mt-3 pt-2 border-t border-gray-100">
        <div className="flex items-center justify-between text-[10px] text-gray-400">
          <span>{routePoints?.length || 0} stops</span>
          <div className="flex items-center gap-1">
            <div className="w-8 h-px bg-gradient-to-r from-blue-400 via-violet-400 to-rose-400" />
            <span>one-way</span>
          </div>
        </div>
      </div>
    </div>
  );
}
