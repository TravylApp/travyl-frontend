'use client';

import { useMemo } from 'react';
import { useDayStory, useDestinationImage } from '@travyl/shared';
import type { ItineraryDayViewModel } from '@travyl/shared';
import { DaySlide } from './glance/DaySlide';
import { DayPipPager } from './glance/DayPipPager';

type Props = {
  tripId: string;
  days: ItineraryDayViewModel[];
  selectedDayIndex: number;
  onSelectDay: (i: number) => void;
  destination?: string;
  heroImages?: string[];
};

export function GlanceView({
  tripId,
  days,
  selectedDayIndex,
  onSelectDay,
  destination,
  heroImages,
}: Props) {
  const day = days[selectedDayIndex];

  const storyReq = useMemo(() => {
    if (!day) return null;
    return {
      tripId,
      dayIndex: selectedDayIndex,
      destination: destination ?? '',
      dateLabel: day.dateLabel,
      isFirstDay: selectedDayIndex === 0,
      isLastDay: selectedDayIndex === days.length - 1,
      activities: day.timeGroups.flatMap((g) =>
        g.activities.map((a) => ({
          name: a.name,
          type: a.category,
          startHour: a.startHour,
          image: undefined as string | undefined, // TODO: thread through ItineraryDayViewModel if available
        })),
      ),
    };
  }, [day, days.length, destination, selectedDayIndex, tripId]);

  const { data: story, isLoading } = useDayStory(storyReq);

  // Image fallback chain: featured → destination photo → trip hero → null
  const { data: destImage } = useDestinationImage(destination ?? '');
  const imageUrl =
    story?.featuredImageUrl ??
    destImage?.url ??
    heroImages?.[selectedDayIndex % Math.max(heroImages.length, 1)] ??
    null;

  if (!day) return null;

  const activityCounts = days.map((d) => d.activityCount);

  return (
    <div data-no-page-swipe>
      <DaySlide
        tripId={tripId}
        day={day}
        dayIndex={selectedDayIndex}
        totalDays={days.length}
        story={story}
        isLoading={isLoading}
        imageUrl={imageUrl}
        weatherLabel={null /* TODO: wire weather in Phase 3 */}
        onPrev={() => onSelectDay(Math.max(0, selectedDayIndex - 1))}
        onNext={() => onSelectDay(Math.min(days.length - 1, selectedDayIndex + 1))}
      />

      <div className="mt-7 flex items-center gap-4">
        <DayPipPager
          activeIndex={selectedDayIndex}
          activityCounts={activityCounts}
          onSelect={onSelectDay}
        />
      </div>

      <div className="mt-5 flex items-center justify-center gap-2.5 text-[12px] text-blue-900 dark:text-blue-200 font-medium">
        <span className="w-2 h-2 rounded-full bg-emerald-500 ring-4 ring-emerald-500/20" />
        Story &amp; moments regenerate when activities change · ← → to navigate
      </div>
    </div>
  );
}
