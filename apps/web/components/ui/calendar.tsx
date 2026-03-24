"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  format,
  getDaysInMonth,
  startOfMonth,
  getDay,
  addMonths,
  subMonths,
  isToday,
  isSameDay,
  isSameMonth,
} from "date-fns";
import { cn } from "./utils";

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

interface CalendarProps {
  mode?: "single";
  selected?: Date;
  onSelect?: (date: Date | undefined) => void;
  initialFocus?: boolean;
  className?: string;
  disabled?: (date: Date) => boolean;
}

function Calendar({
  selected,
  onSelect,
  className,
  disabled,
}: CalendarProps) {
  const startYear = 1900;
  const endYear = new Date().getFullYear() + 10;
  const years = Array.from({ length: endYear - startYear + 1 }, (_, i) => startYear + i);

  const [viewDate, setViewDate] = React.useState<Date>(selected ?? new Date());

  React.useEffect(() => {
    if (selected) setViewDate(selected);
  }, [selected]);

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();

  const daysInMonth = getDaysInMonth(viewDate);
  const firstDayOfWeek = getDay(startOfMonth(viewDate));

  // Build grid cells: nulls for empty leading slots, then day numbers
  const cells: (number | null)[] = [
    ...Array(firstDayOfWeek).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const handlePrev = () => setViewDate((d) => subMonths(d, 1));
  const handleNext = () => setViewDate((d) => addMonths(d, 1));

  const handleMonthChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setViewDate(new Date(year, parseInt(e.target.value)));
  };

  const handleYearChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setViewDate(new Date(parseInt(e.target.value), month));
  };

  const handleDayClick = (day: number) => {
    const date = new Date(year, month, day);
    if (disabled?.(date)) return;
    onSelect?.(date);
  };

  return (
    <div className={cn("p-3 w-[300px] bg-white", className)}>
      {/* Header */}
      <div className="flex items-center gap-1.5 mb-3">
        <button
          type="button"
          onClick={handlePrev}
          className="inline-flex items-center justify-center size-7 rounded-md border border-gray-300 bg-white text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors flex-shrink-0"
          aria-label="Previous month"
        >
          <ChevronLeft size={15} />
        </button>

        <div className="flex gap-1.5 flex-1">
          <select
            value={month}
            onChange={handleMonthChange}
            className="flex-1 min-w-0 px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
          >
            {MONTHS.map((m, i) => (
              <option key={m} value={i}>{m}</option>
            ))}
          </select>
          <select
            value={year}
            onChange={handleYearChange}
            className="w-[72px] px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
          >
            {years.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>

        <button
          type="button"
          onClick={handleNext}
          className="inline-flex items-center justify-center size-7 rounded-md border border-gray-300 bg-white text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors flex-shrink-0"
          aria-label="Next month"
        >
          <ChevronRight size={15} />
        </button>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 mb-1">
        {WEEKDAYS.map((d) => (
          <div key={d} className="text-center text-xs font-medium text-gray-400 py-1">
            {d}
          </div>
        ))}
      </div>

      {/* Day grid */}
      <div className="grid grid-cols-7 gap-y-0.5">
        {cells.map((day, i) => {
          if (!day) return <div key={`empty-${i}`} />;

          const date = new Date(year, month, day);
          const isSelected = selected ? isSameDay(date, selected) : false;
          const isTodayDate = isToday(date);
          const isDisabled = disabled?.(date) ?? false;

          return (
            <button
              key={day}
              type="button"
              onClick={() => handleDayClick(day)}
              disabled={isDisabled}
              className={cn(
                "mx-auto flex items-center justify-center size-9 rounded-md text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-blue-400",
                isSelected
                  ? "bg-blue-600 text-white font-semibold hover:bg-blue-700"
                  : isTodayDate
                  ? "border border-blue-400 text-blue-600 font-semibold hover:bg-blue-50"
                  : isDisabled
                  ? "text-gray-300 cursor-not-allowed"
                  : "text-gray-700 hover:bg-gray-100 cursor-pointer"
              )}
            >
              {day}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export { Calendar };