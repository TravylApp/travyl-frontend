'use client';

import { memo, useMemo, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import type { ItineraryDayViewModel } from '@travyl/shared';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface MonthViewProps {
  days: ItineraryDayViewModel[];
  selectedDayIndex: number;
  onSelectDay: (index: number) => void;
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const CATEGORY_COLORS: Record<string, string> = {
  sightseeing: '#0d9488',
  tour: '#8b5cf6',
  dining: '#ea580c',
  cultural: '#6366f1',
  shopping: '#ec4899',
  nightlife: '#7c3aed',
  outdoor: '#16a34a',
  museum: '#2563eb',
  event: '#dc2626',
  hotel: '#0891b2',
  transport: '#64748b',
};

const DAY_IMAGES = [
  'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=100&h=100&fit=crop',
  'https://images.unsplash.com/photo-1499856871958-5b9627545d1a?w=100&h=100&fit=crop',
  'https://images.unsplash.com/photo-1550340499-a6c60fc8287c?w=100&h=100&fit=crop',
  'https://images.unsplash.com/photo-1478391679764-b2d8b3cd1e94?w=100&h=100&fit=crop',
  'https://images.unsplash.com/photo-1431274172761-fca41d930114?w=100&h=100&fit=crop',
];

export const MonthView = memo(function MonthView({
  days,
  selectedDayIndex,
  onSelectDay,
}: MonthViewProps) {
  const [viewOffset, setViewOffset] = useState(0);

  const calendarDays = useMemo(() => {
    if (days.length === 0) return [];
    return days.map((day, index) => ({
      ...day,
      index,
      activities: day.timeGroups.flatMap((g) => g.activities),
    }));
  }, [days]);

  const weeks = useMemo(() => {
    const result = [];
    for (let i = 0; i < calendarDays.length; i += 7) {
      result.push(calendarDays.slice(i, i + 7));
    }
    return result;
  }, [calendarDays]);

  const canGoPrev = viewOffset > 0;
  const canGoNext = (viewOffset + 1) * 2 < weeks.length;

  const visibleWeeks = useMemo(() => {
    const start = viewOffset * 2;
    return weeks.slice(start, start + 2);
  }, [weeks, viewOffset]);

  if (days.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <p className="text-sm text-gray-500">No trip days</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-1">
          <button
            onClick={() => canGoPrev && setViewOffset(v => v - 1)}
            disabled={!canGoPrev}
            className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
              canGoPrev
                ? 'bg-white hover:bg-gray-50 text-gray-600 border border-gray-200'
                : 'bg-gray-100 text-gray-300 cursor-not-allowed'
            }`}
          >
            <ChevronLeft size={18} strokeWidth={1.5} />
          </button>
          <button
            onClick={() => canGoNext && setViewOffset(v => v + 1)}
            disabled={!canGoNext}
            className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
              canGoNext
                ? 'bg-white hover:bg-gray-50 text-gray-600 border border-gray-200'
                : 'bg-gray-100 text-gray-300 cursor-not-allowed'
            }`}
          >
            <ChevronRight size={18} strokeWidth={1.5} />
          </button>
        </div>
        <span className="text-xs text-gray-500">
          {days[0]?.dateLabel} – {days[days.length - 1]?.dateLabel}
        </span>
      </div>

      {/* Weekday Headers */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {WEEKDAYS.map((day) => (
          <div key={day} className="text-center text-[10px] font-medium text-gray-400 py-1">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <AnimatePresence mode="wait">
        <motion.div
          key={viewOffset}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.2 }}
          className="space-y-1"
        >
          {visibleWeeks.map((week, weekIdx) => (
            <div key={weekIdx} className="grid grid-cols-7 gap-1">
              {week.map((day) => {
                const isSelected = day.index === selectedDayIndex;
                const imageUrl = DAY_IMAGES[day.index % DAY_IMAGES.length];
                const activityCount = day.activities.length;

                return (
                  <motion.button
                    key={day.id}
                    onClick={() => onSelectDay(day.index)}
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    className={`relative aspect-square rounded-lg overflow-hidden transition-all ${
                      isSelected ? 'ring-2 ring-[#1e3a5f] ring-offset-1' : ''
                    }`}
                  >
                    <img
                      src={imageUrl}
                      alt=""
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                    <div className={`absolute inset-0 ${isSelected ? 'bg-black/40' : 'bg-black/20'}`} />
                    <div className="relative h-full flex flex-col items-center justify-center p-1">
                      <span className="text-[9px] font-medium text-white/70">
                        {day.dayLabel}
                      </span>
                      <span className="text-sm font-semibold text-white">
                        {day.dayNumber}
                      </span>
                      {activityCount > 0 && (
                        <span className="absolute bottom-1 left-1/2 -translate-x-1/2 text-[8px] font-medium bg-white/90 text-gray-700 px-1.5 py-0.5 rounded-full">
                          {activityCount}
                        </span>
                      )}
                      {isSelected && (
                        <div className="absolute top-1 right-1 w-4 h-4 rounded-full bg-[#1e3a5f] flex items-center justify-center">
                          <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      )}
                    </div>
                  </motion.button>
                );
              })}
              {week.length < 7 &&
                Array.from({ length: 7 - week.length }).map((_, i) => (
                  <div key={`empty-${i}`} className="aspect-square rounded-lg bg-gray-100" />
                ))}
            </div>
          ))}
        </motion.div>
      </AnimatePresence>

      {/* Selected Day Summary */}
      {selectedDayIndex !== null && days[selectedDayIndex] && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4 p-3 bg-white rounded-lg border border-gray-200"
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-[13px] font-semibold text-gray-900">
                {days[selectedDayIndex].dayLabel} · {days[selectedDayIndex].dateLabel}
              </h3>
              <p className="text-[11px] text-gray-500">
                {days[selectedDayIndex].activityCount} activities
              </p>
            </div>
          </div>

          {/* Category Pills */}
          <div className="flex gap-1.5 mt-2 flex-wrap">
            {Object.entries(
              days[selectedDayIndex].timeGroups.reduce((acc, g) => {
                g.activities.forEach((a) => {
                  acc[a.category] = (acc[a.category] || 0) + 1;
                });
                return acc;
              }, {} as Record<string, number>)
            ).map(([category, count]) => (
              <span
                key={category}
                className="px-2 py-0.5 rounded-full text-[10px] font-medium"
                style={{
                  backgroundColor: `${CATEGORY_COLORS[category] || '#6b7280'}15`,
                  color: CATEGORY_COLORS[category] || '#6b7280',
                }}
              >
                {category} {count}
              </span>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
});
