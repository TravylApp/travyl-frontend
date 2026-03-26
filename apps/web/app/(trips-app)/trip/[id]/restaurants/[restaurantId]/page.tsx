'use client'

import { use } from 'react'
import { MapPin, Clock, UtensilsCrossed, DollarSign } from 'lucide-react'
import { useItineraryDays } from '@travyl/shared'
import type { Activity, ItineraryDayWithActivities } from '@travyl/shared'
import { EntityBreadcrumb } from '@/components/entity/EntityBreadcrumb'
import { EntitySection } from '@/components/entity/EntitySection'
import { EntityMap } from '@/components/entity/EntityMap'
import { EntityActionsBar } from '@/components/entity/EntityActionsBar'

function findActivity(
  days: ItineraryDayWithActivities[] | undefined,
  activityId: string,
): { activity: Activity; day: ItineraryDayWithActivities } | null {
  if (!days) return null
  for (const day of days) {
    const activity = day.activities.find((a) => a.id === activityId)
    if (activity) return { activity, day }
  }
  return null
}

export default function RestaurantDetailPage({
  params,
}: {
  params: Promise<{ id: string; restaurantId: string }>
}) {
  const { id: tripId, restaurantId } = use(params)
  const { data: days, isLoading } = useItineraryDays(tripId)

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-6 pb-24 animate-pulse">
        <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded mb-4" />
        <div className="h-8 w-2/3 bg-gray-200 dark:bg-gray-700 rounded mb-3" />
        <div className="h-5 w-20 bg-gray-200 dark:bg-gray-700 rounded mb-2" />
        <div className="h-4 w-1/3 bg-gray-200 dark:bg-gray-700 rounded mb-6" />
        <div className="h-px bg-gray-100 dark:bg-gray-800 mb-4" />
        <div className="h-4 w-40 bg-gray-200 dark:bg-gray-700 rounded mb-3" />
        <div className="h-4 w-56 bg-gray-200 dark:bg-gray-700 rounded mb-6" />
        <div className="h-px bg-gray-100 dark:bg-gray-800 mb-4" />
        <div className="h-4 w-36 bg-gray-200 dark:bg-gray-700 rounded mb-3" />
        <div className="h-4 w-48 bg-gray-200 dark:bg-gray-700 rounded" />
      </div>
    )
  }

  const result = findActivity(days, restaurantId)

  if (!result) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-6">
        <EntityBreadcrumb label="Restaurants" href={`/trip/${tripId}/restaurants`} />
        <p className="text-gray-500 dark:text-gray-400">Restaurant not found.</p>
      </div>
    )
  }

  const { activity, day } = result

  const hasCoordinates = activity.latitude !== null && activity.longitude !== null

  const formattedDate = day.date
    ? new Date(day.date).toLocaleDateString(undefined, {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : null

  const categoryLabel =
    activity.category.charAt(0).toUpperCase() + activity.category.slice(1)

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 pb-24">
      <EntityBreadcrumb label="Restaurants" href={`/trip/${tripId}/restaurants`} />

      {/* Overview */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-3">
          {activity.name}
        </h1>

        <div className="flex flex-wrap items-center gap-3">
          {/* Category badge */}
          <span
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold text-white"
            style={{ backgroundColor: '#8b5cf6' }}
          >
            <UtensilsCrossed className="w-3.5 h-3.5" />
            {categoryLabel}
          </span>

          {/* Cost */}
          {activity.estimated_cost !== null && (
            <span className="inline-flex items-center gap-1 text-sm text-gray-700 dark:text-gray-300">
              <DollarSign className="w-4 h-4 text-gray-400 shrink-0" />
              {activity.currency}
              {activity.estimated_cost.toFixed(2)}
            </span>
          )}
        </div>

        {/* Location */}
        {activity.location_name && (
          <div className="flex items-start gap-1.5 text-sm text-gray-500 dark:text-gray-400 mt-3">
            <MapPin className="w-4 h-4 mt-0.5 shrink-0" />
            <span>{activity.location_name}</span>
          </div>
        )}
      </div>

      {/* Notes */}
      {activity.notes && (
        <EntitySection title="Notes">
          <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
            {activity.notes}
          </p>
        </EntitySection>
      )}

      {/* Schedule */}
      <EntitySection title="Schedule">
        <div className="flex flex-col gap-3 text-sm text-gray-700 dark:text-gray-300">
          <div className="flex items-center gap-2">
            <UtensilsCrossed className="w-4 h-4 text-gray-400 shrink-0" />
            <span className="font-medium">Day {day.day_number}</span>
            {formattedDate && (
              <span className="text-gray-500 dark:text-gray-400">· {formattedDate}</span>
            )}
          </div>

          {(activity.start_time || activity.end_time) && (
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-gray-400 shrink-0" />
              <span>
                {activity.start_time ?? '—'}
                {activity.end_time && ` – ${activity.end_time}`}
              </span>
            </div>
          )}
        </div>
      </EntitySection>

      {/* Location map */}
      {hasCoordinates && (
        <EntitySection title="Location">
          <EntityMap
            latitude={activity.latitude!}
            longitude={activity.longitude!}
            label={activity.location_name ?? activity.name}
          />
        </EntitySection>
      )}

      <EntityActionsBar
        onEdit={() => {}}
        onRemove={() => {}}
      />
    </div>
  )
}
