'use client';

import { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import Link from 'next/link';
import Image from 'next/image';
import { Calendar, Users, MapPin, Users2, Sparkles, Plane, Compass } from 'lucide-react';
import type { MockTripCard } from '@travyl/shared';
import { EASE_OUT_EXPO } from '@travyl/shared';
import { CountdownBadge } from './CountdownBadge';
import { WeatherPreview, getMockWeather } from './WeatherPreview';
import { BudgetBadge, generateMockExpenses } from './BudgetBadge';
import { LocationHover } from './LocationHover';

function formatDateRange(start: string, end: string): string {
  const s = new Date(start + 'T00:00:00');
  const e = new Date(end + 'T00:00:00');
  const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
  const sStr = s.toLocaleDateString('en-US', opts);
  const eStr = e.toLocaleDateString('en-US', { ...opts, year: 'numeric' });
  return `${sStr} – ${eStr}`;
}

function getTripDuration(start: string, end: string): number {
  const s = new Date(start + 'T00:00:00');
  const e = new Date(end + 'T00:00:00');
  return Math.ceil((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)) + 1;
}

const STATUS_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  planning: { label: 'Planning', bg: 'bg-blue-500/80', text: 'text-white' },
  booked: { label: 'Booked', bg: 'bg-emerald-500/80', text: 'text-white' },
  active: { label: 'Now', bg: 'bg-amber-500', text: 'text-white' },
  completed: { label: 'Done', bg: 'bg-gray-500/60', text: 'text-white' },
  abandoned: { label: 'Cancelled', bg: 'bg-red-500/60', text: 'text-white' },
};

interface TripWithSize extends MockTripCard {
  duration: number;
  /** Height in pixels */
  height: number;
  /** Flex basis in pixels - proportional to trip duration */
  flexBasis: number;
}

/** Check if a trip starts today */
function isTripStartingToday(startDate: string): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tripStart = new Date(startDate + 'T00:00:00');
  tripStart.setHours(0, 0, 0, 0);
  return today.getTime() === tripStart.getTime();
}

