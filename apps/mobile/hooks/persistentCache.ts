/**
 * @module persistentCache
 * AsyncStorage-backed TTL cache for expensive SerpAPI / image responses.
 * Survives app restarts so we don't burn tokens re-fetching the same destinations
 * every cold start. In-memory React Query staleTime alone resets on each launch.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

// Bumped prefix — busts any v1 entries that captured empty SerpAPI responses
// from earlier sessions when the env pointed at the wrong host.
const PREFIX = 'travyl:cache:v2:';

interface Entry<T> {
  expiresAt: number;
  value: T;
}

export async function cacheGet<T>(key: string): Promise<T | null> {
  try {
    const raw = await AsyncStorage.getItem(PREFIX + key);
    if (!raw) return null;
    const entry = JSON.parse(raw) as Entry<T>;
    if (Date.now() > entry.expiresAt) {
      AsyncStorage.removeItem(PREFIX + key).catch(() => {});
      return null;
    }
    return entry.value;
  } catch {
    return null;
  }
}

export async function cacheSet<T>(key: string, value: T, ttlMs: number): Promise<void> {
  try {
    const entry: Entry<T> = { expiresAt: Date.now() + ttlMs, value };
    await AsyncStorage.setItem(PREFIX + key, JSON.stringify(entry));
  } catch {
    // Swallow — caching is best-effort
  }
}

function isEmpty(value: unknown): boolean {
  if (value == null) return true;
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === 'object') return Object.keys(value as object).length === 0;
  return false;
}

/**
 * Wraps an async fetcher with persistent TTL caching.
 * If the key has a fresh cached value, returns it immediately and skips fetcher.
 * Empty results are NOT cached — we'd rather retry next launch than persist
 * a transient failure for 24 hours.
 */
export async function cached<T>(key: string, ttlMs: number, fetcher: () => Promise<T>): Promise<T> {
  const hit = await cacheGet<T>(key);
  if (hit !== null && !isEmpty(hit)) return hit;
  const value = await fetcher();
  if (!isEmpty(value)) cacheSet(key, value, ttlMs).catch(() => {});
  return value;
}
