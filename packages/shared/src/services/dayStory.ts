import type { DayStory, DayStoryRequest } from '../types';

export async function fetchDayStory(req: DayStoryRequest): Promise<DayStory> {
  const res = await fetch('/api/day-story', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req),
  });
  if (!res.ok) throw new Error(`day-story ${res.status}`);
  return (await res.json()) as DayStory;
}
