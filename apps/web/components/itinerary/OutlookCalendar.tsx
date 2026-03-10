'use client';

import { memo, useMemo, useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import type { ItineraryDayViewModel, ActivityViewModel } from '@travyl/shared';
import {
  ChevronLeft, ChevronRight, Clock, MapPin, Plus, List
} from 'lucide-react';

interface OutlookCalendarProps {
  days: ItineraryDayViewModel[];
  selectedDayIndex: number;
  onSelectDay: (index: number) => void;
  onActivityClick: (activityId: string) => void;
  onAddActivity: (hour: number) => void;
}

const HOUR_HEIGHT = 60;
const HOURS_START = 6;
const HOURS_END = 24;
const SIDEBAR_WIDTH = 200;

const CATEGORY_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  sightseeing: { bg: '#0d9488', border: '#0d9488', text: '#ffffff' },
  tour: { bg: '#8b5cf6', border: '#8b5cf6', text: '#ffffff' },
  dining: { bg: '#ea580c', border: '#ea580c', text: '#ffffff' },
  cultural: { bg: '#6366f1', border: '#6366f1', text: '#ffffff' },
  shopping: { bg: '#ec4899', border: '#ec4899', text: '#ffffff' },
  nightlife: { bg: '#7c3aed', border: '#7c3aed', text: '#ffffff' },
  outdoor: { bg: '#16a34a', border: '#16a34a', text: '#ffffff' },
  museum: { bg: '#2563eb', border: '#2563eb', text: '#ffffff' },
  event: { bg: '#dc2626', border: '#dc2626', text: '#ffffff' },
  hotel: { bg: '#0891b2', border: '#0891b2', text: '#ffffff' },
  transport: { bg: '#64748b', border: '#64748b', text: '#ffffff' },
};

const WEEKDAYS_SHORT = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const WEEKDAYS_FULL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];

// Random travel images for activity cards
const ACTIVITY_IMAGES = [
  'https://images.unsplash.com/photo-1499856871958-5b9627545d1a?w=300&h=200&fit=crop', // Paris streets
  'https://images.unsplash.com/photo-1550340499-a6c60fc8287c?w=300&h=200&fit=crop', // Paris cafe
  'https://images.unsplash.com/photo-1478391679764-b2d8b3cd1e94?w=300&h=200&fit=crop', // Paris tower
  'https://images.unsplash.com/photo-1431274172761-fca41d930114?w=300&h=200&fit=crop', // Paris bridge
  'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=300&h=200&fit=crop', // Paris Eiffel
  'https://images.unsplash.com/photo-1499856871958-5b9627545d1a?w=300&h=200&fit=crop', // Paris streets
  'https://images.unsplash.com/photo-1550340499-a6c60fc8287c?w=300&h=200&fit=crop', // Paris cafe
  'https://images.unsplash.com/photo-1502899576159-f224dc2349fa?w=300&h=200&fit=crop', // Paris night
  'https://images.unsplash.com/photo-1555992828-ca4dbe41d294?w=300&h=200&fit=crop', // Paris architecture
  'https://images.unsplash.com/photo-1568797629192-f83a4a1e0c1c?w=300&h=200&fit=crop', // Paris museum
];

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

function formatHourShort(hour: number): string {
  if (hour === 0 || hour === 12) return hour === 0 ? '12 AM' : '12 PM';
  return hour < 12 ? `${hour} AM` : `${hour - 12} PM`;
}

// ─── Mini Calendar (Left Sidebar) ────────────────────────────────────────────

interface MiniCalendarProps {
  days: ItineraryDayViewModel[];
  selectedDayIndex: number;
  onSelectDay: (index: number) => void;
  viewDate: Date;
  onViewDateChange: (date: Date) => void;
}

