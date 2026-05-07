/**
 * Helpers for working with the simple `hours` string returned by the
 * recommendation API ("Today: 5 PM–2 AM", "Today: 7–11 PM", "Today: Closed",
 * "Open 24 hours"). Pure — easy to unit test, no React.
 */

export interface OpenStatus {
  /** True when we believe the place is currently open. */
  isOpen: boolean;
  /** Best-effort short label for display ("Open now", "Closed", "Open · 5 PM–2 AM"). */
  label: string;
  /** When known, the closing time formatted as the API gave us. */
  closesAt?: string;
}

const TIME_RE = /(\d{1,2})(?::(\d{2}))?\s*(AM|PM|am|pm)?/g;

function parseClock(token: string): number | null {
  const m = token.match(/(\d{1,2})(?::(\d{2}))?\s*(AM|PM|am|pm)?/);
  if (!m) return null;
  let h = parseInt(m[1], 10);
  const min = m[2] ? parseInt(m[2], 10) : 0;
  const ampm = m[3]?.toLowerCase();
  if (ampm === 'pm' && h !== 12) h += 12;
  if (ampm === 'am' && h === 12) h = 0;
  if (h < 0 || h > 24) return null;
  return h * 60 + min;
}

/**
 * Parse an "Open: <start>–<end>" range into [startMinutes, endMinutes].
 * If start lacks AM/PM but end has it, propagate the period to start.
 * If end < start, treats it as overnight (adds 24h to end).
 */
function parseRange(rangeText: string): [number, number] | null {
  // Normalize various dashes
  const normalized = rangeText.replace(/[‐-―−]/g, '-');
  const [rawStart, rawEnd] = normalized.split('-').map((s) => s.trim());
  if (!rawStart || !rawEnd) return null;

  let endMin = parseClock(rawEnd);
  let startMin = parseClock(rawStart);
  if (startMin == null || endMin == null) return null;

  // Propagate AM/PM from end to start when start lacks period
  if (!/AM|PM/i.test(rawStart) && /AM|PM/i.test(rawEnd)) {
    const endIsPM = /pm/i.test(rawEnd);
    const startHas12HrClue = parseInt(rawStart, 10) >= 12;
    // If end is PM and start hour is < end hour, assume start is also PM
    const startHour = parseInt(rawStart, 10);
    const endHour = Math.floor(endMin / 60) % 12 || 12;
    if (endIsPM && startHour <= 12 && !startHas12HrClue) {
      startMin = ((startHour % 12) + 12) * 60 + (startMin % 60);
    }
  }

  if (endMin <= startMin) endMin += 24 * 60;
  return [startMin, endMin];
}

/**
 * Determine if `hoursText` represents "currently open" relative to `now`.
 * Returns null when the input is unparseable so callers can show "—".
 */
export function getOpenStatus(hoursText: string | null | undefined, now: Date = new Date()): OpenStatus | null {
  if (!hoursText) return null;
  const text = hoursText.trim();

  // Common explicit signals
  if (/closed/i.test(text)) return { isOpen: false, label: 'Closed' };
  if (/open\s*24/i.test(text) || /24\s*\/\s*7/i.test(text)) {
    return { isOpen: true, label: 'Open 24 hours' };
  }

  const stripped = text.replace(/^Today:\s*/i, '');
  const range = parseRange(stripped);
  if (!range) return null;

  const [startMin, endMin] = range;
  const nowMin = now.getHours() * 60 + now.getMinutes();
  // Account for the overnight wrap. parseRange added 24h to end if it was
  // smaller than start. If `now` is in the early morning we should also
  // shift it forward so a "5 PM–2 AM" window catches "01:30 AM today".
  const nowMinShifted = nowMin < startMin ? nowMin + 24 * 60 : nowMin;
  const isOpen = nowMinShifted >= startMin && nowMinShifted < endMin;

  // Pull the right side as the closing token for display
  const closesAt = stripped.split(/[‐-―−-]/).slice(-1)[0]?.trim();
  return {
    isOpen,
    label: isOpen ? `Open · until ${closesAt}` : `Closed · ${stripped}`,
    closesAt,
  };
}
