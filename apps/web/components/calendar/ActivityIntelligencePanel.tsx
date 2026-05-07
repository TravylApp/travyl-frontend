'use client'
import { useState } from 'react'
import type { ReactNode } from 'react'
import Image from 'next/image'
import { MapPin, Clock, Cloud, Wallet, NavArrowDown, NavArrowRight } from 'iconoir-react'
import { useActivityIntelligence } from './hooks/useActivityIntelligence'
import { getWmoWeather } from './utils/wmoWeatherCode'
import type { CalendarActivity } from './types'

interface Props {
  activity: CalendarActivity
  tripId: string
}

function Section({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
  const [open, setOpen] = useState(true)
  return (
    <div className="border-t border-gray-100 dark:border-cal-border">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label={`${title} section`}
        className="w-full flex items-center gap-2 px-4 py-2.5 text-xs font-medium text-gray-500 dark:text-cal-text-secondary hover:bg-gray-50 dark:hover:bg-cal-accent-bg/60 transition-colors"
      >
        {icon}
        <span className="flex-1 text-left">{title}</span>
        {open ? <NavArrowDown className="w-3 h-3" /> : <NavArrowRight className="w-3 h-3" />}
      </button>
      {open && <div className="px-4 pb-3">{children}</div>}
    </div>
  )
}

export function ActivityIntelligencePanel({ activity, tripId }: Props) {
  const { data, isLoading, error } = useActivityIntelligence(activity.id, tripId)

  if (isLoading) {
    return (
      <div className="px-4 py-3 text-xs text-gray-400 dark:text-cal-text-secondary animate-pulse">
        Loading place info…
      </div>
    )
  }

  if (error || !data) return null

  const weather = data.weather
  const wmo = getWmoWeather(weather?.weatherCode ?? null)

  return (
    <div className="flex flex-col">
      {/* Place Info */}
      <Section icon={<MapPin className="w-3.5 h-3.5" />} title="Place Info">
        {data.place.photos[0] && (
          <div className="relative w-full h-28 rounded-lg overflow-hidden mb-2">
            <Image
              src={data.place.photos[0]}
              alt={data.place.name}
              fill
              className="object-cover"
              sizes="300px"
            />
          </div>
        )}
        <div className="space-y-0.5 text-xs text-gray-600 dark:text-cal-text">
          {data.place.rating && (
            <div className="flex items-center gap-1">
              <span className="text-amber-500">★</span>
              <span>{data.place.rating.toFixed(1)}</span>
              {data.place.priceTier && <span className="ml-1 text-gray-400">{data.place.priceTier}</span>}
            </div>
          )}
          {data.place.address && <div className="text-gray-500 dark:text-cal-text-secondary">{data.place.address}</div>}
          {data.place.openingHours && (
            <div className="mt-1 space-y-0.5">
              {data.place.openingHours.map((h) => (
                <div key={h.day} className="flex justify-between text-[11px]">
                  <span className="font-medium">{h.day.slice(0, 3)}</span>
                  <span>{h.opens}–{h.closes}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </Section>

      {/* Logistics */}
      <Section icon={<Clock className="w-3.5 h-3.5" />} title="Getting There">
        <p className="text-xs text-gray-600 dark:text-cal-text">
          {data.logistics.travelTimeMinutes !== null
            ? <>~{data.logistics.travelTimeMinutes} min drive from <span className="font-medium">{data.logistics.previousActivityName}</span> ({data.logistics.distanceKm?.toFixed(1) ?? '?'} km)</>
            : 'First activity of the day'}
        </p>
        {data.conflicts.travelTime && (
          <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">⚠ Not enough travel time</p>
        )}
      </Section>

      {/* Weather */}
      {weather && (
        <Section icon={<Cloud className="w-3.5 h-3.5" />} title="Weather">
          <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-cal-text">
            <span className="text-lg">{wmo.icon}</span>
            <div>
              <div className="font-medium">{wmo.label}</div>
              {weather.tempMaxC !== null && <div className="text-gray-400">{Math.round(weather.tempMaxC)}°C high · {weather.precipitationMm?.toFixed(1) ?? 0} mm rain</div>}
            </div>
          </div>
        </Section>
      )}

      {/* Budget Impact */}
      <Section icon={<Wallet className="w-3.5 h-3.5" />} title="Budget">
        <p className="text-xs text-gray-600 dark:text-cal-text">
          {activity.price
            ? `Estimated cost: ${activity.price}`
            : 'No cost estimate'}
        </p>
      </Section>
    </div>
  )
}
