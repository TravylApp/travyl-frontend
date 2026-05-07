'use client';

import type { DayStory, ItineraryDayViewModel } from '@travyl/shared';
import { DayMomentRow } from './DayMomentRow';

type Props = {
  tripId: string;
  day: ItineraryDayViewModel;
  dayIndex: number;
  story: DayStory | undefined;
  isLoading: boolean;
};

export function DaySlideTextPanel({ tripId, day, dayIndex, story, isLoading }: Props) {
  return (
    <div className="px-6 sm:px-10 lg:px-12 py-8 sm:py-10 lg:py-12 flex flex-col gap-5 sm:gap-6 lg:gap-7 min-w-0 order-2 lg:order-none">
      {/* Day header */}
      <div className="flex items-baseline gap-3 flex-wrap">
        <span className="font-serif text-[22px] sm:text-[26px] lg:text-[28px] font-medium text-gray-900 dark:text-white tracking-tight">
          {day.dayLabel}
        </span>
        <span className="text-[11px] sm:text-[12px] tracking-[0.22em] sm:tracking-[0.24em] uppercase font-semibold text-gray-500 dark:text-white/50">
          {day.dateLabel}
        </span>
      </div>

      {/* Narrative — AI or templated */}
      <div className="flex-1 flex flex-col justify-center">
        <span className="inline-flex items-center gap-1.5 text-[10px] tracking-[0.22em] sm:tracking-[0.24em] uppercase font-bold text-[var(--trip-base)] mb-3 sm:mb-3.5">
          ✦ {story?.source === 'bedrock' ? 'Story' : 'Your day'}
        </span>
        {isLoading || !story ? (
          <div className="space-y-3 animate-pulse">
            <div className="h-10 sm:h-12 w-3/4 bg-gray-200 dark:bg-white/10 rounded" />
            <div className="h-4 w-full bg-gray-200 dark:bg-white/10 rounded" />
            <div className="h-4 w-5/6 bg-gray-200 dark:bg-white/10 rounded" />
          </div>
        ) : (
          <>
            <h2
              className="font-serif font-normal text-[30px] sm:text-[38px] lg:text-[48px] leading-[1.06] sm:leading-[1.04] tracking-tight text-gray-900 dark:text-white mb-3 sm:mb-3.5 max-w-[16ch] lg:max-w-[14ch] [overflow-wrap:break-word]"
              dangerouslySetInnerHTML={{ __html: story.headline }}
            />
            <p className="font-serif italic text-[14px] sm:text-[15px] lg:text-[16px] leading-[1.55] text-gray-700 dark:text-white/70 max-w-[48ch] lg:max-w-[44ch]">
              {story.narrative}
            </p>
          </>
        )}
      </div>

      {/* Moments */}
      <div className="border-t border-gray-200 dark:border-white/10 pt-1 mt-auto">
        {day.timeGroups.flatMap((g) =>
          g.activities.map((a) => (
            <DayMomentRow
              key={a.id}
              tripId={tripId}
              when={a.startTime ?? TOD_LABEL[g.timeOfDay]}
              title={a.name}
              activityId={a.id}
            />
          ))
        )}
        {/* Empty-slot affordance: if a TOD has no activities, render one + Add row */}
        {(['morning', 'afternoon', 'evening', 'latenight'] as const)
          .filter((tod) => !day.timeGroups.find((g) => g.timeOfDay === tod && g.activities.length))
          .slice(0, 1) // only show one empty row to avoid clutter
          .map((tod) => (
            <DayMomentRow
              key={`empty-${tod}`}
              tripId={tripId}
              when={TOD_LABEL[tod]}
              title={`+ Add ${EMPTY_LABEL[tod]}`}
              empty
              dayIndex={dayIndex}
              slot={tod}
            />
          ))}
      </div>
    </div>
  );
}

const TOD_LABEL = {
  morning: 'Morning',
  afternoon: 'Afternoon',
  evening: 'Evening',
  latenight: 'Late',
} as const;

const EMPTY_LABEL = {
  morning: 'a morning moment',
  afternoon: 'an afternoon plan',
  evening: 'sunset and dinner',
  latenight: 'a late-night spot',
} as const;
