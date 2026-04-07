'use client'
import { Walking, Car } from 'iconoir-react'

interface TravelTimeBadgeProps {
  travelTimeMinutes: number
  distanceKm: number
  gapMinutes: number
  hasConflict: boolean
}

export default function TravelTimeBadge({
  travelTimeMinutes,
  distanceKm,
  gapMinutes,
  hasConflict,
}: TravelTimeBadgeProps) {
  const Icon = distanceKm < 2 ? Walking : Car

  return (
    <div className="relative flex items-center justify-center w-full py-0.5">
      {/* Dashed vertical line */}
      <div
        className="absolute left-1/2 top-0 bottom-0 -translate-x-1/2 w-px border-l border-dashed"
        style={{ borderColor: 'var(--cal-border)' }}
      />

      {/* Badge */}
      {hasConflict ? (
        <span
          className="relative z-10 flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium bg-amber-100 text-amber-800 border border-amber-300 whitespace-nowrap"
        >
          <Icon width={12} height={12} />
          ⚠ {travelTimeMinutes} min needed, {gapMinutes} min gap
        </span>
      ) : (
        <span
          className="relative z-10 flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium border opacity-0 group-hover:opacity-100 transition-opacity"
          style={{
            background: 'var(--cal-surface)',
            color: 'var(--cal-text-secondary)',
            borderColor: 'var(--cal-border)',
          }}
        >
          <Icon width={12} height={12} />
          {travelTimeMinutes} min
        </span>
      )}
    </div>
  )
}
