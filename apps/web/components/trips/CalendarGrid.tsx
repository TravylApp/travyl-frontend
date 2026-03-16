'use client';

import { useMemo } from 'react';
import { useMonthState } from '@/contexts/MonthStateContext';
import { TripSpan } from './TripSpan';
import { buildWeeks, buildWeekLayout, toDateStr, type WeekLayout } from '@/utils/calendarUtils';
import type { CalendarTrip } from '@travyl/shared';

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

interface CalendarGridProps {
  trips: CalendarTrip[];
}

export function CalendarGrid({ trips }: CalendarGridProps) {
  const { monthState } = useMonthState();
  const { year, month } = monthState;
  const todayStr = useMemo(() => toDateStr(new Date()), []);
  const weeks = useMemo(() => buildWeeks(year, month), [year, month]);

  return (
    <div className="w-full border-l border-t border-gray-100">
      {/* Day-of-week header */}
      <div className="grid grid-cols-7 bg-white">
        {DAY_NAMES.map((name) => (
          <div
            key={name}
            className="py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-b border-gray-100"
          >
            {name}
          </div>
        ))}
      </div>

      {/* Week rows */}
      {weeks.map((week, weekIdx) => {
        const layout = buildWeekLayout(trips, week);
        const slotIndices = Array.from({ length: layout.totalSlots }, (_, i) => i);
        return (
          <div key={weekIdx} className="grid grid-cols-7">
            {week.map((day, dayIdx) => (
              <DayCell
                key={toDateStr(day)}
                day={day}
                dayStr={toDateStr(day)}
                month={month}
                todayStr={todayStr}
                isLastCol={dayIdx === 6}
                isLastRow={weekIdx === weeks.length - 1}
                layout={layout}
                slotIndices={slotIndices}
              />
            ))}
          </div>
        );
      })}
    </div>
  );
}

interface DayCellProps {
  day: Date;
  dayStr: string;
  month: number;
  todayStr: string;
  isLastCol: boolean;
  isLastRow: boolean;
  layout: WeekLayout;
  slotIndices: number[];
}

function DayCell({
  day,
  dayStr,
  month,
  todayStr,
  isLastCol,
  isLastRow,
  layout,
  slotIndices,
}: DayCellProps) {
  const isCurrentMonth = day.getMonth() === month;
  const isToday = dayStr === todayStr;

  return (
    <div
      className={[
        'border-r border-b border-gray-100 min-h-[80px] pt-1 pb-1',
        isLastCol ? 'border-r-0' : '',
        isLastRow ? 'border-b-0' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {/* Date number */}
      <div className="flex items-start pl-1.5 mb-1">
        {isToday ? (
          <span className="w-6 h-6 flex items-center justify-center rounded-full bg-[#003594] text-white text-sm font-medium">
            {day.getDate()}
          </span>
        ) : (
          <span
            className={`text-sm font-medium ${
              isCurrentMonth ? 'text-gray-700' : 'text-gray-700/30'
            }`}
          >
            {day.getDate()}
          </span>
        )}
      </div>

      {/* Trip spans — one row per slot; empty spacer when no trip in that slot */}
      <div className="flex flex-col gap-[2px] px-0.5">
        {slotIndices.map((slotIdx) => {
          // Outside-month cells: show no trip spans (only empty spacers to preserve row height)
          if (!isCurrentMonth) {
            return <div key={slotIdx} className="h-[22px]" />;
          }

          const trip = layout.weekTrips.find(
            (t) =>
              layout.tripSlots.get(t.id) === slotIdx &&
              t.start_date <= dayStr &&
              t.end_date >= dayStr
          );

          if (!trip) {
            return <div key={slotIdx} className="h-[22px]" />;
          }

          const isContinued = trip.start_date < layout.weekStartStr;
          const continues = trip.end_date > layout.weekEndStr;

          // First day of this trip's segment within this row
          const firstDayInRow = isContinued ? layout.weekStartStr : trip.start_date;
          // Last day of this trip's segment within this row
          const lastDayInRow = continues ? layout.weekEndStr : trip.end_date;

          return (
            <TripSpan
              key={trip.id}
              trip={trip}
              showLabel={dayStr === firstDayInRow}
              roundedLeft={dayStr === firstDayInRow && !isContinued}
              roundedRight={dayStr === lastDayInRow && !continues}
              isContinued={dayStr === firstDayInRow && isContinued}
              continues={dayStr === lastDayInRow && continues}
            />
          );
        })}
      </div>
    </div>
  );
}
