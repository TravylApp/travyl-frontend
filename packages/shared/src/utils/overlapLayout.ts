export interface OverlapLayoutItem {
  column: number       // 0-based column index, or -1 (hidden when > MAX_VISIBLE_COLUMNS)
  totalColumns: number // total columns in this overlap group
  columnSpan: number   // how many columns this event spans (1 to totalColumns - column)
}

const MAX_VISIBLE_COLUMNS = 3
const HIDDEN_COLUMN = -1
const DEFAULT_SPAN = 1
const INITIAL_COLUMN = 0
const PROPAGATION_PASSES = 2

interface LayoutInput {
  id: string
  startHour: number
  duration: number
}

function overlaps(a: LayoutInput, b: LayoutInput): boolean {
  return a.startHour < b.startHour + b.duration && b.startHour < a.startHour + a.duration
}

/**
 * Bin-packing overlap layout.
 *
 * 1. Sort by startHour, then by id for stability.
 * 2. First-fit bin-packing: each activity gets the first column whose last
 *    event has ended.
 * 3. Per-event totalCols: for each event, find the max column index among
 *    all directly overlapping events.
 * 4. Propagate totalCols across overlap pairs so transitively connected
 *    events share the same value.
 * 5. Column span: each event expands rightward into adjacent empty columns.
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
    for (let c = INITIAL_COLUMN; c < columns.length; c++) {
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
  for (let pass = INITIAL_COLUMN; pass < PROPAGATION_PASSES; pass++) {
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
    const col = assignments.get(act.id)!
    const totalCols = Math.min(totalColsMap.get(act.id) ?? DEFAULT_SPAN, MAX_VISIBLE_COLUMNS)

    // Hide events beyond the visible column cap
    if (col >= MAX_VISIBLE_COLUMNS) {
      result.set(act.id, { column: HIDDEN_COLUMN, totalColumns: totalCols, columnSpan: DEFAULT_SPAN })
      continue
    }

    // Compute column span: expand rightward into empty columns
    let span = DEFAULT_SPAN
    for (let c = col + DEFAULT_SPAN; c < totalCols; c++) {
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
