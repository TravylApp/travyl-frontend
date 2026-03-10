'use client';

import type { ItineraryDayViewModel } from '@travyl/shared';

interface DaySelectorProps {
  days: ItineraryDayViewModel[];
  selectedIndex: number;
  onSelect: (index: number) => void;
}

export function DaySelector({ days, selectedIndex, onSelect }: DaySelectorProps) {
  return (
    <div className="bg-[#f0f9ff] p-2 rounded-xl mb-4">
      <div className="flex overflow-x-auto gap-2 scrollbar-hide">
        {days.map((day, index) => {
          const selected = index === selectedIndex;
          return (
            <button
              key={day.id}
              onClick={() => onSelect(index)}
              className="flex-shrink-0 min-w-[78px] text-center transition-all rounded-[10px]"
              style={selected ? {
                background: 'linear-gradient(135deg, var(--trip-base), var(--trip-base-light))',
                color: '#fff',
                padding: '10px 14px',
                boxShadow: '0 3px 8px rgb(var(--trip-base-rgb) / 0.25)',
              } : {
                background: '#fff',
                color: '#374151',
                padding: '10px 14px',
                border: '1px solid #e5e7eb',
              }}
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
