'use client'

import { EntityHero } from '@/components/entity/EntityHero'
import { EntityActionsBar } from '@/components/entity/EntityActionsBar'
import { EntityBreadcrumb } from '@/components/entity/EntityBreadcrumb'
import { EntityMap } from '@/components/entity/EntityMap'
import { EntityError } from '@/components/entity/EntityError'
import { EntitySection } from '@/components/entity/EntitySection'
import { EntityQuickInfo } from '@/components/entity/EntityQuickInfo'
import { EntityTagList } from '@/components/entity/EntityTagList'

interface RestaurantApiResponse {
  id: string
  name: string
  address?: string | null
  city?: string | null
  region?: string | null
  country?: string | null
  latitude?: number | null
  longitude?: number | null
  rating?: number | null
  phone?: string | null
  website?: string | null
  menuUrl?: string | null
  description?: string | null
  images?: string[]
  image_url?: string | null
  categories?: string[]
  hours?: string | null
  openNow?: boolean | null
  price?: number | null
  reviewCount?: number | null
}

interface Props {
  restaurant: RestaurantApiResponse | null
  id: string
}

export function RestaurantDetailClient({ restaurant, id }: Props) {
  if (!restaurant) {
    return <EntityError message="Restaurant not found" backHref="/" backLabel="Go home" />
  }

  const location = [restaurant.city, restaurant.region, restaurant.country].filter(Boolean).join(', ')
  const priceLabel = restaurant.price ? '$'.repeat(Math.max(1, Math.min(restaurant.price, 4))) : null

  const quickInfoItems = [
    restaurant.hours ? { label: 'Hours', value: restaurant.hours } : null,
    restaurant.phone ? { label: 'Phone', value: restaurant.phone } : null,
    restaurant.address ? { label: 'Address', value: restaurant.address } : null,
    priceLabel ? { label: 'Price', value: priceLabel } : null,
  ].filter(Boolean) as { label: string; value: string }[]

  const links = [
    restaurant.website ? { label: 'Website', href: restaurant.website } : null,
    restaurant.menuUrl ? { label: 'Menu', href: restaurant.menuUrl } : null,
  ].filter(Boolean) as { label: string; href: string }[]

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950">
      <EntityBreadcrumb
        crumbs={[
          { label: 'Home', href: '/' },
          ...(restaurant.city ? [{ label: restaurant.city, href: `/destination/${encodeURIComponent(restaurant.city)}` }] : []),
          { label: restaurant.name },
        ]}
      />

      <EntityHero
        name={restaurant.name}
        subtitle={location}
        images={restaurant.images ?? (restaurant.image_url ? [restaurant.image_url] : [])}
        rating={restaurant.rating ?? undefined}
        reviewCount={restaurant.reviewCount ?? undefined}
        badge={priceLabel ?? undefined}
      />

      <EntityActionsBar
        name={restaurant.name}
        links={links}
        entityId={id}
        entityType="restaurant"
      />

      <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
        {restaurant.description && (
          <EntitySection title="About">
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed">{restaurant.description}</p>
          </EntitySection>
        )}

        {quickInfoItems.length > 0 && (
          <EntitySection title="Details">
            <EntityQuickInfo items={quickInfoItems} />
          </EntitySection>
        )}

        {restaurant.categories && restaurant.categories.length > 0 && (
          <EntitySection title="Cuisine">
            <EntityTagList tags={restaurant.categories} />
          </EntitySection>
        )}

        {restaurant.latitude && restaurant.longitude && (
          <EntitySection title="Location">
            <EntityMap
              latitude={restaurant.latitude}
              longitude={restaurant.longitude}
              name={restaurant.name}
            />
          </EntitySection>
        )}
      </div>
    </div>
  )
}
