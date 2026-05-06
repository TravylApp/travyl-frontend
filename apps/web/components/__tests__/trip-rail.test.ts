import { describe, it, expect } from 'vitest';
import { TAB_GROUPS, ALL_TABS, getTabMeta } from '@/components/trip-rail';

describe('TAB_GROUPS', () => {
  it('has three groups in order: plan, book, explore', () => {
    expect(TAB_GROUPS.map(g => g.id)).toEqual(['plan', 'book', 'explore']);
  });
  it('plan group contains overview, itinerary, calendar', () => {
    expect(TAB_GROUPS[0].segments).toEqual(['', 'itinerary', 'calendar']);
  });
  it('book group contains hotels, flights, cars', () => {
    expect(TAB_GROUPS[1].segments).toEqual(['hotels', 'flights', 'cars']);
  });
  it('explore group contains activities, packing, budget, favorites', () => {
    expect(TAB_GROUPS[2].segments).toEqual(['activities', 'packing', 'budget', 'favorites']);
  });
  it('every grouped segment exists in ALL_TABS', () => {
    const allSegments = new Set(ALL_TABS.map(t => t.segment));
    for (const group of TAB_GROUPS) {
      for (const seg of group.segments) {
        expect(allSegments.has(seg)).toBe(true);
      }
    }
  });
  it('settings + history are NOT in any group (they live in the footer)', () => {
    const grouped = new Set(TAB_GROUPS.flatMap(g => g.segments));
    expect(grouped.has('settings')).toBe(false);
    expect(grouped.has('history')).toBe(false);
  });
});

describe('getTabMeta', () => {
  it('returns the matching tab def for a known segment', () => {
    expect(getTabMeta('hotels')?.label).toBe('Hotels');
  });
  it('returns the overview tab for the empty segment', () => {
    expect(getTabMeta('')?.label).toBe('Overview');
  });
  it('returns undefined for an unknown segment', () => {
    expect(getTabMeta('nonsense')).toBeUndefined();
  });
});
