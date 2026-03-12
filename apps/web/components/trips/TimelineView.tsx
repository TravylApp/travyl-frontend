'use client';

import { motion } from 'motion/react';
import Link from 'next/link';
import Image from 'next/image';
import { Calendar, Users, MapPin, ChevronRight } from 'lucide-react';
import type { MockTripCard } from '@travyl/shared';
import { EASE_OUT_EXPO } from '@travyl/shared';
import { CountdownBadge } from './CountdownBadge';

const STATUS_COLORS: Record<string, string> = {
  planning: 'bg-blue-500',
  booked: 'bg-emerald-500',
  active: 'bg-amber-500',
  completed: 'bg-gray-400',
  abandoned: 'bg-red-400',
};

function formatDateRange(start: string, end: string): string {
  const s = new Date(start + 'T00:00:00');
  const e = new Date(end + 'T00:00:00');
  const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
  const sStr = s.toLocaleDateString('en-US', opts);
  const eStr = e.toLocaleDateString('en-US', { ...opts, year: 'numeric' });
  return `${sStr} – ${eStr}`;
}

interface TimelineViewProps {
  trips: MockTripCard[];
}

interface GroupedTrips {
  [key: string]: {
    label: string;
    trips: MockTripCard[];
  };
}

export function TimelineView({ trips }: TimelineViewProps) {
  // Group trips by month/year
  const groupedTrips: GroupedTrips = {};
  const now = new Date();

  // Sort trips by start date
  const sortedTrips = [...trips].sort((a, b) => {
    return new Date(a.start_date).getTime() - new Date(b.start_date).getTime();
  });

  sortedTrips.forEach((trip) => {
    const startDate = new Date(trip.start_date + 'T00:00:00');
    const monthYear = startDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    const key = `${startDate.getFullYear()}-${String(startDate.getMonth()).padStart(2, '0')}`;

    if (!groupedTrips[key]) {
      groupedTrips[key] = {
        label: monthYear,
        trips: [],
      };
    }
    groupedTrips[key].trips.push(trip);
  });

  const groups = Object.entries(groupedTrips);
  const currentMonthYear = now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  return (
    <div className="relative">
      {/* Timeline line */}
      <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gradient-to-b from-amber-200 via-gray-200 to-gray-100" />

      <div className="space-y-8">
        {groups.map(([key, group], groupIndex) => {
          const isCurrentMonth = group.label === currentMonthYear;

          return (
            <motion.div
              key={key}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, delay: groupIndex * 0.1, ease: EASE_OUT_EXPO }}
            >
              {/* Month/Year Separator */}
              <div className="relative flex items-center mb-4">
                <div className={`w-3 h-3 rounded-full ${isCurrentMonth ? 'bg-amber-500 ring-4 ring-amber-100' : 'bg-gray-300'} z-10`} />
                <h3 className={`ml-8 text-sm font-semibold ${isCurrentMonth ? 'text-amber-600' : 'text-gray-500'}`}>
                  {group.label}
                  {isCurrentMonth && (
                    <span className="ml-2 text-xs font-normal text-amber-500 bg-amber-50 px-2 py-0.5 rounded-full">
                      Current
                    </span>
                  )}
                </h3>
              </div>

              {/* Trips in this group */}
              <div className="ml-8 space-y-3">
                {group.trips.map((trip, tripIndex) => {
                  const statusColor = STATUS_COLORS[trip.status] || STATUS_COLORS.planning;
                  const isPast = new Date(trip.end_date + 'T00:00:00') < now;

                  return (
                    <motion.div
                      key={trip.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{
                        duration: 0.3,
                        delay: groupIndex * 0.1 + tripIndex * 0.05,
                        ease: EASE_OUT_EXPO,
                      }}
                    >
                      <Link
                        href={`/trip/${trip.id}`}
                        className={`flex items-center gap-4 p-3 rounded-xl bg-white/80 backdrop-blur-sm border border-gray-100 hover:bg-white hover:border-gray-200 hover:shadow-lg transition-all group ${
                          isPast ? 'opacity-70' : ''
                        }`}
                      >
                        {/* Timeline dot */}
                        <div className="relative">
                          <div className={`absolute left-[-24px] top-1/2 -translate-y-1/2 w-2 h-2 rounded-full ${statusColor}`} />
                        </div>

                        {/* Thumbnail */}
                        <div className="w-16 h-16 rounded-lg overflow-hidden shrink-0 relative ring-1 ring-gray-100">
                          <Image
                            src={trip.image}
                            alt={trip.destination}
                            fill
                            className="object-cover group-hover:scale-105 transition-transform duration-300"
                            sizes="64px"
                          />
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="text-base font-bold text-primary-dark truncate">{trip.title}</h4>
                            <CountdownBadge
                              startDate={trip.start_date}
                              endDate={trip.end_date}
                              status={trip.status}
                              size="small"
                            />
                          </div>

                          <div className="flex items-center gap-1.5 mb-1.5">
                            <MapPin size={12} className="text-accent-amber" />
                            <span className="text-sm text-gray-600">{trip.destination}</span>
                          </div>

                          <div className="flex items-center gap-4 text-xs text-gray-500">
                            <span className="flex items-center gap-1">
                              <Calendar size={12} className="text-gray-400" />
                              {formatDateRange(trip.start_date, trip.end_date)}
                            </span>
                            <span className="flex items-center gap-1">
                              <Users size={12} className="text-gray-400" />
                              {trip.travelers}
                            </span>
                          </div>
                        </div>

                        {/* Chevron */}
                        <ChevronRight size={16} className="text-gray-300 group-hover:text-accent-amber transition-colors shrink-0" />
                      </Link>
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Empty state */}
      {groups.length === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-12"
        >
          <p className="text-gray-500">No trips to display</p>
        </motion.div>
      )}
    </div>
  );
}
