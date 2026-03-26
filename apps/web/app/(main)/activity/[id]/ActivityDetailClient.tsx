'use client'

import type { ActivityDetail } from '@travyl/shared'
import { EntityHero } from '@/components/entity/EntityHero'
import { EntityActionsBar } from '@/components/entity/EntityActionsBar'
import { EntityBreadcrumb } from '@/components/entity/EntityBreadcrumb'
import { EntityMap } from '@/components/entity/EntityMap'
import { EntityTips } from '@/components/entity/EntityTips'
import { EntityAccessibility } from '@/components/entity/EntityAccessibility'
import { EntityError } from '@/components/entity/EntityError'
import { ActivityAbout } from '@/components/entity/activity/ActivityAbout'
import { ActivityDetails } from '@/components/entity/activity/ActivityDetails'
import { ActivityInclusions } from '@/components/entity/activity/ActivityInclusions'

interface Props {
  activity: ActivityDetail | null
}

export function ActivityDetailClient({ activity }: Props) {
  if (!activity) {
    return <EntityError type="activity" variant="404" />
  }

  const images = [activity.imageUrl, ...(activity.imageUrls ?? [])].filter(Boolean) as string[]

  const city = activity.location?.split(',')[0]?.trim() ?? ''
  const overline = [activity.category.toUpperCase(), city].filter(Boolean).join(' · ')

  return (
    <div className="min-h-screen bg-white">
      <EntityBreadcrumb
        items={[
          { label: 'Home', href: '/' },
          { label: 'Activities', href: '/places' },
        ]}
        current={activity.name}
      />

      <EntityHero
        images={images}
        title={activity.name}
        overline={overline}
        rating={activity.rating}
      />

      <EntityActionsBar
        entityId={activity.id}
        entityType="activity"
        entityName={activity.name}
      />

      <ActivityAbout activity={activity} />

      <ActivityDetails activity={activity} />

      <ActivityInclusions
        included={activity.included}
        notIncluded={activity.notIncluded}
      />

      <EntityTips tips={activity.tips} />

      <EntityAccessibility items={activity.accessibility} />

      {activity.latitude !== 0 && activity.longitude !== 0 && (
        <EntityMap
          latitude={activity.latitude}
          longitude={activity.longitude}
          address={activity.address}
          name={activity.name}
        />
      )}
    </div>
  )
}
