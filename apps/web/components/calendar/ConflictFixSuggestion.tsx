'use client'

interface ConflictFixSuggestionProps {
  activityId: string
  currentStartHour: number
  travelTimeMinutes: number
  prevEndHour: number
  onFix: (activityId: string, newStartHour: number) => void
}

function formatHour12(hour: number): string {
  const h = Math.floor(hour)
  const m = Math.round((hour - h) * 60)
  const period = h >= 12 ? 'PM' : 'AM'
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h
  return m === 0 ? `${h12} ${period}` : `${h12}:${String(m).padStart(2, '0')} ${period}`
}

export default function ConflictFixSuggestion({
  activityId,
  travelTimeMinutes,
  prevEndHour,
  onFix,
}: ConflictFixSuggestionProps) {
  const rawNewStart = prevEndHour + travelTimeMinutes / 60
  const newStartHour = Math.ceil(rawNewStart * 4) / 4
  const formattedTime = formatHour12(newStartHour)

  function handleClick() {
    onFix(activityId, newStartHour)
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      title={`Push start to ${formattedTime} to fix travel time conflict`}
      className="rounded-full px-2 py-0.5 text-xs bg-amber-50 text-amber-800 border border-amber-300 hover:bg-amber-100 transition-colors"
    >
      Fix → {formattedTime}
    </button>
  )
}
