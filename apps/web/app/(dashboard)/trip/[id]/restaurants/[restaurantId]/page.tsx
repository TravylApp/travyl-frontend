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
        <div className="h-4 w-32 bg-gray-200 dark:bg-white/[0.06] rounded mb-4" />
        <div className="h-8 w-2/3 bg-gray-200 dark:bg-white/[0.06] rounded mb-3" />
        <div className="h-5 w-20 bg-gray-200 dark:bg-white/[0.06] rounded mb-2" />
        <div className="h-4 w-1/3 bg-gray-200 dark:bg-white/[0.06] rounded mb-6" />
        <div className="h-px bg-gray-100 dark:bg-white/[0.06] mb-4" />
        <div className="h-4 w-40 bg-gray-200 dark:bg-white/[0.06] rounded mb-3" />
        <div className="h-4 w-56 bg-gray-200 dark:bg-white/[0.06] rounded mb-6" />
        <div className="h-px bg-gray-100 dark:bg-white/[0.06] mb-4" />
        <div className="h-4 w-36 bg-gray-200 dark:bg-white/[0.06] rounded mb-3" />
        <div className="h-4 w-48 bg-gray-200 dark:bg-white/[0.06] rounded" />
      </div>
    )
  }

  const result = findActivity(days, restaurantId)

  if (!result) {
    return (
      <div className="max-w-3xl mx-auto py-6">
        <EntityBreadcrumb
          items={[{ label: 'Trip', href: `/trip/${tripId}` }]}
          current="Restaurant not found"
        />
        <p className="text-gray-500 dark:text-gray-400 px-6 py-4">Restaurant not found.</p>
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
    <div className="max-w-3xl mx-auto pb-24">
      <EntityBreadcrumb
        items={[{ label: 'Trip', href: `/trip/${tripId}` }, { label: 'Restaurants', href: `/trip/${tripId}/restaurants` }]}
        current={activity.name}
      />

      <EntityActionsBar
        entityId={restaurantId}
        entityType="place"
        entityName={activity.name}
      />

      {/* Overview */}
      <div className="px-6 md:px-10 py-6 border-b border-gray-100 dark:border-white/[0.06]">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white mb-3">
          {activity.name}
        </h1>

        <div className="flex flex-wrap items-center gap-3">
          {/* Category badge */}
          <span
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold text-white bg-violet-500"
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
        <EntityMap
          latitude={activity.latitude!}
          longitude={activity.longitude!}
          address={activity.location_name}
          name={activity.name}
        />
      )}
    </div>
  )
}
