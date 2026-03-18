export interface OverlapLayoutItem {
  column: number       // 0, 1, 2, or -1 (hidden)
  totalColumns: number // 1, 2, or 3
}

const MAX_VISIBLE_COLUMNS = 3

interface LayoutInput {
  id: string
  startHour: number
  duration: number
}

export function computeOverlapLayout(
  activities: LayoutInput[],
): Map<string, OverlapLayoutItem> {
  const result = new Map<string, OverlapLayoutItem>()
  if (activities.length === 0) return result

  const sorted = [...activities].sort((a, b) => {
    if (a.startHour !== b.startHour) return a.startHour - b.startHour
    return b.duration - a.duration
  })

  const clusters: LayoutInput[][] = []
  let currentCluster: LayoutInput[] = [sorted[0]]
  let clusterEnd = sorted[0].startHour + sorted[0].duration

  for (let i = 1; i < sorted.length; i++) {
    const act = sorted[i]
    if (act.startHour < clusterEnd) {
      currentCluster.push(act)
      clusterEnd = Math.max(clusterEnd, act.startHour + act.duration)
    } else {
      clusters.push(currentCluster)
      currentCluster = [act]
      clusterEnd = act.startHour + act.duration
    }
  }
  clusters.push(currentCluster)

  for (const cluster of clusters) {
    const byPriority = [...cluster].sort((a, b) => b.duration - a.duration)
    const assignments: { act: LayoutInput; column: number }[] = []

    for (const act of byPriority) {
      let assignedCol = -1
      for (let col = 0; col < MAX_VISIBLE_COLUMNS; col++) {
        const conflict = assignments.some(
          (a) =>
            a.column === col &&
            a.act.startHour < act.startHour + act.duration &&
            act.startHour < a.act.startHour + a.act.duration,
        )
        if (!conflict) {
          assignedCol = col
          break
        }
      }
      assignments.push({ act, column: assignedCol })
    }

    const maxCol = Math.max(...assignments.map((a) => a.column))
    const visibleUsed = maxCol === -1 ? 0 : maxCol + 1
    const totalColumns = Math.min(Math.max(visibleUsed, cluster.length, 1), MAX_VISIBLE_COLUMNS)

    for (const { act, column } of assignments) {
      result.set(act.id, { column, totalColumns })
    }
  }

  return result
}
