import type { CalendarTrip } from '@travyl/shared';

export function toDateStr(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function buildWeeks(year: number, month: number): Date[][] {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);

  // Start on the Sunday on or before the first day of the month
  const start = new Date(firstDay);
  start.setDate(start.getDate() - start.getDay());

  // End on the Saturday on or after the last day of the month
  const end = new Date(lastDay);
  end.setDate(end.getDate() + (6 - end.getDay()));

  const weeks: Date[][] = [];
  const current = new Date(start);
  while (current <= end) {
    const week: Date[] = [];
    for (let i = 0; i < 7; i++) {
      week.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }
    weeks.push(week);
  }
  return weeks;
}

export interface WeekLayout {
  tripSlots: Map<string, number>; // trip.id → slot index (0-based)
  totalSlots: number;
  weekTrips: CalendarTrip[];      // trips that overlap this week
  weekStartStr: string;           // YYYY-MM-DD of Sunday
  weekEndStr: string;             // YYYY-MM-DD of Saturday
}

export function buildWeekLayout(trips: CalendarTrip[], week: Date[]): WeekLayout {
  const weekStartStr = toDateStr(week[0]);
  const weekEndStr = toDateStr(week[6]);

  const weekTrips = trips.filter(
    (t) => t.start_date <= weekEndStr && t.end_date >= weekStartStr
  );

  // Sort by the trip's first visible day in this week, then by original start_date
  const sorted = [...weekTrips].sort((a, b) => {
    const aStart = a.start_date < weekStartStr ? weekStartStr : a.start_date;
    const bStart = b.start_date < weekStartStr ? weekStartStr : b.start_date;
    if (aStart !== bStart) return aStart.localeCompare(bStart);
    return a.start_date.localeCompare(b.start_date);
  });

  // Greedy interval scheduling: reuse a slot when the previous occupant has ended
  const tripSlots = new Map<string, number>();
  const slotEnds: string[] = []; // rightmost end date per slot (within this week)

  for (const trip of sorted) {
    const tripStart = trip.start_date < weekStartStr ? weekStartStr : trip.start_date;
    let slot = slotEnds.findIndex((end) => end < tripStart);
    if (slot === -1) {
      slot = slotEnds.length;
      slotEnds.push('');
    }
    tripSlots.set(trip.id, slot);
    slotEnds[slot] = trip.end_date > weekEndStr ? weekEndStr : trip.end_date;
  }

  return { tripSlots, totalSlots: slotEnds.length, weekTrips, weekStartStr, weekEndStr };
}
