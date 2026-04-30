/**
 * @module sessionTracker
 * In-memory tracker for content IDs that have already been shown in a given section.
 * Used by the discovery feed and carousel components to avoid showing the same items
 * twice in a session without persisting anything to storage.
 *
 * The tracker resets automatically when the app or page restarts (no persistence).
 * Re-exported from `utils/index.ts` as `getShownIds`.
 */

/**
 * Module-level map from section name → set of shown content IDs.
 * Lazily initialized per section on first access.
 */
const shownSets = new Map<string, Set<string>>();

/**
 * Returns (and lazily creates) the set of shown content IDs for a given section.
 * Mutating the returned set is the intended use — call `set.add(id)` to mark an
 * item as seen, or `set.clear()` to reset a section.
 *
 * @param section - Identifier for the UI section (e.g. "discovery-feed", "featured")
 * @returns Mutable `Set<string>` of IDs that have been shown in this section
 * @example
 * const shown = getShownIds("discovery-feed")
 * shown.add("place-123")
 * shown.has("place-123") // → true
 */
export function getShownIds(section: string): Set<string> {
  if (!shownSets.has(section)) shownSets.set(section, new Set());
  return shownSets.get(section)!;
}
