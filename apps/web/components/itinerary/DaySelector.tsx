'use client';

import type { ItineraryDayViewModel } from '@travyl/shared';

interface DaySelectorProps {
  days: ItineraryDayViewModel[];
  selectedIndex: number;
  onSelect: (index: number) => void;
}

export function DaySelector({ days, selectedIndex, onSelect }: DaySelectorProps) {
  return (
    <div className="bg-[#f0f9ff] dark:bg-white/[0.04] p-2 rounded-xl mb-4">
      <div className="flex overflow-x-auto gap-2 scrollbar-hide">
        {days.map((day, index) => {
          const selected = index === selectedIndex;
          return (
            <button
              key={day.id}
              onClick={() => onSelect(index)}
              className={`flex-shrink-0 min-w-[78px] text-center transition-all rounded-[10px] px-3.5 py-2.5 ${
                selected
                  ? ''
                  : 'bg-white dark:bg-white/[0.06] text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-white/[0.08]'
              }`}
              style={selected ? {
                background: 'linear-gradient(135deg, var(--trip-base), var(--trip-base-light))',
                color: '#fff',
                boxShadow: '0 3px 8px rgb(var(--trip-base-rgb) / 0.25)',
              } : undefined}
            >
              <span
                className="block text-[10px] font-medium"
                style={{ opacity: selected ? 0.8 : 0.5 }}
              >
                {day.dayLabel}
              </span>
              <span
                className={`block text-xs mt-0.5 ${selected ? 'font-bold' : 'font-semibold'}`}
              >
                {day.dateLabel}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
