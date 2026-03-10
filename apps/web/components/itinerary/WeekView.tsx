'use client';

import { memo, useMemo } from 'react';
import { motion } from 'motion/react';
import type { ItineraryDayViewModel } from '@travyl/shared';

interface WeekViewProps {
  days: ItineraryDayViewModel[];
  selectedDayIndex: number;
  onSelectDay: (index: number) => void;
  onActivityClick: (activityId: string) => void;
  onAddActivity: (timeOfDay: string) => void;
  collapsedSections: Record<string, boolean>;
  onToggleCollapse: (timeOfDay: string) => void;
  allCollapsedOverride: boolean | null;
}

// Mock images for day cards
const DAY_IMAGES = [
  'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=400&h=200&fit=crop',
  'https://images.unsplash.com/photo-1499856871958-5b9627545d1a?w=400&h=200&fit=crop',
  'https://images.unsplash.com/photo-1550340499-a6c60fc8287c?w=400&h=200&fit=crop',
  'https://images.unsplash.com/photo-1478391679764-b2d8b3cd1e94?w=400&h=200&fit=crop',
  'https://images.unsplash.com/photo-1431274172761-fca41d930114?w=400&h=200&fit=crop',
  'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=400&h=200&fit=crop',
  'https://images.unsplash.com/photo-1499856871958-5b9627545d1a?w=400&h=200&fit=crop',
];

const CATEGORY_COLORS: Record<string, string> = {
  sightseeing: '#0d9488',
  tour: '#8b5cf6',
  dining: '#ea580c',
  cultural: '#6366f1',
  shopping: '#ec4899',
  nightlife: '#7c3aed',
  outdoor: '#16a34a',
  museum: '#2563eb',
};

export const WeekView = memo(function WeekView({
  days,
  selectedDayIndex,
  onSelectDay,
}: WeekViewProps) {
  return (
    <div className="flex flex-col h-full">
      {/* Days Grid - show all days */}
      <div className="grid grid-cols-7 gap-3 flex-1">
        {days.map((day, i) => {
          const isSelected = i === selectedDayIndex;
          const imageUrl = DAY_IMAGES[i % DAY_IMAGES.length];

          // Get unique categories from activities
          const categories = [...new Set(
            day.timeGroups.flatMap(g => g.activities.map(a => a.category))
          )];

          return (
            <motion.button
              key={day.id}
              onClick={() => onSelectDay(i)}
              className={`flex flex-col rounded-xl overflow-hidden text-left transition-all ${
                isSelected
                  ? 'ring-2 ring-[#1e3a5f] ring-offset-2'
                  : 'border border-gray-200 hover:border-gray-300'
              }`}
            >
              {/* Image Header */}
              <div className="relative h-24 overflow-hidden">
                <img
                  src={imageUrl}
                  alt={day.dayLabel}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/20" />
                <div className="absolute bottom-0 left-0 right-0 p-2">
                  <span className="text-[9px] font-medium text-white/80 uppercase tracking-wide">
                    {day.dayLabel}
                  </span>
                  <h3 className="text-[11px] font-semibold text-white">
                    {day.dateLabel}
                  </h3>
                </div>
                {isSelected && (
                  <div className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-[#1e3a5f] flex items-center justify-center">
                    <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="p-2 bg-white flex-1">
                <span className="text-[10px] text-gray-500">
                  {day.activityCount} activities
                </span>

                {/* Activity Pills */}
                {categories.length > 0 ? (
                  <div className="flex flex-wrap gap-0.5 mt-1">
                    {categories.slice(0, 2).map((cat) => (
                      <span
                        key={cat}
                        className="px-1.5 py-0.5 rounded-full text-[8px] font-medium"
                        style={{
                          backgroundColor: `${CATEGORY_COLORS[cat] || '#6b7280'}15`,
                          color: CATEGORY_COLORS[cat] || '#6b7280',
                        }}
                      >
                        {cat}
                      </span>
                    ))}
                    {categories.length > 2 && (
                      <span className="px-1.5 py-0.5 rounded-full text-[8px] font-medium bg-gray-100 text-gray-500">
                        +{categories.length - 2}
                      </span>
                    )}
                  </div>
                ) : (
                  <span className="text-[9px] text-gray-400 italic">No activities</span>
                )}
              </div>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
});
