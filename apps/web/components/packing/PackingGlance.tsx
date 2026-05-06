'use client'

import type { Trip, TravelerMetadata } from '@travyl/shared'

interface PackingGlanceProps {
  trip: Trip | null | undefined
  packed: number
  total: number
  percent: number
}

function daysUntil(dateStr?: string | null): { value: number; label: string } | null {
  if (!dateStr) return null
  const start = new Date(dateStr)
  const today = new Date()
  const diffMs = start.getTime() - today.getTime()
  const days = Math.ceil(diffMs / 86400000)
  if (days > 0) return { value: days, label: 'until trip' }
  return { value: 0, label: 'trip in progress' }
}

function avgTemp(forecast: { high?: number }[] | undefined): { value: string; label: string } {
  if (!forecast || forecast.length === 0) return { value: '—', label: 'no forecast' }
  const sum = forecast.reduce((s, d) => s + (d.high ?? 0), 0)
  const avg = Math.round(sum / forecast.length)
  const label = avg > 22 ? 'light packing' : avg < 12 ? 'layer up' : 'moderate'
  return { value: `${avg}°`, label }
}

function travelerSub(metadata: TravelerMetadata | undefined): string {
  if (!metadata) return 'travelers'
  const parts: string[] = []
  if (metadata.adults) parts.push(`${metadata.adults} adult${metadata.adults === 1 ? '' : 's'}`)
  if (metadata.children) parts.push(`${metadata.children} kid${metadata.children === 1 ? '' : 's'}`)
  if (metadata.infants) parts.push(`${metadata.infants} infant${metadata.infants === 1 ? '' : 's'}`)
  return parts.join(' · ') || 'travelers'
}

interface StatProps {
  label: string
  value: string | number
  sub: string
}

function Stat({ label, value, sub }: StatProps) {
  return (
    <div className="bg-[#fafaf7] dark:bg-white/[0.02] rounded-xl p-3">
      <div className="text-[9px] uppercase tracking-[0.1em] font-semibold text-gray-400 mb-1">{label}</div>
      <div className="font-serif text-[22px] font-normal text-gray-900 dark:text-white leading-tight tabular-nums">{value}</div>
      <div className="text-[10px] text-gray-400 mt-1">{sub}</div>
    </div>
  )
}

export function PackingGlance({ trip, packed, total, percent }: PackingGlanceProps) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ctx = (trip?.trip_context as any) ?? {}
  const days = daysUntil(trip?.start_date)
  const temp = avgTemp(ctx.weather?.forecast)
  const travelersMeta = ctx.travelers as TravelerMetadata | undefined

  return (
    <div className="grid grid-cols-2 gap-2.5">
      <Stat label="Days left" value={days?.value ?? '—'} sub={days?.label ?? 'no dates'} />
      <Stat label="Avg temp" value={temp.value} sub={temp.label} />
      <Stat label="Packed" value={`${packed}/${total}`} sub={`${percent}%`} />
      <Stat label="Travelers" value={trip?.travelers ?? 1} sub={travelerSub(travelersMeta)} />
    </div>
  )
}
