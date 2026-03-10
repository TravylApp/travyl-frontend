'use client';

import { memo, useMemo, useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import type { ItineraryDayViewModel, ActivityViewModel } from '@travyl/shared';
import { ChevronLeft, ChevronRight, Clock, MapPin, Plus } from 'lucide-react';

interface CalendarDayViewProps {
  day: ItineraryDayViewModel | null;
  days: ItineraryDayViewModel[];
  selectedDayIndex: number;
  onSelectDay: (index: number) => void;
  onActivityClick: (activityId: string) => void;
  onAddActivity: (hour: number) => void;
}

const HOUR_HEIGHT = 60;
const HOURS_START = 6;
const HOURS_END = 24;

const CATEGORY_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  sightseeing: { bg: '#0d948815', border: '#0d9488', text: '#0d9488' },
  tour: { bg: '#8b5cf615', border: '#8b5cf6', text: '#6b21a8' },
  dining: { bg: '#ea580c15', border: '#ea580c', text: '#c2410c' },
  cultural: { bg: '#6366f115', border: '#6366f1', text: '#4f46e5' },
  shopping: { bg: '#ec489915', border: '#ec4899', text: '#be185d' },
  nightlife: { bg: '#7c3aed15', border: '#7c3aed', text: '#6d28d9' },
  outdoor: { bg: '#16a34a15', border: '#16a34a', text: '#15803d' },
  museum: { bg: '#2563eb15', border: '#2563eb', text: '#1d4ed8' },
  event: { bg: '#dc262615', border: '#dc2626', text: '#b91c1c' },
  hotel: { bg: '#0891b215', border: '#0891b2', text: '#0e7490' },
  transport: { bg: '#64748b15', border: '#64748b', text: '#475569' },
};

function parseTimeToHour(timeStr: string | null): number {
  if (!timeStr) return 12;
  const match = timeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
  if (!match) return 12;
  let hour = parseInt(match[1], 10);
  const period = match[3]?.toUpperCase();
  if (period === 'PM' && hour !== 12) hour += 12;
  if (period === 'AM' && hour === 12) hour = 0;
  return hour;
}

function formatHour(hour: number): string {
  const h = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  const period = hour >= 12 ? 'PM' : 'AM';
  return `${h} ${period}`;
}

interface ActivityBlockProps {
  activity: ActivityViewModel;
  style: React.CSSProperties;
  onClick: () => void;
}

const ActivityBlock = memo(function ActivityBlock({ activity, style, onClick }: ActivityBlockProps) {
  const colors = CATEGORY_COLORS[activity.category] || CATEGORY_COLORS.sightseeing;

  return (
    <motion.button
      onClick={onClick}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ scale: 1.02 }}
      className="absolute left-1 right-1 rounded-lg border-l-4 overflow-hidden cursor-pointer group"
      style={{ ...style, backgroundColor: colors.bg, borderLeftColor: colors.border }}
    >
      <div className="p-2 h-full flex flex-col">
        <span className="text-[11px] font-semibold truncate" style={{ color: colors.text }}>
          {activity.name}
        </span>
        <div className="flex items-center gap-1 mt-0.5">
          <Clock size={10} className="text-gray-400" />
          <span className="text-[10px] text-gray-500">{activity.timeDisplay}</span>
        </div>
        {activity.locationName && (
          <div className="flex items-center gap-1 mt-0.5">
            <MapPin size={10} className="text-gray-400" />
            <span className="text-[10px] text-gray-500 truncate">{activity.locationName}</span>
          </div>
        )}
      </div>
    </motion.button>
  );
});

