'use client';
import React from 'react';
import { ChevronDown } from 'lucide-react';

interface TransitDaySectionProps {
  dayLabel: string;        // e.g. "Day 1"
  dateLabel: string;       // e.g. "Mon, Jun 5"
  defaultOpen?: boolean;
  children: React.ReactNode;
}

export function TransitDaySection({ dayLabel, dateLabel, defaultOpen = true, children }: TransitDaySectionProps) {
  const [open, setOpen] = React.useState(defaultOpen);
  const contentId = React.useId();

  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-controls={contentId}
        className="flex items-center gap-2 w-full text-left py-2"
      >
        <ChevronDown
          size={16}
          className="text-gray-400 transition-transform duration-200"
          style={{ transform: open ? 'rotate(0deg)' : 'rotate(-90deg)' }}
        />
        <span className="text-[13px] font-semibold text-gray-900 dark:text-white">
          {dayLabel}
        </span>
        <span className="text-[12px] text-gray-500 dark:text-gray-400">
          {dateLabel}
        </span>
      </button>
      {open && <div id={contentId} className="space-y-2 pl-6">{children}</div>}
    </div>
  );
}
