'use client';

import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useWeekState } from '@/contexts/WeekStateContext';
import { buildWeekLayout, toDateStr } from '@/utils/calendarUtils';
import { resolveTheme } from '@travyl/shared';
import type { CalendarTrip } from '@travyl/shared';

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const STATUS_COLORS: Record<string, string> = {
  planning: '#9CA3AF',
  booked: '#F59E0B',
  active: '#10B981',
  completed: '#003594',
  abandoned: '#EF4444',
};

interface CalendarGridProps {
  trips: CalendarTrip[];
}

export function CalendarGrid({ trips }: CalendarGridProps) {
  const { weekStart } = useWeekState();
  const todayStr = useMemo(() => toDateStr(new Date()), []);

  const week = useMemo<Date[]>(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(weekStart);
      d.setDate(d.getDate() + i);
      return d;
    });
  }, [weekStart]);

  const weekStartStr = toDateStr(week[0]);
  const weekEndStr = toDateStr(week[6]);

  const layout = useMemo(() => buildWeekLayout(trips, week), [trips, week]);

  // Group trips by slot index for rendering
  const slots = useMemo<CalendarTrip[][]>(() => {
    const arr: CalendarTrip[][] = Array.from({ length: layout.totalSlots }, () => []);
    layout.weekTrips.forEach((trip) => {
      const slotIdx = layout.tripSlots.get(trip.id) ?? 0;
      arr[slotIdx].push(trip);
    });
    return arr;
  }, [layout]);

  return (
    <div className="flex flex-col bg-white" style={{ height: 'calc(100vh - 48px)' }}>
      {/* Day-of-week header */}
      <div className="grid grid-cols-7 border-b border-gray-200 shrink-0">
        {week.map((day, i) => {
          const isToday = toDateStr(day) === todayStr;
          return (
            <div
              key={i}
              className={[
                'flex flex-col items-center py-3',
                isToday ? 'bg-blue-50/50' : '',
                i < 6 ? 'border-r border-gray-100' : '',
              ].filter(Boolean).join(' ')}
            >
              <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                {DAY_NAMES[day.getDay()]}
              </span>
              <span
                className={[
                  'mt-1 w-9 h-9 flex items-center justify-center rounded-full text-[15px] font-semibold',
                  isToday ? 'bg-[#003594] text-white' : 'text-gray-800',
                ].join(' ')}
              >
                {day.getDate()}
              </span>
            </div>
          );
        })}
      </div>

      {/* Trip area — scrollable */}
      <div className="flex-1 overflow-y-auto">
        <div className="relative min-h-full">
          {/* Vertical column guides */}
          <div className="absolute inset-0 grid grid-cols-7 pointer-events-none">
            {week.map((day, i) => (
              <div
                key={i}
                className={[
                  i < 6 ? 'border-r border-gray-100' : '',
                  toDateStr(day) === todayStr ? 'bg-blue-50/20' : '',
                ].filter(Boolean).join(' ')}
              />
            ))}
          </div>

          {/* Trips or empty state */}
          <div className="relative px-1 pt-3 pb-8 flex flex-col gap-1.5">
            {slots.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 text-center">
                <svg
                  className="w-12 h-12 text-gray-200 mb-4"
                  fill="none"
                  viewBox="0 0 48 48"
                  stroke="currentColor"
                  strokeWidth={1.5}
                >
                  <rect x="6" y="10" width="36" height="32" rx="4" />
                  <path d="M6 18h36M16 6v8M32 6v8" />
                </svg>
                <p className="text-sm font-medium text-gray-400">No trips this week</p>
                <p className="text-xs text-gray-300 mt-1">Navigate to another week or create a trip</p>
              </div>
            ) : (
              slots.map((slotTrips, slotIdx) => (
                <TripRow
                  key={slotIdx}
                  trips={slotTrips}
                  week={week}
                  weekStartStr={weekStartStr}
                  weekEndStr={weekEndStr}
                />
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

interface TripRowProps {
  trips: CalendarTrip[];
  week: Date[];
  weekStartStr: string;
  weekEndStr: string;
}

function TripRow({ trips, week, weekStartStr, weekEndStr }: TripRowProps) {
  return (
    <div className="grid grid-cols-7 h-8">
      {trips.map((trip) => (
        <TripBar
          key={trip.id}
          trip={trip}
          week={week}
          weekStartStr={weekStartStr}
          weekEndStr={weekEndStr}
        />
      ))}
    </div>
  );
}

interface TripBarProps {
  trip: CalendarTrip;
  week: Date[];
  weekStartStr: string;
  weekEndStr: string;
}

function TripBar({ trip, week, weekStartStr, weekEndStr }: TripBarProps) {
  const router = useRouter();
  const bgColor = resolveTheme(trip.theme, trip.custom_theme_color).base;
  const statusColor = STATUS_COLORS[trip.status] ?? '#9CA3AF';

  const isContinued = trip.start_date < weekStartStr;
  const continues = trip.end_date > weekEndStr;

  const startIdx = isContinued
    ? 0
    : week.findIndex((d) => toDateStr(d) === trip.start_date);
  const endIdx = continues
    ? 6
    : week.findIndex((d) => toDateStr(d) === trip.end_date);

  // CSS grid is 1-indexed; end is exclusive
  const colStart = startIdx + 1;
  const colEnd = endIdx + 2;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => router.push('/trip/' + trip.id)}
      onKeyDown={(e) => e.key === 'Enter' && router.push('/trip/' + trip.id)}
      style={{ gridColumn: `${colStart} / ${colEnd}`, backgroundColor: bgColor }}
      className={[
        'h-8 flex items-center px-2 cursor-pointer hover:opacity-90 transition-opacity overflow-hidden',
        !isContinued ? 'rounded-l-[4px]' : '',
        !continues ? 'rounded-r-[4px]' : '',
      ].filter(Boolean).join(' ')}
    >
      {isContinued && (
        <span className="text-[10px] text-white/60 mr-1 shrink-0">‹</span>
      )}
      <span className="text-xs font-medium text-white flex-1 truncate">
        {trip.title}
      </span>
      <span
        className="w-2 h-2 rounded-full shrink-0 ml-1.5"
        style={{ backgroundColor: statusColor }}
      />
      {continues && (
        <span className="text-[10px] text-white/60 ml-1 shrink-0">›</span>
      )}
    </div>
  );
}