export const CalendarDayView = memo(function CalendarDayView({
  day,
  days,
  selectedDayIndex,
  onSelectDay,
  onActivityClick,
  onAddActivity,
}: CalendarDayViewProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [currentTimeTop, setCurrentTimeTop] = useState<number | null>(null);

  // Current time indicator
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const hours = now.getHours();
      if (hours >= HOURS_START && hours < HOURS_END) {
        const minutes = now.getMinutes();
        const top = (hours - HOURS_START + minutes / 60) * HOUR_HEIGHT;
        setCurrentTimeTop(top);
      } else {
        setCurrentTimeTop(null);
      }
    };
    updateTime();
    const interval = setInterval(updateTime, 60000);
    return () => clearInterval(interval);
  }, []);

  // Scroll to current time or 9 AM on mount
  useEffect(() => {
    if (scrollRef.current) {
      const scrollToHour = currentTimeTop !== null ? Math.max(0, currentTimeTop - 100) : (9 - HOURS_START) * HOUR_HEIGHT;
      scrollRef.current.scrollTop = scrollToHour;
    }
  }, []);

  // Get all activities with position data
  const activityBlocks = useMemo(() => {
    if (!day) return [];
    const blocks: Array<{ activity: ActivityViewModel; top: number; height: number }> = [];

    for (const group of day.timeGroups) {
      for (const activity of group.activities) {
        const startHour = parseTimeToHour(activity.startTime);
        const endHour = parseTimeToHour(activity.endTime);
        const duration = Math.max(1, endHour - startHour);

        blocks.push({
          activity,
          top: (startHour - HOURS_START) * HOUR_HEIGHT,
          height: Math.max(duration * HOUR_HEIGHT - 4, HOUR_HEIGHT - 4),
        });
      }
    }

    return blocks;
  }, [day]);

  const goToPrevDay = useCallback(() => {
    if (selectedDayIndex > 0) onSelectDay(selectedDayIndex - 1);
  }, [selectedDayIndex, onSelectDay]);

  const goToNextDay = useCallback(() => {
    if (selectedDayIndex < days.length - 1) onSelectDay(selectedDayIndex + 1);
  }, [selectedDayIndex, days.length, onSelectDay]);

  if (!day) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400">
        No day selected
      </div>
    );
  }

  const totalHeight = (HOURS_END - HOURS_START) * HOUR_HEIGHT;

  return (
    <div className="flex flex-col h-full">
      {/* Day Navigation Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-white">
        <div className="flex items-center gap-2">
          <button
            onClick={goToPrevDay}
            disabled={selectedDayIndex === 0}
            className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
              selectedDayIndex > 0
                ? 'hover:bg-gray-100 text-gray-600'
                : 'text-gray-300 cursor-not-allowed'
            }`}
          >
            <ChevronLeft size={20} strokeWidth={1.5} />
          </button>
          <button
            onClick={goToNextDay}
            disabled={selectedDayIndex === days.length - 1}
            className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
              selectedDayIndex < days.length - 1
                ? 'hover:bg-gray-100 text-gray-600'
                : 'text-gray-300 cursor-not-allowed'
            }`}
          >
            <ChevronRight size={20} strokeWidth={1.5} />
          </button>
        </div>
        <div className="text-center">
          <h2 className="text-sm font-semibold text-gray-900">{day.dayLabel}</h2>
          <p className="text-xs text-gray-500">{day.dateLabel}</p>
        </div>
        <div className="w-16" />
      </div>

      {/* Calendar Grid */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        <div className="flex">
          {/* Time Axis */}
          <div className="w-14 flex-shrink-0 bg-white border-r border-gray-100">
            {Array.from({ length: HOURS_END - HOURS_START }).map((_, i) => {
              const hour = HOURS_START + i;
              return (
                <div
                  key={hour}
                  className="flex items-start justify-end pr-2 pt-1 text-[10px] text-gray-400 font-medium"
                  style={{ height: HOUR_HEIGHT }}
                >
                  {formatHour(hour)}
                </div>
              );
            })}
          </div>

          {/* Activity Area */}
          <div className="flex-1 relative bg-white" style={{ height: totalHeight }}>
            {/* Hour Lines */}
            {Array.from({ length: HOURS_END - HOURS_START }).map((_, i) => (
              <div
                key={i}
                className="absolute left-0 right-0 border-t border-gray-100"
                style={{ top: i * HOUR_HEIGHT }}
              />
            ))}

            {/* Current Time Indicator */}
            {currentTimeTop !== null && (
              <div
                className="absolute left-0 right-0 z-20 flex items-center"
                style={{ top: currentTimeTop }}
              >
                <div className="w-2 h-2 rounded-full bg-red-500 -ml-1" />
                <div className="flex-1 h-0.5 bg-red-500" />
              </div>
            )}

            {/* Activity Blocks */}
            <AnimatePresence>
              {activityBlocks.map(({ activity, top, height }) => (
                <ActivityBlock
                  key={activity.id}
                  activity={activity}
                  style={{ top, height }}
                  onClick={() => onActivityClick(activity.id)}
                />
              ))}
            </AnimatePresence>

            {/* Click to Add */}
            {Array.from({ length: HOURS_END - HOURS_START }).map((_, i) => {
              const hour = HOURS_START + i;
              return (
                <button
                  key={hour}
                  onClick={() => onAddActivity(hour)}
                  className="absolute left-0 right-0 opacity-0 hover:opacity-100 transition-opacity group"
                  style={{ top: i * HOUR_HEIGHT, height: HOUR_HEIGHT }}
                >
                  <div className="h-full flex items-center justify-center">
                    <div className="w-8 h-8 rounded-full bg-[#1e3a5f]/10 flex items-center justify-center group-hover:bg-[#1e3a5f]/20 transition-colors">
                      <Plus size={16} className="text-[#1e3a5f]" />
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
});
