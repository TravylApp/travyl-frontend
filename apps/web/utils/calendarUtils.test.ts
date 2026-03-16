import { describe, it, expect } from 'vitest';
import { buildWeeks, buildWeekLayout, toDateStr } from './calendarUtils';
import type { CalendarTrip } from '@travyl/shared';

function makeTrip(id: string, start: string, end: string): CalendarTrip {
  return {
    id,
    title: `Trip ${id}`,
    destination: 'Tokyo',
    start_date: start,
    end_date: end,
    status: 'booked',
    theme: 'navy',
    custom_theme_color: null,
  };
}

describe('buildWeeks', () => {
  it('returns rows of exactly 7 days each', () => {
    const weeks = buildWeeks(2026, 0); // January 2026
    expect(weeks.every((w) => w.length === 7)).toBe(true);
  });

  it('first day of first row is a Sunday', () => {
    const weeks = buildWeeks(2026, 0);
    expect(weeks[0][0].getDay()).toBe(0);
  });

  it('last day of last row is a Saturday', () => {
    const weeks = buildWeeks(2026, 0);
    const last = weeks[weeks.length - 1];
    expect(last[6].getDay()).toBe(6);
  });

  it('covers the first and last day of the month', () => {
    const weeks = buildWeeks(2026, 1); // February 2026
    const allDates = weeks.flat().map((d) => toDateStr(d));
    expect(allDates).toContain('2026-02-01');
    expect(allDates).toContain('2026-02-28');
  });
});

describe('buildWeekLayout', () => {
  it('returns empty layout when no trips overlap the week', () => {
    const week = buildWeeks(2026, 0)[0]; // first week of Jan 2026
    const layout = buildWeekLayout([], week);
    expect(layout.totalSlots).toBe(0);
    expect(layout.tripSlots.size).toBe(0);
  });

  it('assigns slot 0 to a single trip overlapping the week', () => {
    const week = buildWeeks(2026, 0)[1]; // second week
    const weekStart = toDateStr(week[0]);
    const t = makeTrip('a', weekStart, weekStart);
    const layout = buildWeekLayout([t], week);
    expect(layout.tripSlots.get('a')).toBe(0);
    expect(layout.totalSlots).toBe(1);
  });

  it('reuses slot 0 for two non-overlapping trips in the same week', () => {
    const week = buildWeeks(2026, 0)[1];
    const t1 = makeTrip('a', toDateStr(week[0]), toDateStr(week[1])); // Sun-Mon
    const t2 = makeTrip('b', toDateStr(week[3]), toDateStr(week[4])); // Wed-Thu
    const layout = buildWeekLayout([t1, t2], week);
    expect(layout.tripSlots.get('a')).toBe(0);
    expect(layout.tripSlots.get('b')).toBe(0);
    expect(layout.totalSlots).toBe(1);
  });

  it('assigns different slots to two overlapping trips', () => {
    const week = buildWeeks(2026, 0)[1];
    const t1 = makeTrip('a', toDateStr(week[0]), toDateStr(week[6])); // full week
    const t2 = makeTrip('b', toDateStr(week[0]), toDateStr(week[2])); // Sun-Tue
    const layout = buildWeekLayout([t1, t2], week);
    const s1 = layout.tripSlots.get('a')!;
    const s2 = layout.tripSlots.get('b')!;
    expect(s1).not.toBe(s2);
    expect(layout.totalSlots).toBe(2);
  });

  it('excludes trips that end before the week starts', () => {
    const week = buildWeeks(2026, 0)[2]; // third week
    const t = makeTrip('x', '2026-01-01', '2026-01-03'); // before this week
    const layout = buildWeekLayout([t], week);
    expect(layout.totalSlots).toBe(0);
  });

  it('includes trips that start before and end within the week', () => {
    const week = buildWeeks(2026, 0)[1];
    const weekEndStr = toDateStr(week[2]);
    const t = makeTrip('y', '2026-01-01', weekEndStr); // started before week
    const layout = buildWeekLayout([t], week);
    expect(layout.tripSlots.get('y')).toBe(0);
  });
});
