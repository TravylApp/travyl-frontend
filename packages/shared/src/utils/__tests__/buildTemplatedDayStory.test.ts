import { describe, it, expect } from 'vitest';
import { buildTemplatedDayStory } from '../buildTemplatedDayStory';
import type { DayStoryRequest } from '../../types';

const base: DayStoryRequest = {
  tripId: 't1', dayIndex: 0, destination: 'Ibiza',
  dateLabel: 'Mon, Jun 1', isFirstDay: true, isLastDay: false,
  activities: [],
};

describe('buildTemplatedDayStory', () => {
  it('returns a Suggestion-style story when the day is empty', () => {
    const s = buildTemplatedDayStory(base);
    expect(s.source).toBe('template');
    expect(s.headline).toMatch(/<em>.+<\/em>/);
    expect(s.narrative.length).toBeGreaterThan(20);
  });

  it('uses the first activity name in the headline when present', () => {
    const s = buildTemplatedDayStory({
      ...base,
      activities: [{ name: 'Dalt Vila walk', type: 'sightseeing', startHour: 9 }],
    });
    expect(s.headline.toLowerCase()).toContain('dalt vila');
    expect(s.featuredActivityIndex).toBe(0);
  });

  it('marks isLastDay narratives as "departure"-flavored', () => {
    const s = buildTemplatedDayStory({ ...base, isFirstDay: false, isLastDay: true });
    expect(s.narrative.toLowerCase()).toMatch(/last|farewell|home|depart/);
  });
});
