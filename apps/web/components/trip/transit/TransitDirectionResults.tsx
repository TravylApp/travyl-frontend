'use client';
import React from 'react';
import type { TransitDirectionResult } from '@travyl/shared';

interface TransitDirectionResultsProps {
  results: TransitDirectionResult[];
  isLoading: boolean;
  error: string | null;
  onAddToTrip: (result: TransitDirectionResult) => void;
  onRetry: () => void;
}

export function TransitDirectionResults({ results, isLoading, error, onAddToTrip, onRetry }: TransitDirectionResultsProps) {
  if (isLoading) {
    return <div className="space-y-3">{[1, 2].map((i) => <div key={i} className="h-28 bg-gray-100 dark:bg-white/[0.04] rounded-xl animate-pulse" />)}</div>;
  }
  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-[13px] text-red-500">{error}</p>
        <button onClick={onRetry} className="mt-3 text-[13px] text-blue-600 hover:underline">Try again</button>
      </div>
    );
  }
  if (results.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-[13px] text-gray-500 dark:text-gray-400">No transit routes found. Try adjusting your departure time.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-[13px] font-medium text-gray-700 dark:text-gray-300">{results.length} route{results.length > 1 ? 's' : ''} found</p>
      {results.map((result, idx) => (
        <div key={result.id || idx} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4 hover:shadow-sm transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <span className="text-[13px] font-semibold text-gray-900 dark:text-white">
                {Math.floor(result.total_duration_minutes / 60)}h {result.total_duration_minutes % 60}m
              </span>
              {result.fare && <span className="text-[12px] text-gray-500">{result.fare.currency} {result.fare.amount.toFixed(2)}</span>}
              <span className="text-[12px] text-gray-400">{result.leg_count} leg{result.leg_count > 1 ? 's' : ''}</span>
            </div>
            <button
              onClick={() => onAddToTrip(result)}
              className="px-3 h-8 rounded-lg text-[12px] font-semibold text-white shadow-sm hover:shadow-md transition-shadow"
              style={{ backgroundColor: 'var(--trip-base)' }}
            >
              Add to Trip
            </button>
          </div>
          <div className="space-y-2">
            {result.steps.map((step, sIdx) => (
              <div key={sIdx} className="flex items-center gap-2 text-[12px]">
                <span className="text-gray-400 font-mono uppercase">{step.mode.slice(0, 3)}</span>
                <span className="text-gray-700 dark:text-gray-300 font-medium">{step.line}</span>
                <span className="text-gray-400">{step.origin_stop}</span>
                <span className="text-gray-300">→</span>
                <span className="text-gray-400">{step.destination_stop}</span>
                {step.num_stops != null && <span className="text-gray-400">({step.num_stops} stop{step.num_stops !== 1 ? 's' : ''})</span>}
                <span className="text-gray-400 ml-auto">{step.duration_minutes} min</span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
