'use client';

import { motion } from 'motion/react';

export interface FilterState {
  thisMonth: boolean;
  soloTrips: boolean;
  sharedTrips: boolean;
}

interface FilterChipsProps {
  filters: FilterState;
  onChange: (filters: FilterState) => void;
}

const CHIP_CONFIG = [
  { key: 'thisMonth' as const, label: 'This Month' },
  { key: 'soloTrips' as const, label: 'Solo Trips' },
  { key: 'sharedTrips' as const, label: 'Shared Trips' },
];

export function FilterChips({ filters, onChange }: FilterChipsProps) {
  const toggleFilter = (key: keyof FilterState) => {
    onChange({
      ...filters,
      [key]: !filters[key],
    });
  };

  const activeCount = Object.values(filters).filter(Boolean).length;

  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
      {CHIP_CONFIG.map(({ key, label }) => {
        const isActive = filters[key];
        return (
          <motion.button
            key={key}
            onClick={() => toggleFilter(key)}
            whileTap={{ scale: 0.95 }}
            className={`shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all ${
              isActive
                ? 'bg-amber-500 text-white shadow-md shadow-amber-500/25'
                : 'bg-white/80 backdrop-blur-sm border border-gray-100 text-gray-600 hover:bg-white hover:border-gray-200'
            }`}
          >
            {label}
          </motion.button>
        );
      })}

      {/* Clear all filters */}
      {activeCount > 0 && (
        <motion.button
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          onClick={() => onChange({ thisMonth: false, soloTrips: false, sharedTrips: false })}
          className="shrink-0 px-3 py-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
        >
          Clear all
        </motion.button>
      )}
    </div>
  );
}
