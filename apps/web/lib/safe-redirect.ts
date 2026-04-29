/**
 * Validates a `?next=...` redirect target so OAuth callbacks and login flows
 * can't be tricked into bouncing the user to an attacker-controlled origin.
 *
 * Rejects:
 *   - empty / missing values
 *   - anything that doesn't start with a single forward slash
 *   - protocol-relative paths like `//evil.com` (browsers treat these as
 *     external — `https://gotravyl.com//evil.com` redirects to evil.com)
 *   - Windows-style backslash paths like `/\evil.com`
 *   - absolute URLs (`http://`, `https://`, `javascript:`, `data:`, etc.)
 *   - any whitespace or control characters
 *
 * Returns the value if it's a safe relative path, otherwise the fallback.
 */
export function safeNextPath(next: string | null | undefined, fallback = '/'): string {
  if (!next) return fallback;
  if (typeof next !== 'string') return fallback;
  // Strip leading whitespace; reject if any control chars
  if (/[\u0000-\u001f\u007f]/.test(next)) return fallback;
  // Must be a relative path starting with a single `/`
  if (next[0] !== '/') return fallback;
  // Reject protocol-relative (`//evil.com`) and backslash variants (`/\evil.com`)
  if (next[1] === '/' || next[1] === '\\') return fallback;
  // Reject anything that contains a URL scheme (`://`)
  if (next.includes('://')) return fallback;
  return next;
}
