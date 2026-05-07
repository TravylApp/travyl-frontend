'use client';

type Props = {
  activeIndex: number;
  activityCounts: number[];
  onSelect: (index: number) => void;
};

export function DayPipPager({ activeIndex, activityCounts, onSelect }: Props) {
  return (
    <div className="flex gap-1 items-center flex-1 overflow-x-auto py-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {activityCounts.map((count, i) => {
        const isActive = i === activeIndex;
        const hasData = count > 0;
        return (
          <button
            key={i}
            type="button"
            aria-label={`Go to day ${i + 1}`}
            aria-current={isActive ? 'true' : undefined}
            onClick={() => onSelect(i)}
            className={[
              'flex-1 min-w-[14px] max-w-[60px] rounded-full transition-all duration-200 cursor-pointer',
              isActive
                ? 'h-[7px] bg-[var(--trip-base)] dark:bg-[var(--trip-base)]'
                : hasData
                  ? 'h-[5px] bg-gray-300 dark:bg-white/30 hover:bg-gray-400 dark:hover:bg-white/40 has-data'
                  : 'h-[5px] bg-gray-200 dark:bg-white/15 hover:bg-gray-300 dark:hover:bg-white/25',
            ].join(' ')}
          />
        );
      })}
    </div>
  );
}