const MiniCalendar = memo(function MiniCalendar({
  days,
  selectedDayIndex,
  onSelectDay,
  viewDate,
  onViewDateChange,
}: MiniCalendarProps) {
  const calendarDays = useMemo(() => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startPadding = firstDay.getDay();

    const result: Array<{ date: Date; isCurrentMonth: boolean; dayIndex: number | null }> = [];

    for (let i = 0; i < startPadding; i++) {
      const date = new Date(year, month, -startPadding + i + 1);
      result.push({ date, isCurrentMonth: false, dayIndex: null });
    }

    for (let day = 1; day <= lastDay.getDate(); day++) {
      const date = new Date(year, month, day);
      const dayIndex = days.findIndex(d => d.dayNumber === day);
      result.push({ date, isCurrentMonth: true, dayIndex: dayIndex >= 0 ? dayIndex : null });
    }

    const remaining = 42 - result.length;
    for (let i = 1; i <= remaining; i++) {
      const date = new Date(year, month + 1, i);
      result.push({ date, isCurrentMonth: false, dayIndex: null });
    }

    return result;
  }, [viewDate, days]);

  const goToPrevMonth = useCallback(() => {
    onViewDateChange(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1));
  }, [viewDate, onViewDateChange]);

  const goToNextMonth = useCallback(() => {
    onViewDateChange(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1));
  }, [viewDate, onViewDateChange]);

  const goToToday = useCallback(() => {
    onViewDateChange(new Date());
  }, [onViewDateChange]);

  return (
    <div className="p-3" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
      <div className="flex items-center justify-between mb-3">
        <button onClick={goToPrevMonth} className="w-7 h-7 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-500 transition-colors">
          <ChevronLeft size={16} />
        </button>
        <button onClick={goToToday} className="text-xs font-bold text-gray-700 hover:text-[#1e3a5f] tracking-tight">
          {MONTHS[viewDate.getMonth()]} {viewDate.getFullYear()}
        </button>
        <button onClick={goToNextMonth} className="w-7 h-7 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-500 transition-colors">
          <ChevronRight size={16} />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-0.5 mb-1">
        {WEEKDAYS_SHORT.map((day, i) => (
          <div key={i} className="text-center text-[10px] font-semibold text-gray-400 py-1 uppercase tracking-wider">{day}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-0.5">
        {calendarDays.map(({ date, isCurrentMonth, dayIndex }, i) => {
          const isSelected = dayIndex !== null && dayIndex === selectedDayIndex;
          const isToday = date.toDateString() === new Date().toDateString();
          const hasActivity = dayIndex !== null;

          return (
            <button
              key={i}
              onClick={() => hasActivity && onSelectDay(dayIndex!)}
              disabled={!hasActivity}
              className={`aspect-square rounded-lg text-[11px] font-semibold flex items-center justify-center transition-all relative tracking-tight
                ${!isCurrentMonth ? 'text-gray-300' : ''}
                ${hasActivity ? 'cursor-pointer hover:bg-gray-100' : 'cursor-default'}
                ${isSelected ? 'bg-[#1e3a5f] text-white hover:bg-[#1e3a5f]' : ''}
                ${isToday && !isSelected ? 'text-[#1e3a5f] font-bold' : ''}`}
            >
              {date.getDate()}
              {hasActivity && !isSelected && (
                <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-[#1e3a5f]" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
});

// ─── Activity Block ────────────────────────────────────────────────────

interface ActivityBlockProps {
  activity: ActivityViewModel;
  style: React.CSSProperties;
  onClick: () => void;
  imageIndex: number;
}

const ActivityBlock = memo(function ActivityBlock({ activity, style, onClick, imageIndex }: ActivityBlockProps) {
  const colors = CATEGORY_COLORS[activity.category] || CATEGORY_COLORS.sightseeing;
  const isShort = (style.height as number) < 80;
  const imageUrl = ACTIVITY_IMAGES[imageIndex % ACTIVITY_IMAGES.length];

  return (
    <motion.button
      onClick={onClick}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ scale: 1.02 }}
      className="absolute left-0.5 right-0.5 rounded-lg overflow-hidden cursor-pointer shadow-md"
      style={{ ...style, backgroundColor: '#1a1a1a', fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}
    >
      {/* Background Image */}
      <img
        src={imageUrl}
        alt=""
        className="absolute inset-0 w-full h-full object-cover"
      />
      {/* Gradient Overlay - stronger at bottom */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />
      {/* Left border accent */}
      <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l-lg" style={{ backgroundColor: colors.border }} />

      {/* Content - all at bottom left (AllTrails-style typography) */}
      <div className="absolute bottom-0 left-0 right-0 p-2">
        {/* Name - bottom left with AllTrails bold style */}
        <span className={`font-bold text-white leading-snug block truncate tracking-tight ${isShort ? 'text-[10px]' : 'text-[11px]'}`}>
          {activity.name}
        </span>

        {/* Address & Time - cleaner hierarchy */}
        {!isShort && (
          <>
            {activity.locationName && (
              <div className="flex items-center gap-1 mt-0.5">
                <MapPin size={8} className="text-white/60 flex-shrink-0" />
                <span className="text-[9px] font-medium text-white/75 truncate tracking-wide">{activity.locationName}</span>
              </div>
            )}
            <div className="flex items-center gap-1 mt-0.5">
              <Clock size={8} className="text-white/60 flex-shrink-0" />
              <span className="text-[9px] font-medium text-white/75 tracking-wide">{activity.timeDisplay}</span>
            </div>
          </>
        )}
      </div>
    </motion.button>
  );
});

// ─── 7-Day Week View ────────────────────────────────────────────────────

interface WeekViewProps {
  days: ItineraryDayViewModel[];
  weekStartIndex: number;
  onActivityClick: (activityId: string) => void;
  onAddActivity: (hour: number, dayIndex: number) => void;
}

const WeekView = memo(function WeekView({
  days,
  weekStartIndex,
  onActivityClick,
  onAddActivity,
}: WeekViewProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [currentTimeTop, setCurrentTimeTop] = useState<number | null>(null);

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

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = (9 - HOURS_START) * HOUR_HEIGHT;
    }
  }, []);

  // Always show 7 days
  const visibleDays = useMemo(() => {
    const result: Array<{ day: ItineraryDayViewModel | null; originalIndex: number }> = [];
    for (let i = 0; i < 7; i++) {
      const dayIndex = weekStartIndex + i;
      result.push({
        day: dayIndex < days.length ? days[dayIndex] : null,
        originalIndex: dayIndex,
      });
    }
    return result;
  }, [days, weekStartIndex]);

  const getActivityBlocks = useCallback((day: ItineraryDayViewModel) => {
    const blocks: Array<{ activity: ActivityViewModel; top: number; height: number }> = [];
    for (const group of day.timeGroups) {
      for (const activity of group.activities) {
        const startHour = parseTimeToHour(activity.startTime);
        const endHour = parseTimeToHour(activity.endTime);
        const duration = Math.max(0.5, endHour - startHour);
        blocks.push({
          activity,
          top: (startHour - HOURS_START) * HOUR_HEIGHT,
          height: Math.max(duration * HOUR_HEIGHT - 2, HOUR_HEIGHT / 2 - 2),
        });
      }
    }
    return blocks;
  }, []);

  const totalHeight = (HOURS_END - HOURS_START) * HOUR_HEIGHT;

  return (
    <div ref={scrollRef} className="flex-1 overflow-y-auto bg-white">
      <div className="flex min-h-full">
        {/* Time Axis - AllTrails style */}
        <div className="flex-shrink-0 bg-gray-50 border-r border-gray-200 sticky left-0 z-10" style={{ width: 60, fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
          <div className="h-12 border-b border-gray-200" /> {/* Header spacer */}
          {Array.from({ length: HOURS_END - HOURS_START }).map((_, i) => {
            const hour = HOURS_START + i;
            return (
              <div
                key={hour}
                className="flex items-start justify-end pr-2 pt-1.5 text-[10px] text-gray-400 font-semibold tracking-tight"
                style={{ height: HOUR_HEIGHT }}
              >
                {formatHourShort(hour)}
              </div>
            );
          })}
        </div>

        {/* 7 Day Columns */}
        {visibleDays.map(({ day, originalIndex }, dayOffset) => {
          const activityBlocks = day ? getActivityBlocks(day) : [];

          return (
            <div
              key={dayOffset}
              className="flex-1 min-w-[100px] border-r border-gray-200 relative bg-white"
            >
              {/* Day Header - AllTrails style */}
              <div className="h-12 border-b border-gray-200 flex flex-col items-center justify-center bg-gray-50 sticky top-0 z-10" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
                <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">
                  {WEEKDAYS_FULL[dayOffset].slice(0, 3)}
                </span>
                <span className={`text-sm font-bold tracking-tight ${day ? 'text-gray-900' : 'text-gray-300'}`}>
                  {day ? day.dayNumber : ''}
                </span>
              </div>

              {/* Activity Area */}
              <div className="relative" style={{ height: totalHeight }}>
                {/* Hour Lines */}
                {Array.from({ length: HOURS_END - HOURS_START }).map((_, i) => (
                  <div key={i} className="absolute left-0 right-0 border-t border-gray-100" style={{ top: i * HOUR_HEIGHT }} />
                ))}

                {/* Current Time Indicator */}
                {currentTimeTop !== null && (
                  <div className="absolute left-0 right-0 z-20 flex items-center" style={{ top: currentTimeTop }}>
                    <div className="flex-1 h-0.5 bg-red-500" />
                  </div>
                )}

                {/* Activity Blocks */}
                {day && (
                  <AnimatePresence>
                    {activityBlocks.map(({ activity, top, height }, blockIndex) => (
                      <ActivityBlock
                        key={activity.id}
                        activity={activity}
                        style={{ top, height }}
                        imageIndex={blockIndex + dayOffset}
                        onClick={() => onActivityClick(activity.id)}
                      />
                    ))}
                  </AnimatePresence>
                )}

                {/* Click to Add */}
                {day && Array.from({ length: HOURS_END - HOURS_START }).map((_, i) => {
                  const hour = HOURS_START + i;
                  return (
                    <button
                      key={hour}
                      onClick={() => onAddActivity(hour, originalIndex)}
                      className="absolute left-0 right-0 opacity-0 hover:opacity-100 transition-opacity group"
                      style={{ top: i * HOUR_HEIGHT, height: HOUR_HEIGHT }}
                    >
                      <div className="h-full flex items-center justify-center">
                        <div className="w-6 h-6 rounded-full bg-[#1e3a5f]/10 flex items-center justify-center group-hover:bg-[#1e3a5f]/20 transition-colors">
                          <Plus size={12} className="text-[#1e3a5f]" />
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
});

// ─── Main Outlook Calendar Component ────────────────────────────────────────────

export const OutlookCalendar = memo(function OutlookCalendar({
  days,
  selectedDayIndex,
  onSelectDay,
  onActivityClick,
  onAddActivity,
}: OutlookCalendarProps) {
  const [viewDate, setViewDate] = useState(new Date());
  const [showSidebar, setShowSidebar] = useState(true);

  // Calculate week start (align to 7-day chunks)
  const weekStartIndex = useMemo(() => {
    return Math.floor(selectedDayIndex / 7) * 7;
  }, [selectedDayIndex]);

  const goToPrevWeek = useCallback(() => {
    const newStart = Math.max(0, weekStartIndex - 7);
    onSelectDay(newStart);
  }, [weekStartIndex, onSelectDay]);

  const goToNextWeek = useCallback(() => {
    const newStart = Math.min(days.length - 1, weekStartIndex + 7);
    onSelectDay(newStart);
  }, [weekStartIndex, days.length, onSelectDay]);

  const goToToday = useCallback(() => {
    onSelectDay(0);
  }, [onSelectDay]);

  if (days.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-gray-400">
        No trip days available
      </div>
    );
  }

  // Week range display
  const weekStart = days[weekStartIndex];
  const weekEnd = days[Math.min(weekStartIndex + 6, days.length - 1)];

  return (
    <div className="h-full flex bg-white">
      {/* Left Sidebar */}
      <AnimatePresence>
        {showSidebar && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: SIDEBAR_WIDTH, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="border-r border-gray-200 bg-gray-50/50 flex-shrink-0 overflow-hidden"
          >
            <MiniCalendar
              days={days}
              selectedDayIndex={selectedDayIndex}
              onSelectDay={onSelectDay}
              viewDate={viewDate}
              onViewDateChange={setViewDate}
            />

            {/* Trip Days List - AllTrails style */}
            <div className="border-t border-gray-200 p-3" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
              <h3 className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2">
                Trip Days ({days.length})
              </h3>
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {days.map((day, index) => {
                  const isSelected = index === selectedDayIndex;
                  const activityCount = day.timeGroups.reduce((sum, g) => sum + g.activities.length, 0);

                  return (
                    <button
                      key={day.id}
                      onClick={() => onSelectDay(index)}
                      className={`w-full text-left px-2 py-1.5 rounded-lg text-[11px] transition-all tracking-tight
                        ${isSelected ? 'bg-[#1e3a5f] text-white' : 'hover:bg-gray-100 text-gray-700'}`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold">{day.dayLabel}</span>
                        <span className={`text-[10px] font-medium ${isSelected ? 'text-white/70' : 'text-gray-400'}`}>
                          {activityCount} items
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header - AllTrails style */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200 bg-white" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowSidebar(!showSidebar)}
              className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-500 transition-colors"
            >
              <List size={16} />
            </button>

            <div className="flex items-center gap-1">
              <button
                onClick={goToPrevWeek}
                disabled={weekStartIndex === 0}
                className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all
                  ${weekStartIndex > 0 ? 'hover:bg-gray-100 text-gray-600' : 'text-gray-300 cursor-not-allowed'}`}
              >
                <ChevronLeft size={20} />
              </button>
              <button
                onClick={goToNextWeek}
                disabled={weekStartIndex + 7 >= days.length}
                className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all
                  ${weekStartIndex + 7 < days.length ? 'hover:bg-gray-100 text-gray-600' : 'text-gray-300 cursor-not-allowed'}`}
              >
                <ChevronRight size={20} />
              </button>
            </div>

            <button
              onClick={goToToday}
              className="ml-2 px-3 py-1.5 text-[11px] font-semibold text-[#1e3a5f] hover:bg-[#1e3a5f]/10 rounded-lg border border-[#1e3a5f]/20 transition-colors"
            >
              Today
            </button>

            {weekStart && weekEnd && (
              <div className="ml-3">
                <h2 className="text-sm font-bold text-gray-900 tracking-tight">
                  {weekStart.dateLabel} – {weekEnd.dateLabel}
                </h2>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button className="px-3 py-1.5 text-[11px] font-semibold text-white bg-[#1e3a5f] rounded-lg shadow-sm">
              Week
            </button>
          </div>
        </div>

        {/* 7-Day Week View */}
        <WeekView
          days={days}
          weekStartIndex={weekStartIndex}
          onActivityClick={onActivityClick}
          onAddActivity={onAddActivity}
        />
      </div>
    </div>
  );
});
