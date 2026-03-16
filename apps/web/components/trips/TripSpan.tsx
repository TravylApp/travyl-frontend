'use client';

import { useRouter } from 'next/navigation';
import { resolveTheme } from '@travyl/shared';
import type { CalendarTrip } from '@travyl/shared';

const STATUS_COLORS: Record<string, string> = {
  planning: '#9CA3AF',
  booked: '#F59E0B',
  active: '#10B981',
  completed: '#003594',
  abandoned: '#EF4444',
};

interface TripSpanProps {
  trip: CalendarTrip;
  showLabel: boolean;    // show destination name; true only on first day of span in this row
  roundedLeft: boolean;  // round left edge; true when trip starts (not continued from prev row)
  roundedRight: boolean; // round right edge; true when trip ends (not continuing to next row)
  isContinued: boolean;  // trip started in a previous row — show ‹ indicator
  continues: boolean;    // trip continues into next row — show › indicator
}

export function TripSpan({
  trip,
  showLabel,
  roundedLeft,
  roundedRight,
  isContinued,
  continues,
}: TripSpanProps) {
  const router = useRouter();
  const bgColor = resolveTheme(trip.theme, trip.custom_theme_color).base;
  const statusColor = STATUS_COLORS[trip.status] ?? '#9CA3AF';

  // Single-cell segment that has both continuation indicators:
  // omit arrows to prevent overflow; show only destination initial
  const isSingleCellBothContinue = isContinued && continues;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => router.push('/trip/' + trip.id)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') router.push('/trip/' + trip.id);
      }}
      className={[
        'h-[22px] flex items-center px-1 cursor-pointer hover:shadow-sm transition-shadow',
        roundedLeft ? 'rounded-l-[3px]' : '',
        roundedRight ? 'rounded-r-[3px]' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      style={{ backgroundColor: bgColor }}
    >
      {/* Left continuation indicator */}
      {isContinued && !isSingleCellBothContinue && (
        <span className="text-[10px] text-white/70 mr-1 shrink-0">&#8249;</span>
      )}

      {/* Destination label — only on first day of span in this row */}
      <span className="flex-1 overflow-hidden text-ellipsis whitespace-nowrap text-xs font-medium text-white min-w-0">
        {showLabel
          ? isSingleCellBothContinue
            ? trip.destination.charAt(0)
            : trip.destination
          : ''}
      </span>

      {/* Status dot — right-aligned */}
      <span
        className="shrink-0 rounded-full inline-block"
        style={{ width: 6, height: 6, backgroundColor: statusColor, marginLeft: 2 }}
      />

      {/* Right continuation indicator */}
      {continues && !isSingleCellBothContinue && (
        <span className="text-[10px] text-white/70 ml-1 shrink-0">&#8250;</span>
      )}
    </div>
  );
}
