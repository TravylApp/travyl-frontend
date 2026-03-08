export function formatDateRange(start: string, end: string): string {
  const s = new Date(start + 'T00:00:00');
  const e = new Date(end + 'T00:00:00');
  const fmt = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  return `${fmt(s)} – ${fmt(e)}, ${s.getFullYear()}`;
}

export function formatCurrency(amount: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(amount);
}

// ─── Fresh-pick utility ─────────────────────────────────────────

/**
 * Picks `count` random items from `pool`, excluding IDs already in `shownIds`.
 * When the available pool is exhausted, resets and starts fresh.
 * Does NOT mutate the input array.
 */
export function pickFresh<T extends { id: string }>(
  pool: T[],
  count: number,
  shownIds: Set<string>,
): T[] {
  let available = pool.filter((item) => !shownIds.has(item.id));

  // Pool exhausted — reset and use full pool
  if (available.length < count) {
    shownIds.clear();
    available = [...pool];
  }

  // Fisher-Yates shuffle
  const shuffled = [...available];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  const picked = shuffled.slice(0, count);
  for (const item of picked) shownIds.add(item.id);
  return picked;
}

/**
 * Shuffles an array in place using Fisher-Yates. Returns a new array.
 */
export function shuffle<T>(items: T[]): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

// Session tracker — re-export for public barrel
export { getShownIds } from './sessionTracker';
