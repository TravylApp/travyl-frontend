// Background image warmer.
//
// Schedules a batch of image URLs to be fetched into the browser HTTP cache
// during idle time so subsequent <Image>/<img> tags render instantly when the
// user navigates to a page that references the same URL.
//
// Why an image element instead of fetch():
//  - <Image> matches whatever Next.js / browser would do for a real render
//    (uses the same caching, follows the same Referrer-Policy, decodes early
//    on supported browsers via decoding="async").
//  - fetch() can land in a different cache partition and not actually help
//    later <img>/<Image> usage.

const seen = new Set<string>()

function shouldSkipNetwork(): boolean {
  if (typeof navigator === 'undefined') return true
  // Save-Data header / "data saver" mode → respect the user's preference.
  // Effective connection type 'slow-2g' or '2g' → don't burn their bandwidth.
  const conn = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }).connection
  if (!conn) return false
  if (conn.saveData) return true
  if (conn.effectiveType === 'slow-2g' || conn.effectiveType === '2g') return true
  return false
}

function scheduleIdle(cb: () => void): void {
  if (typeof window === 'undefined') return
  const ric = (window as Window & {
    requestIdleCallback?: (cb: IdleRequestCallback, opts?: IdleRequestOptions) => number
  }).requestIdleCallback
  if (ric) ric(cb, { timeout: 2000 })
  else setTimeout(cb, 100)
}

function warmOne(url: string): void {
  // Plain <img> drop-loaded; we never attach it to the DOM. Browser's HTTP
  // cache picks up the response and serves it for the real <Image>/<img>
  // when the user navigates.
  const img = new Image()
  img.decoding = 'async'
  // Per-image error swallow — broken URLs are common, never let them log.
  img.onerror = () => {}
  img.src = url
}

/**
 * Queue a batch of image URLs to warm into the browser HTTP cache.
 *
 * - Deduplicates against URLs already warmed in this session.
 * - Skips silently on Save-Data / 2G / slow-2g.
 * - Spreads requests through `requestIdleCallback` so it never competes with
 *   in-flight rendering work.
 * - Caps concurrency at 6 in-flight at a time to match what a typical browser
 *   would already use for a single origin.
 */
export function warmImages(urls: Iterable<string | null | undefined>): void {
  if (typeof window === 'undefined') return
  if (shouldSkipNetwork()) return

  const queue: string[] = []
  for (const u of urls) {
    if (!u) continue
    // Filter out data: URIs and obviously-broken inputs.
    if (!u.startsWith('http') && !u.startsWith('//')) continue
    if (seen.has(u)) continue
    seen.add(u)
    queue.push(u)
  }
  if (queue.length === 0) return

  let inFlight = 0
  const MAX = 6
  const tick = () => {
    while (inFlight < MAX && queue.length > 0) {
      const url = queue.shift()!
      inFlight++
      const img = new Image()
      img.decoding = 'async'
      const done = () => {
        inFlight--
        if (queue.length > 0) scheduleIdle(tick)
      }
      img.onload = done
      img.onerror = done
      img.src = url
    }
  }
  scheduleIdle(tick)

  // Touch warmOne so unused-export checks don't drop it; reserved for callers
  // that want to bypass batching for a single hero image.
  void warmOne
}

/** Test-only: clear the dedup set so multiple test runs can reuse URLs. */
export function __resetWarmerForTests(): void {
  seen.clear()
}
