'use client';

import { Check } from 'lucide-react';
import { motion } from 'motion/react';
import type { CardStyle } from './ActivityCardRenderer';

interface CardStyleSettingsProps {
  currentStyle: CardStyle;
  onStyleChange: (style: CardStyle) => void;
}

const STYLES: { key: CardStyle; label: string; height: string; imageSize: string; bestFor: string }[] = [
  { key: 'legacy', label: 'Legacy Card', height: '~80px', imageSize: 'Small (24px)', bestFor: 'Dense timelines' },
  { key: 'compact', label: 'Compact Card', height: '~220px', imageSize: 'Large (160px)', bestFor: 'Visual browsing' },
  { key: 'minimal', label: 'Minimal Card', height: '~104px', imageSize: 'Medium (80px)', bestFor: 'Tight spaces' },
  { key: 'list', label: 'List Card', height: '~64px', imageSize: 'Tiny (48px)', bestFor: 'Day-by-day lists' },
];

export function CardStyleSettings({ currentStyle, onStyleChange }: CardStyleSettingsProps) {
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-gray-800">Card Display Style</h3>
      <div className="grid grid-cols-2 gap-2">
        {STYLES.map((s) => {
          const active = currentStyle === s.key;
          return (
            <motion.button
              key={s.key}
              onClick={() => onStyleChange(s.key)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className={`relative p-3 rounded-xl border-2 text-left transition-all ${
                active
                  ? 'border-[#1e3a5f] bg-[#1e3a5f]/5'
                  : 'border-gray-200 hover:border-gray-300 bg-white'
              }`}
            >
              {active && (
                <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-[#1e3a5f] flex items-center justify-center">
                  <Check size={12} className="text-white" />
                </div>
              )}
              <p className={`text-sm font-semibold ${active ? 'text-[#1e3a5f]' : 'text-gray-800'}`}>
                {s.label}
              </p>
              <p className="text-[11px] text-gray-500 mt-0.5">{s.height}</p>
              <p className="text-[10px] text-gray-400 mt-1">{s.bestFor}</p>
            </motion.button>
          );
        })}
      </div>
      <p className="text-[10px] text-gray-400 italic">
        Tip: Compact is best for visual browsing; List works best for dense day-by-day timelines.
      </p>
    </div>
  );
}
