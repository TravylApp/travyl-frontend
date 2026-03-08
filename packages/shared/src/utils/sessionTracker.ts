/**
 * In-memory tracker for shown content IDs per section.
 * Resets automatically when the app/page restarts (no persistence).
 */
const shownSets = new Map<string, Set<string>>();

export function getShownIds(section: string): Set<string> {
  if (!shownSets.has(section)) shownSets.set(section, new Set());
  return shownSets.get(section)!;
}
