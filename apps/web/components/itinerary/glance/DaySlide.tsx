'use client';

import { useEffect } from 'react';
import type { DayStory, ItineraryDayViewModel } from '@travyl/shared';
import { DaySlideTextPanel } from './DaySlideTextPanel';
import { DaySlideImagePanel } from './DaySlideImagePanel';

type Props = {
  tripId: string;
  day: ItineraryDayViewModel;
  dayIndex: number;
  totalDays: number;
  story: DayStory | undefined;
  isLoading: boolean;
  imageUrl: string | null;
  weatherLabel?: string | null;
  onPrev: () => void;
  onNext: () => void;
};

export function DaySlide({
  tripId,
  day,
  dayIndex,
  totalDays,
  story,
  isLoading,
  imageUrl,
  weatherLabel,
  onPrev,
  onNext,
}: Props) {
  // ← / → arrow keys
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' && dayIndex > 0) onPrev();
      else if (e.key === 'ArrowRight' && dayIndex < totalDays - 1) onNext();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [dayIndex, totalDays, onPrev, onNext]);

  const showArrows = totalDays > 1;
  const isFirst = dayIndex === 0;
  const isLast = dayIndex === totalDays - 1;

  return (
    <div className="relative">
      {showArrows && (
        <>
          <button
            type="button"
            aria-label="Previous day"
            onClick={onPrev}
            disabled={isFirst}
            className="hidden lg:flex absolute left-4 top-1/2 -translate-y-1/2 w-[44px] h-[44px] rounded-full bg-white/90 backdrop-blur-md border border-gray-200 dark:bg-gray-900/85 dark:border-white/10 items-center justify-center z-20 shadow-lg text-gray-900 dark:text-white text-xl transition-all hover:scale-105 hover:bg-white hover:border-[var(--trip-base)] dark:hover:border-[var(--trip-base)] disabled:opacity-0 disabled:cursor-not-allowed disabled:pointer-events-none"
          >
            ‹
          </button>
          <button
            type="button"
            aria-label="Next day"
            onClick={onNext}
            disabled={isLast}
            className="hidden lg:flex absolute right-4 top-1/2 -translate-y-1/2 w-[44px] h-[44px] rounded-full bg-white/90 backdrop-blur-md border border-gray-200 dark:bg-gray-900/85 dark:border-white/10 items-center justify-center z-20 shadow-lg text-gray-900 dark:text-white text-xl transition-all hover:scale-105 hover:bg-white hover:border-[var(--trip-base)] dark:hover:border-[var(--trip-base)] disabled:opacity-0 disabled:cursor-not-allowed disabled:pointer-events-none"
          >
            ›
          </button>
        </>
      )}

      <article className="grid grid-cols-1 lg:grid-cols-[1fr_1.25fr] bg-white dark:bg-[#0f1f33] border border-gray-200 dark:border-white/10 rounded-3xl overflow-hidden shadow-xl min-h-[580px] group/slide">
        <DaySlideTextPanel
          tripId={tripId}
          day={day}
          dayIndex={dayIndex}
          story={story}
          isLoading={isLoading}
        />
        <DaySlideImagePanel imageUrl={imageUrl} weatherLabel={weatherLabel} />
      </article>
    </div>
  );
}
