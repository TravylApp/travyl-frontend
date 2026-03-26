'use client'

import type { PlaceItem } from '@travyl/shared'
import { EntityBreadcrumb } from '@/components/entity/EntityBreadcrumb'
import { EntityHero } from '@/components/entity/EntityHero'
import { EntityActionsBar } from '@/components/entity/EntityActionsBar'
import { EntityTips } from '@/components/entity/EntityTips'
import { EntityAccessibility } from '@/components/entity/EntityAccessibility'
import { EntityMap } from '@/components/entity/EntityMap'
import { EntityError } from '@/components/entity/EntityError'
import { PlaceAbout } from '@/components/entity/place/PlaceAbout'
import { PlaceQuickInfo } from '@/components/entity/place/PlaceQuickInfo'

interface Props {
  place: PlaceItem | null
}

export function PlaceDetailClient({ place }: Props) {
  if (!place) {
    return <EntityError type="place" variant="404" />
  }

  // Normalize images: primary image + any extras, deduplicated and filtered
  const images = [place.image, ...(place.images ?? [])].filter(Boolean) as string[]

  // Build overline: CATEGORY · City
  const cityFromAddress = place.address
    ? place.address.split(',').slice(-2, -1)[0]?.trim() ?? null
    : null
  const overlineParts = [
    place.category ? place.category.toUpperCase() : null,
    cityFromAddress,
  ].filter(Boolean) as string[]
  const overline = overlineParts.join(' · ')

  return (
    <div className="min-h-screen bg-white">
      <EntityBreadcrumb
        items={[
          { label: 'Home', href: '/' },
          { label: 'Places', href: '/places' },
        ]}
        current={place.name}
      />

      <EntityHero
        images={images}
        title={place.name}
        overline={overline}
        rating={place.rating}
        reviewCount={place.reviewCount}
        priceLevel={place.priceLevel ?? null}
      />

      <EntityActionsBar
        entityId={place.id}
        entityType="place"
        entityName={place.name}
      />

      <PlaceAbout place={place} />

      <PlaceQuickInfo place={place} />

      <EntityTips tips={place.tips} />

      <EntityAccessibility items={place.accessibility} />

      {place.latitude != null && place.longitude != null && (
        <EntityMap
          latitude={place.latitude}
          longitude={place.longitude}
          address={place.address}
          name={place.name}
        />
      )}
    </div>
  )
}
