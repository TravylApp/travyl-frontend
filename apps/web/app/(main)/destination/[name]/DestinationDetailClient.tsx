'use client'

import type { DestinationDetail } from '@travyl/shared'
import { EntityBreadcrumb } from '@/components/entity/EntityBreadcrumb'
import { EntityHero } from '@/components/entity/EntityHero'
import { EntityActionsBar } from '@/components/entity/EntityActionsBar'
import { EntityMap } from '@/components/entity/EntityMap'
import { EntityError } from '@/components/entity/EntityError'
import { DestinationOverview } from '@/components/entity/destination/DestinationOverview'
import { DestinationQuickFacts } from '@/components/entity/destination/DestinationQuickFacts'
import { DestinationTrips } from '@/components/entity/destination/DestinationTrips'
import { DestinationTopPlaces } from '@/components/entity/destination/DestinationTopPlaces'
import { DestinationTopActivities } from '@/components/entity/destination/DestinationTopActivities'
import { DestinationWhereToStay } from '@/components/entity/destination/DestinationWhereToStay'

interface Props {
  destination: DestinationDetail | null
}

export function DestinationDetailClient({ destination }: Props) {
  if (!destination) {
    return <EntityError type="destination" variant="404" />
  }

  const images = [
    destination.image,
    ...(destination.images ?? []),
  ].filter(Boolean) as string[]

  const overline = destination.country
    ? `DESTINATION · ${destination.country}`
    : 'DESTINATION'

  return (
    <div className="min-h-screen bg-white">
      <EntityBreadcrumb
        items={[{ label: 'Explore', href: '/' }]}
        current={destination.name}
      />

      <EntityHero
        images={images}
        title={destination.name}
        overline={overline}
        fallbackGradient="from-[#1e3a5f] to-[#0f2d4a]"
      />

      <EntityActionsBar
        entityId={destination.name.toLowerCase().replace(/\s+/g, '-')}
        entityType="destination"
        entityName={destination.name}
        variant="destination"
      />

      <DestinationOverview
        description={destination.description}
        tags={destination.tags}
      />

      <DestinationQuickFacts
        country={destination.country}
        language={destination.language}
        currency={destination.currency}
        timezone={destination.timezone}
        bestTimeToVisit={destination.bestTimeToVisit}
        budgetLevel={destination.budgetLevel}
      />

      <DestinationTrips destinationName={destination.name} />

      <DestinationTopPlaces
        destinationName={destination.name}
        latitude={destination.latitude}
        longitude={destination.longitude}
      />

      <DestinationTopActivities destinationName={destination.name} />

      <DestinationWhereToStay
        destinationName={destination.name}
        latitude={destination.latitude}
        longitude={destination.longitude}
      />

      <EntityMap
        latitude={destination.latitude}
        longitude={destination.longitude}
        name={destination.name}
      />
    </div>
  )
}
