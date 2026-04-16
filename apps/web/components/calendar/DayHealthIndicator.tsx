'use client'

interface DayHealthIndicatorProps {
  hoursConflictCount: number
  travelTimeConflictCount: number
}

export default function DayHealthIndicator({
  hoursConflictCount,
  travelTimeConflictCount,
}: DayHealthIndicatorProps) {
  const totalConflicts = hoursConflictCount + travelTimeConflictCount

  let colorClass: string
  let tooltipText: string

  if (hoursConflictCount > 0) {
    colorClass = 'bg-red-500'
    const parts: string[] = []
    if (hoursConflictCount > 0) {
      parts.push(`${hoursConflictCount} hours conflict${hoursConflictCount !== 1 ? 's' : ''}`)
    }
    if (travelTimeConflictCount > 0) {
      parts.push(`${travelTimeConflictCount} travel time warning${travelTimeConflictCount !== 1 ? 's' : ''}`)
    }
    tooltipText = parts.join(', ')
  } else if (travelTimeConflictCount > 0) {
    colorClass = 'bg-amber-400'
    tooltipText = `${travelTimeConflictCount} travel time warning${travelTimeConflictCount !== 1 ? 's' : ''}`
  } else {
    colorClass = 'bg-green-500'
    tooltipText = 'No conflicts'
  }

  return (
    <span
      className={`inline-block w-2.5 h-2.5 rounded-full ${colorClass} flex-shrink-0`}
      title={tooltipText}
    />
  )
}
