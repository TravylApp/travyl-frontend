'use client';

import { memo } from 'react';
import { motion } from 'motion/react';
import { LayoutList, Columns3, CalendarDays, Share2 } from 'lucide-react';

export type ViewMode = 'day' | 'week' | 'month' | 'canvas';

interface ViewToggleProps {
  value: ViewMode;
  onChange: (mode: ViewMode) => void;
}

const VIEW_OPTIONS: { mode: ViewMode; icon: typeof LayoutList; label: string }[] = [
  { mode: 'canvas', icon: Share2, label: 'Canvas' },
  { mode: 'day', icon: LayoutList, label: 'Day' },
  { mode: 'week', icon: Columns3, label: 'Week' },
  { mode: 'month', icon: CalendarDays, label: 'Month' },
];

export const ViewToggle = memo(function ViewToggle({ value, onChange }: ViewToggleProps) {
  return (
    <div className="flex items-center bg-gray-100/80 rounded-lg p-1 gap-0.5">
      {VIEW_OPTIONS.map(({ mode, icon: Icon, label }) => {
        const isActive = value === mode;
        return (
          <button
            key={mode}
            onClick={() => onChange(mode)}
            className="relative flex items-center justify-center w-8 h-7 rounded-md transition-colors"
            title={label}
            aria-label={`${label} view`}
            aria-pressed={isActive}
          >
            {isActive && (
              <motion.div
                layoutId="view-toggle-bg"
                className="absolute inset-0 bg-white rounded-md shadow-sm"
                initial={false}
                transition={{
                  type: 'spring',
                  stiffness: 500,
                  damping: 35,
                }}
              />
            )}
            <Icon
              size={16}
              strokeWidth={1.75}
              className={`relative z-10 transition-colors duration-150 ${
                isActive ? 'text-[#1e3a5f]' : 'text-gray-400 hover:text-gray-600'
              }`}
            />
          </button>
        );
      })}
    </div>
  );
});
