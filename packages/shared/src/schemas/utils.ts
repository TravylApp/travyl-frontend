import { z } from 'zod';

/** Parse `data` against `schema`. Logs validation errors to console with `label`,
 *  then returns null. Returns the typed value on success. Use at network/storage
 *  boundaries — not in hot render paths. */
export function safeParse<T extends z.ZodTypeAny>(
  schema: T,
  data: unknown,
  label: string,
): z.infer<T> | null {
  const result = schema.safeParse(data);
  if (result.success) return result.data;
  console.warn(`[zod:${label}] validation failed`, result.error.issues);
  return null;
}

/** Fetch JSON and validate it against a Zod schema. Returns null on
 *  network/parse/validation failure (caller decides how to handle). */
export async function fetchJson<T extends z.ZodTypeAny>(
  url: string,
  schema: T,
  init?: RequestInit,
): Promise<z.infer<T> | null> {
  try {
    const res = await fetch(url, init);
    if (!res.ok) return null;
    const json = await res.json();
    return safeParse(schema, json, url);
  } catch {
    return null;
  }
}
