/**
 * @module overlapLayout
 * Calendar overlap layout algorithm for the day-column calendar view.
 * When multiple activities overlap in time, this module assigns each a column
 * index and computes how many columns each event can span — ensuring visually
 * distinct, non-overlapping calendar blocks.
 *
 * Used by the web and mobile CalendarDay components to render concurrent events
 * side-by-side. Events beyond MAX_VISIBLE_COLUMNS (3) are hidden (column = -1).
 */

/**
 * Layout metadata assigned to each calendar activity by {@link computeOverlapLayout}.
 */
export interface OverlapLayoutItem {
  /** 0-based column index within the overlap group. -1 means the event is hidden (exceeds MAX_VISIBLE_COLUMNS). */
  column: number
  /** Total number of columns in this overlap group */
  totalColumns: number
  /** How many columns this event spans rightward (1 = no spanning, up to totalColumns − column) */
  columnSpan: number
}

/** Maximum number of side-by-side columns rendered; events beyond this are hidden */
const MAX_VISIBLE_COLUMNS = 3

/**
 * Minimal shape required by the layout algorithm — just the fields needed
 * to detect overlaps and assign columns.
 */
interface LayoutInput {
  /** Stable identifier (used as the Map key in the result) */
  id: string
  /** Start time in fractional hours */
  startHour: number
  /** Duration in fractional hours */
  duration: number
}

/**
 * Returns true if two activities overlap in time (half-open intervals).
 */
function overlaps(a: LayoutInput, b: LayoutInput): boolean {
  return a.startHour < b.startHour + b.duration && b.startHour < a.startHour + a.duration
}

/**
 * Bin-packing overlap layout algorithm.
 *
 * Steps:
 * 1. Sort activities by startHour (then duration desc for stability).
 * 2. First-fit bin-packing: assign each activity to the first column whose
 *    last event has ended.
 * 3. Per-event totalCols: find the max column index among all directly
 *    overlapping events (converted to a 1-based count).
 * 4. Propagate totalCols across overlap pairs in two passes so transitively
 *    connected events share the same value.
 * 5. Compute column span: each event expands rightward into adjacent columns
 *    that have no other overlapping event.
 * 6. Events assigned to column ≥ MAX_VISIBLE_COLUMNS are marked hidden (column = -1).
 *
 * @param activities - Array of activities to lay out; must have id, startHour, duration
 * @returns Map from activity id to its {@link OverlapLayoutItem} layout metadata
 * @example
 * const layout = computeOverlapLayout([
 *   { id: 'a', startHour: 9, duration: 2 },
 *   { id: 'b', startHour: 10, duration: 1 },
 * ])
 * layout.get('a') // → { column: 0, totalColumns: 2, columnSpan: 1 }
 * layout.get('b') // → { column: 1, totalColumns: 2, columnSpan: 1 }
 */
export function computeOverlapLayout(
  activities: LayoutInput[],
): Map<string, OverlapLayoutItem> {
  const result = new Map<string, OverlapLayoutItem>()
  if (activities.length === 0) return result

  const sorted = [...activities].sort((a, b) => {
    if (a.startHour !== b.startHour) return a.startHour - b.startHour
    return b.duration - a.duration
  })

  // Step 1: Bin-packing column assignment
  const columns: { endHour: number }[] = []
  const assignments = new Map<string, number>()

  for (const act of sorted) {
    let placed = false
    for (let c = 0; c < columns.length; c++) {
      if (act.startHour >= columns[c].endHour) {
        columns[c].endHour = act.startHour + act.duration
        assignments.set(act.id, c)
        placed = true
        break
      }
    }
    if (!placed) {
      columns.push({ endHour: act.startHour + act.duration })
      assignments.set(act.id, columns.length - 1)
    }
  }

  // Step 2: Per-event totalCols — max column index among overlapping events
  const totalColsMap = new Map<string, number>()
  for (const act of sorted) {
    const col = assignments.get(act.id)!
    let maxCol = col + 1
    for (const other of sorted) {
      if (other.id === act.id) continue
      if (overlaps(act, other)) {
        maxCol = Math.max(maxCol, assignments.get(other.id)! + 1)
      }
    }
    totalColsMap.set(act.id, maxCol)
  }

  // Step 3: Propagate totalCols across overlap groups
  // Single pass is sufficient for pairwise propagation in sorted order,
  // but we do a second pass to catch reverse-direction propagation.
  for (let pass = 0; pass < 2; pass++) {
    for (const act of sorted) {
      for (const other of sorted) {
        if (other.id === act.id) continue
        if (overlaps(act, other)) {
          const shared = Math.max(totalColsMap.get(act.id)!, totalColsMap.get(other.id)!)
          totalColsMap.set(act.id, shared)
          totalColsMap.set(other.id, shared)
        }
      }
    }
  }

  // Step 4: Build result with column span
  for (const act of sorted) {
    let col = assignments.get(act.id)!
    const totalCols = Math.min(totalColsMap.get(act.id) ?? 1, MAX_VISIBLE_COLUMNS)

    // Hide events beyond the visible column cap
    if (col >= MAX_VISIBLE_COLUMNS) {
      result.set(act.id, { column: -1, totalColumns: totalCols, columnSpan: 1 })
      continue
    }

    // Compute column span: expand rightward into empty columns
    let span = 1
    for (let c = col + 1; c < totalCols; c++) {
      const blocked = sorted.some(
        (other) => other.id !== act.id && assignments.get(other.id) === c && overlaps(act, other),
      )
      if (blocked) break
      span++
    }

    result.set(act.id, { column: col, totalColumns: totalCols, columnSpan: span })
  }

  return result
}
