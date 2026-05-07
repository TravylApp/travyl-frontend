'use client';

import Link from 'next/link';

type Props = {
  tripId: string;
  when: string;
  title: string;
  activityId?: string;
  empty?: boolean;
  dayIndex?: number;
  slot?: 'morning' | 'afternoon' | 'evening' | 'latenight';
};

export function DayMomentRow({ tripId, when, title, activityId, empty, dayIndex, slot }: Props) {
  const href = activityId
    ? `/trip/${tripId}/calendar?activity=${activityId}`
    : `/trip/${tripId}/calendar?day=${dayIndex ?? 0}&slot=${slot ?? 'morning'}`;

  return (
    <Link
      href={href}
      className={[
        'grid grid-cols-[110px_1fr_auto] items-center gap-4 py-3.5',
        'border-b border-gray-200 dark:border-white/10 last:border-b-0',
        'transition-[padding,color] duration-200 hover:pl-1.5 group/row',
        empty ? 'cursor-pointer' : '',
      ].join(' ')}
    >
      <span className="text-[11px] tracking-[0.18em] uppercase font-bold text-gray-500 dark:text-white/50 tabular-nums">
        {when}
      </span>
      <span
        className={[
          'font-serif text-[18px] leading-tight',
          empty
            ? 'italic text-[var(--trip-base)] dark:text-[var(--trip-base)] group-hover/row:text-gray-900 dark:group-hover/row:text-white'
            : 'text-gray-900 dark:text-white',
        ].join(' ')}
      >
        {title}
      </span>
      <span
        className="text-base text-gray-300 dark:text-white/30 transition-all duration-200 group-hover/row:translate-x-1 group-hover/row:text-[var(--trip-base)] dark:group-hover/row:text-[var(--trip-base)]"
        aria-hidden="true"
      >
        →
      </span>
    </Link>
  );
}
