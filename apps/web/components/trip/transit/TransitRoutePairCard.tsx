'use client';
import React from 'react';
import { Train, Bus, Ship, CableCar } from 'lucide-react';
import type { RoutePair } from './detectRoutePairs';
import type { TransitDirectionResult } from '@travyl/shared';

// ─── Vehicle icons & colors (mirrored from TransitCard.tsx) ───

const VEHICLE_ICONS: Record<string, React.ReactNode> = {
  train: <Train size={16} />,
  bus: <Bus size={16} />,
  subway: <Train size={16} />,
  tram: <Train size={16} />,
  light_rail: <Train size={16} />,
  ferry: <Ship size={16} />,
  cable_car: <CableCar size={16} />,
  funicular: <CableCar size={16} />,
};

const VEHICLE_COLORS: Record<string, string> = {
  train: '#10B981',
  bus: '#F59E0B',
  subway: '#3B82F6',
  tram: '#8B5CF6',
  light_rail: '#8B5CF6',
  ferry: '#06B6D4',
  cable_car: '#EC4899',
  funicular: '#EC4899',
};

// ─── Helpers ───────────────────────────────────────────────────

function formatDuration(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins} min`;
}

function getPrimaryMode(result: TransitDirectionResult): string {
  // Use the mode of the first leg that has a non-trivial duration
  for (const step of result.steps) {
    if (step.duration_minutes > 0) return step.mode;
  }
  return result.steps[0]?.mode ?? 'train';
}

// ─── Props ─────────────────────────────────────────────────────

interface TransitRoutePairCardProps {
  routePair: RoutePair;
  results: TransitDirectionResult[];
  isLoading: boolean;
  error: string | null;
  onAdd: (result: TransitDirectionResult) => void;
  onRetry: () => void;
}

// ─── Loading skeleton ──────────────────────────────────────────

function LoadingSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map((i) => (
        <div key={i} className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-white/[0.04] shrink-0" />
          <div className="flex-1 space-y-1.5">
            <div className="h-3 w-24 bg-gray-100 dark:bg-white/[0.04] rounded" />
            <div className="h-3 w-16 bg-gray-100 dark:bg-white/[0.04] rounded" />
          </div>
          <div className="h-8 w-16 bg-gray-100 dark:bg-white/[0.04] rounded-lg" />
        </div>
      ))}
    </div>
  );
}

// ─── Component ─────────────────────────────────────────────────

export function TransitRoutePairCard({
  routePair,
  results,
  isLoading,
  error,
  onAdd,
  onRetry,
}: TransitRoutePairCardProps) {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
      {/* Header: Origin → Destination */}
      <div className="flex items-center gap-2 mb-3">
        <span className="text-[13px] font-semibold text-gray-900 dark:text-white truncate">
          {routePair.origin.label}
        </span>
        <span className="text-gray-300 dark:text-gray-600 shrink-0">&rarr;</span>
        <span className="text-[13px] font-semibold text-gray-900 dark:text-white truncate">
          {routePair.destination.label}
        </span>
      </div>

      {/* Loading state */}
      {isLoading && <LoadingSkeleton />}

      {/* Error state */}
      {!isLoading && error && (
        <div className="flex items-center justify-between">
          <p className="text-[13px] text-red-500">{error}</p>
          <button
            onClick={onRetry}
            className="px-3 h-8 rounded-lg text-[12px] font-semibold text-white shadow-sm hover:shadow-md transition-shadow"
            style={{ backgroundColor: 'var(--trip-base, #003594)' }}
          >
            Retry
          </button>
        </div>
      )}

      {/* Empty / no routes found */}
      {!isLoading && !error && results.length === 0 && (
        <p className="text-[13px] text-gray-500 dark:text-gray-400 text-center py-4">
          No transit routes found
        </p>
      )}

      {/* Results: up to 3 transit options */}
      {!isLoading && !error && results.length > 0 && (
        <div className="space-y-2">
          {[...results].sort((a, b) => a.total_duration_minutes - b.total_duration_minutes).slice(0, 3).map((result, idx) => {
            const primaryMode = getPrimaryMode(result);
            const modeColor = VEHICLE_COLORS[primaryMode] ?? '#6B7280';
            const carrier = result.steps.map((s) => s.carrier).filter(Boolean).join(', ') || 'Transit';
            const lineName = result.steps.map((s) => s.line).filter(Boolean).join(', ');

            return (
              <div
                key={result.id || idx}
                className="flex items-center gap-3 py-2 px-1 rounded-lg hover:bg-gray-50 dark:hover:bg-white/[0.03] transition-colors"
              >
                {/* Mode icon */}
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
                  style={{ backgroundColor: `${modeColor}18` }}
                >
                  <span style={{ color: modeColor }}>
                    {VEHICLE_ICONS[primaryMode] ?? <Train size={16} />}
                  </span>
                </div>

                {/* Duration + line name */}
                <div className="flex-1 min-w-0">
                  <span className="text-[13px] font-semibold text-gray-900 dark:text-white">
                    {formatDuration(result.total_duration_minutes)}
                  </span>
                  <p className="text-[12px] text-gray-500 dark:text-gray-400 truncate">
                    {lineName || carrier}
                  </p>
                </div>

                {/* Fare + Add button */}
                <div className="flex items-center gap-2 shrink-0">
                  {result.fare && (
                    <span className="text-[12px] text-gray-500 dark:text-gray-400">
                      {result.fare.currency} {result.fare.amount.toFixed(2)}
                    </span>
                  )}
                  <button
                    onClick={() => onAdd(result)}
                    className="px-3 h-8 rounded-lg text-[12px] font-semibold text-white shadow-sm hover:shadow-md transition-shadow"
                    style={{ backgroundColor: 'var(--trip-base, #003594)' }}
                  >
                    Add
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
