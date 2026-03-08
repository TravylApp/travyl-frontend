'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp, Plus, Minus, Users } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const CABIN_CLASSES = ['Economy', 'Premium Economy', 'Business', 'First'] as const;

interface PassengerType {
  label: string;
  subtitle: string;
  min: number;
  max: number;
  priceEstimate: string;
}

const PASSENGER_TYPES: PassengerType[] = [
  { label: 'Adults', subtitle: '12+ years', min: 1, max: 9, priceEstimate: '$850' },
  { label: 'Children', subtitle: '2–11 years', min: 0, max: 9, priceEstimate: '$650' },
  { label: 'Infants', subtitle: 'Under 2', min: 0, max: 4, priceEstimate: '$120' },
];

export function PassengerOptions() {
  const [isOpen, setIsOpen] = useState(false);
  const [counts, setCounts] = useState([1, 0, 0]);
  const [cabinClasses, setCabinClasses] = useState<string[]>(['Economy', 'Economy', 'Economy']);

  const updateCount = (idx: number, delta: number) => {
    setCounts((prev) => {
      const next = [...prev];
      const type = PASSENGER_TYPES[idx];
      next[idx] = Math.min(Math.max(next[idx] + delta, type.min), type.max);
      return next;
    });
  };

  const updateCabin = (idx: number, cabin: string) => {
    setCabinClasses((prev) => {
      const next = [...prev];
      next[idx] = cabin;
      return next;
    });
  };

  const totalPassengers = counts.reduce((a, b) => a + b, 0);

  return (
    <div className="rounded-xl border border-gray-200 overflow-hidden">
      {/* Toggle header */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Users size={15} className="text-[#1e3a5f]" />
          <span className="text-sm font-semibold text-gray-800">
            Passengers & Class
          </span>
          <span className="text-xs text-gray-500 bg-white px-2 py-0.5 rounded-full border border-gray-200">
            {totalPassengers} {totalPassengers === 1 ? 'passenger' : 'passengers'}
          </span>
        </div>
        {isOpen ? (
          <ChevronUp size={14} className="text-gray-500" />
        ) : (
          <ChevronDown size={14} className="text-gray-500" />
        )}
      </button>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
            className="overflow-hidden"
          >
            <div className="px-4 py-3 space-y-4 border-t border-gray-100">
              {PASSENGER_TYPES.map((type, idx) => (
                <div key={type.label} className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="text-sm font-medium text-gray-800">{type.label}</div>
                    <div className="text-[11px] text-gray-400">{type.subtitle}</div>
                  </div>

                  {/* Cabin class dropdown */}
                  {counts[idx] > 0 && (
                    <select
                      value={cabinClasses[idx]}
                      onChange={(e) => updateCabin(idx, e.target.value)}
                      className="text-[11px] text-gray-600 border border-gray-200 rounded-lg px-2 py-1 mr-3 bg-white focus:outline-none focus:ring-1 focus:ring-[#1e3a5f]/20"
                    >
                      {CABIN_CLASSES.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  )}

                  {/* Stepper */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => updateCount(idx, -1)}
                      disabled={counts[idx] <= type.min}
                      className="w-7 h-7 rounded-lg border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    >
                      <Minus size={12} />
                    </button>
                    <span className="w-6 text-center text-sm font-semibold text-gray-800 tabular-nums">
                      {counts[idx]}
                    </span>
                    <button
                      onClick={() => updateCount(idx, 1)}
                      disabled={counts[idx] >= type.max}
                      className="w-7 h-7 rounded-lg border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    >
                      <Plus size={12} />
                    </button>
                  </div>
                </div>
              ))}

              {/* Price estimate */}
              <div className="pt-3 border-t border-gray-100">
                <div className="text-[11px] font-medium text-gray-400 uppercase tracking-wide mb-2">
                  Estimated per person
                </div>
                <div className="space-y-1">
                  {PASSENGER_TYPES.map((type, idx) =>
                    counts[idx] > 0 ? (
                      <div key={type.label} className="flex items-center justify-between text-xs">
                        <span className="text-gray-600">
                          {counts[idx]}x {type.label}
                        </span>
                        <span className="font-semibold text-gray-800">
                          {type.priceEstimate}/ea
                        </span>
                      </div>
                    ) : null,
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
