'use client'
import { Train, Bus, Ship, CableCar } from 'lucide-react'
import type { TransitDirectionResult, TransitDirectionStep } from '@travyl/shared'

// ─── Mode icon mapping ───────────────────────────────────────

const MODE_ICONS: Record<string, typeof Train> = {
  train: Train,
  bus: Bus,
  subway: Train,
  tram: Train,
  light_rail: Train,
  ferry: Ship,
  cable_car: CableCar,
  funicular: CableCar,
}

const MODE_COLORS: Record<string, string> = {
  train: '#10B981',
  bus: '#F59E0B',
  subway: '#3B82F6',
  tram: '#8B5CF6',
  light_rail: '#8B5CF6',
  ferry: '#06B6D4',
  cable_car: '#EC4899',
  funicular: '#EC4899',
}

function getDominantMode(steps: TransitDirectionStep[]): { mode: string; line: string; color: string } {
  // Find the first transit step (skip walking/rideshare)
  const transitStep = steps.find((s) => !['walking', 'rideshare'].includes(s.mode))
  if (transitStep) {
    return {
      mode: transitStep.mode,
      line: transitStep.line || transitStep.carrier,
      color: transitStep.line_color || MODE_COLORS[transitStep.mode] || '#6B7280',
    }
  }
  // Fall back to first step
  const first = steps[0]
  return {
    mode: first?.mode ?? 'walking',
    line: first?.line ?? '',
    color: MODE_COLORS[first?.mode] ?? '#6B7280',
  }
}

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m > 0 ? `${h}h ${m}m` : `${h}h`
}

// ─── Props ───────────────────────────────────────────────────

interface TransitRouteBadgeProps {
  direction: TransitDirectionResult
  gapMinutes: number
  hasConflict: boolean
}

// ─── Component ───────────────────────────────────────────────

export default function TransitRouteBadge({
  direction,
  gapMinutes,
  hasConflict,
}: TransitRouteBadgeProps) {
  const { mode, line, color } = getDominantMode(direction.steps)
  const Icon = MODE_ICONS[mode] ?? Train
  const totalMin = direction.total_duration_minutes

  return (
    <div className="relative flex items-center justify-center w-full py-0.5 group">
      {/* Dashed vertical line */}
      <div
        className="absolute left-1/2 top-0 bottom-0 -translate-x-1/2 w-px border-l border-dashed"
        style={{ borderColor: `${color}40` }}
      />

      {/* Transit badge */}
      {hasConflict ? (
        <span
          className="relative z-10 flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium whitespace-nowrap shadow-sm border"
          style={{
            backgroundColor: `${color}15`,
            color,
            borderColor: `${color}30`,
          }}
        >
          <Icon size={12} strokeWidth={2} />
          {line && <span className="font-bold text-[11px]">{line}</span>}
          <span>{formatDuration(totalMin)}</span>
          <span className="opacity-60 mx-0.5">·</span>
          <span className="text-amber-600 font-semibold">
            ⚠ {gapMinutes} min gap
          </span>
        </span>
      ) : (
        <span
          className="relative z-10 flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity shadow-sm border"
          style={{
            backgroundColor: 'var(--cal-surface)',
            color: 'var(--cal-text-secondary)',
            borderColor: 'var(--cal-border)',
          }}
        >
          <Icon size={12} strokeWidth={2} style={{ color }} />
          {line && <span className="font-bold text-[11px]" style={{ color }}>{line}</span>}
          <span>{formatDuration(totalMin)}</span>
          {direction.fare && direction.fare.amount > 0 && (
            <>
              <span className="opacity-40 mx-0.5">·</span>
              <span className="opacity-70">
                {direction.fare.currency === 'EUR' ? '€' : direction.fare.currency === 'USD' ? '$' : ''}
                {direction.fare.amount.toFixed(2)}
              </span>
            </>
          )}
        </span>
      )}

      {/* Tooltip with full step breakdown */}
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 z-30 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
        <div
          className="rounded-lg px-3 py-2 text-xs shadow-xl whitespace-nowrap border"
          style={{
            backgroundColor: 'var(--cal-surface)',
            color: 'var(--cal-text-primary)',
            borderColor: 'var(--cal-border)',
            minWidth: 160,
          }}
        >
          <div className="font-semibold mb-1 text-[11px]">
            {direction.origin.label} → {direction.destination.label}
          </div>
          <div className="space-y-0.5">
            {direction.steps.map((step, i) => {
              const StepIcon = MODE_ICONS[step.mode]
              const stepColor = MODE_COLORS[step.mode] ?? '#6B7280'
              return (
                <div key={i} className="flex items-center gap-1.5 text-[10px]">
                  {StepIcon ? <StepIcon size={10} strokeWidth={2} style={{ color: stepColor }} /> : null}
                  {(step.mode === 'walking' as string) || step.mode === 'rideshare' ? (
                    <span className="text-gray-500">
                      Walk {step.distance_meters ? `${Math.round(step.distance_meters)}m` : formatDuration(step.duration_minutes)}
                    </span>
                  ) : (
                    <span className="text-gray-700">
                      <span style={{ color: stepColor }} className="font-semibold">
                        {step.line || step.carrier}
                      </span>
                      {' '}· {formatDuration(step.duration_minutes)}
                      {step.num_stops != null && step.num_stops > 0 && (
                        <span className="text-gray-400"> · {step.num_stops} stops</span>
                      )}
                    </span>
                  )}
                </div>
              )
            })}
          </div>
          <div className="mt-1.5 pt-1.5 border-t border-gray-100 flex justify-between text-[10px] text-gray-400">
            <span>Total: {formatDuration(totalMin)}</span>
            {direction.total_distance_meters != null && (
              <span>{(direction.total_distance_meters / 1000).toFixed(1)} km</span>
            )}
          </div>
        </div>
        {/* Arrow */}
        <div
          className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4"
          style={{
            borderLeftColor: 'transparent',
            borderRightColor: 'transparent',
            borderTopColor: 'var(--cal-border)',
          }}
        />
      </div>
    </div>
  )
}