/** Featured hero for trip starting today */
function TodayTripHero({ trip }: { trip: TripWithSize }) {
  const weather = getMockWeather(trip.destination);

  return (
    <motion.div
      initial={{ opacity: 0, y: 30, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.6, ease: EASE_OUT_EXPO }}
      className="relative mb-8"
    >
      <Link
        href={`/trip/${trip.id}`}
        className="block relative w-full h-48 sm:h-56 rounded-3xl overflow-hidden shadow-2xl shadow-amber-500/20 group"
      >
        {/* Background image */}
        <Image
          src={trip.image}
          alt={trip.destination}
          fill
          className="object-cover group-hover:scale-105 transition-transform duration-700"
          sizes="100vw"
        />

        {/* Gradient overlays */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/40 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20" />

        {/* Content */}
        <div className="absolute inset-0 p-6 sm:p-8 flex flex-col justify-between">
          {/* Top row - Badge */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white text-primary-dark">
              <Plane size={14} className="text-accent-amber" />
              <span className="font-semibold text-sm">Starting today</span>
            </div>
            {trip.is_shared && (
              <span className="p-2 rounded-full bg-white/20 backdrop-blur-sm">
                <Users2 size={14} className="text-white" />
              </span>
            )}
          </div>

          {/* Bottom row - Trip info */}
          <div>
            <div className="flex items-center gap-2 text-white/70 mb-2">
              <Compass size={16} />
              <span className="text-sm">Your adventure begins now</span>
            </div>

            <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">
              {trip.title}
            </h2>

            <div className="flex flex-wrap items-center gap-4 text-white/80 text-sm">
              <LocationHover trip={trip} />
              <div className="flex items-center gap-1.5">
                <Calendar size={14} className="text-white/60" />
                <span>{formatDateRange(trip.start_date, trip.end_date)}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Users size={14} className="text-white/60" />
                <span>{trip.travelers} {trip.travelers === 1 ? 'traveler' : 'travelers'}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="font-medium">{trip.duration} {trip.duration === 1 ? 'day' : 'days'}</span>
              </div>
              <WeatherPreview
                destination={trip.destination}
                startDate={trip.start_date}
                highTemp={weather.highTemp}
                lowTemp={weather.lowTemp}
                condition={weather.condition}
              />
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

const STATUS_PRIORITY: Record<string, number> = {
  active: 0,
  booked: 1,
  planning: 2,
  completed: 3,
  abandoned: 4,
};

/** Calculate sizes based on trip duration */
function calculateLayout(trips: MockTripCard[]): { upcoming: TripWithSize[]; past: TripWithSize[] } {
  const upcoming: TripWithSize[] = [];
  const past: TripWithSize[] = [];

  trips.forEach((trip) => {
    const duration = getTripDuration(trip.start_date, trip.end_date);
    const isPast = trip.status === 'completed' || trip.status === 'abandoned';

    // Height is fixed for all cards
    const height = 240;

    // Flex basis: pixel values proportional to trip duration
    // Longer trips get wider cards
    let flexBasis = 280; // default (5-6 days)
    if (duration >= 14) flexBasis = 480;      // 14+ days: widest
    else if (duration >= 10) flexBasis = 400; // 10-13 days: large
    else if (duration >= 7) flexBasis = 340;  // 7-9 days: medium
    else if (duration >= 5) flexBasis = 280;  // 5-6 days: small
    else flexBasis = 220;                      // 3-4 days: smallest

    const tripWithSize: TripWithSize = {
      ...trip,
      duration,
      height,
      flexBasis,
    };

    if (isPast) {
      past.push(tripWithSize);
    } else {
      upcoming.push(tripWithSize);
    }
  });

  // Sort by relevance
  const sortByRelevance = (a: TripWithSize, b: TripWithSize) => {
    const priorityDiff = (STATUS_PRIORITY[a.status] ?? 5) - (STATUS_PRIORITY[b.status] ?? 5);
    if (priorityDiff !== 0) return priorityDiff;
    return new Date(a.start_date).getTime() - new Date(b.start_date).getTime();
  };

  upcoming.sort(sortByRelevance);
  past.sort(sortByRelevance);

  return { upcoming, past };
}

/** Single flow card */
function FlowCard({ trip, index }: { trip: TripWithSize; index: number }) {
  const status = STATUS_COLORS[trip.status] || STATUS_COLORS.planning;
  const weather = getMockWeather(trip.destination);
  const isPast = trip.status === 'completed' || trip.status === 'abandoned';
  const [showTravelersHover, setShowTravelersHover] = useState(false);

  // Mock budget spent (for demo purposes)
  const budgetSpent = trip.budget ? Math.floor(trip.budget * 0.65) : 0;
  const budgetExpenses = trip.budget ? generateMockExpenses(trip.budget, budgetSpent) : undefined;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.5, delay: index * 0.04, ease: EASE_OUT_EXPO }}
      className="h-60 flex-1"
      style={{ flexBasis: `${trip.flexBasis}px`, minWidth: '200px' }}
    >
      <Link
        href={`/trip/${trip.id}`}
        className={`block relative w-full h-full rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 group ${isPast ? 'opacity-60 hover:opacity-100' : ''}`}
      >
        {/* Full-bleed image */}
        <Image
          src={trip.image}
          alt={trip.destination}
          fill
          className={`object-cover group-hover:scale-105 transition-transform duration-700 ${isPast ? 'grayscale-[40%] group-hover:grayscale-0' : ''}`}
          sizes="(max-width: 640px) 100vw, 50vw"
        />

        {/* Gradient overlays */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/40 via-transparent to-transparent" />

        {/* Top row */}
        <div className="absolute top-3 left-3 flex items-center gap-2">
          <span className="px-3 py-1.5 rounded-full bg-white/90 backdrop-blur-sm text-xs font-bold text-gray-800">
            {trip.duration} {trip.duration === 1 ? 'day' : 'days'}
          </span>
          {trip.is_shared && (
            <span className="p-1.5 rounded-full bg-white/80 backdrop-blur-sm">
              <Users2 size={12} className="text-primary-dark" />
            </span>
          )}
        </div>

        {/* Bottom content */}
        <div className="absolute bottom-0 left-0 right-0 p-4">
          {!isPast && (
            <CountdownBadge
              startDate={trip.start_date}
              endDate={trip.end_date}
              status={trip.status}
              size="small"
            />
          )}

          <h3 className="font-bold text-white mt-2 mb-1 line-clamp-1 text-lg">
            {trip.title}
          </h3>

          <LocationHover trip={trip} />

          <div className="flex items-center gap-4 text-white/80 text-xs">
            <span className="flex items-center gap-1">
              <Calendar size={12} />
              {formatDateRange(trip.start_date, trip.end_date)}
            </span>
            <div
              className="relative flex items-center gap-1 cursor-pointer"
              onMouseEnter={() => setShowTravelersHover(true)}
              onMouseLeave={() => setShowTravelersHover(false)}
            >
              <Users size={12} />
              <span>{trip.travelers}</span>

              {/* Travelers Hover Dropdown */}
              {showTravelersHover && trip.travelersList && trip.travelersList.length > 0 && (
                <div className="absolute bottom-full left-0 mb-2 z-50 animate-in fade-in-0 zoom-in-95 duration-150">
                  <div className="bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden min-w-[180px] py-1.5">
                    <div className="px-3 py-1.5 border-b border-gray-100">
                      <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Trip Travelers</span>
                    </div>
                    <div className="py-1">
                      {trip.travelersList.map((traveler) => (
                        <div
                          key={traveler.id}
                          className="flex items-center gap-2.5 px-3 py-2 hover:bg-gray-50 transition-colors"
                        >
                          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary-dark to-[#2563eb] flex items-center justify-center text-white text-xs font-medium">
                            {traveler.name.charAt(0)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-800 truncate">{traveler.name}</p>
                            <p className="text-[10px] text-gray-400 capitalize">{traveler.role}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  {/* Arrow pointer */}
                  <div className="absolute -bottom-1.5 left-3 w-2.5 h-2.5 bg-white border-r border-b border-gray-100 rotate-45" />
                </div>
              )}
            </div>
            {!isPast && (
              <WeatherPreview
                destination={trip.destination}
                startDate={trip.start_date}
                highTemp={weather.highTemp}
                lowTemp={weather.lowTemp}
                condition={weather.condition}
              />
            )}
            {trip.budget && !isPast && (
              <BudgetBadge
                budget={trip.budget}
                spent={budgetSpent}
                currency={trip.currency}
                expenses={budgetExpenses}
              />
            )}
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

/** Decorative blobs - minimal */
function FloatingDecorations() {
  return null;
}

interface DynamicFlowLayoutProps {
  trips: MockTripCard[];
}

export function DynamicFlowLayout({ trips }: DynamicFlowLayoutProps) {
  const { upcoming, past } = useMemo(() => calculateLayout(trips), [trips]);

  // Find trip starting today and separate it from regular upcoming trips
  const { todayTrip, otherUpcoming } = useMemo(() => {
    const today = upcoming.find((trip) => isTripStartingToday(trip.start_date));
    const others = upcoming.filter((trip) => !isTripStartingToday(trip.start_date));
    return { todayTrip: today || null, otherUpcoming: others };
  }, [upcoming]);

  return (
    <div className="relative">
      <FloatingDecorations />

      {/* Today's Trip Hero */}
      {todayTrip && <TodayTripHero trip={todayTrip} />}

      {/* Upcoming Adventures */}
      {otherUpcoming.length > 0 && (
        <>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: EASE_OUT_EXPO }}
            className="mb-6"
          >
            <h2 className="text-2xl font-bold text-primary-dark mb-1">Upcoming Adventures</h2>
            <p className="text-sm text-gray-500">{otherUpcoming.length} {otherUpcoming.length === 1 ? 'trip' : 'trips'} waiting for you</p>
          </motion.div>
          <div className="flex flex-wrap gap-4">
            {otherUpcoming.map((trip, idx) => (
              <FlowCard key={trip.id} trip={trip} index={idx} />
            ))}
          </div>
        </>
      )}

      {/* Past Adventures */}
      {past.length > 0 && (
        <>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2, ease: EASE_OUT_EXPO }}
            className="mt-12 mb-6"
          >
            <h2 className="text-2xl font-bold text-primary-dark mb-1">Past Adventures</h2>
            <p className="text-sm text-gray-500">{past.length} {past.length === 1 ? 'trip' : 'trips'} you've explored</p>
          </motion.div>
          <div className="flex flex-wrap gap-4">
            {past.map((trip, idx) => (
              <FlowCard key={trip.id} trip={trip} index={otherUpcoming.length + idx} />
            ))}
          </div>
        </>
      )}

      {/* Empty state */}
      {upcoming.length === 0 && past.length === 0 && (
        <div className="text-center py-16 text-gray-500">No trips to display</div>
      )}
    </div>
  );
}
