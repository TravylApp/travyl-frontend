'use client'

import { EntityHero } from '@/components/entity/EntityHero'
import { EntityActionsBar } from '@/components/entity/EntityActionsBar'
import { EntityBreadcrumb } from '@/components/entity/EntityBreadcrumb'
import { EntityMap } from '@/components/entity/EntityMap'
import { EntityError } from '@/components/entity/EntityError'
import { HotelOverview } from '@/components/entity/hotel/HotelOverview'
import { HotelStayDetails } from '@/components/entity/hotel/HotelStayDetails'
import { HotelGuestRatings } from '@/components/entity/hotel/HotelGuestRatings'
import { HotelRooms } from '@/components/entity/hotel/HotelRooms'
import { HotelAmenities } from '@/components/entity/hotel/HotelAmenities'
import type { RoomType } from '@travyl/shared'

interface HotelApiResponse {
  id: string
  name: string
  address?: string | null
  city?: string | null
  region?: string | null
  country?: string | null
  latitude?: number | null
  longitude?: number | null
  rating?: number | null
  starRating?: number | null
  phone?: string | null
  website?: string | null
  description?: string | null
  images?: string[]
  image_url?: string | null
  categories?: string[]
  hours?: string | null
  price?: number | null
  reviewCount?: number | null
  // Optional rich data (not returned by Foursquare but may be present from other sources)
  pricePerNight?: number | null
  currency?: string | null
  checkIn?: string | null
  checkOut?: string | null
  rooms?: RoomType[]
  amenityGroups?: { category: string; items: string[] }[]
  guestRatingCategories?: { label: string; score: number }[]
}

interface Props {
  hotel: HotelApiResponse | null
}

export function HotelDetailClient({ hotel }: Props) {
  if (!hotel) {
    return <EntityError type="hotel" variant="404" />
  }

  const images = [hotel.image_url, ...(hotel.images ?? [])].filter(Boolean) as string[]
  const dedupedImages = [...new Set(images)]

  const overlineParts = [
    'HOTEL',
    hotel.starRating ? `${hotel.starRating}★` : null,
    hotel.city ?? hotel.region ?? null,
  ].filter(Boolean)
  const overline = overlineParts.join(' · ')

  return (
    <div className="min-h-screen bg-white">
      <EntityBreadcrumb
        items={[
          { label: 'Home', href: '/' },
          { label: 'Hotels', href: '/places' },
        ]}
        current={hotel.name}
      />

      <EntityHero
        images={dedupedImages}
        title={hotel.name}
        overline={overline}
        rating={hotel.rating}
        reviewCount={hotel.reviewCount ?? undefined}
        priceLevel={hotel.price}
      />

      <EntityActionsBar
        entityId={hotel.id}
        entityType="hotel"
        entityName={hotel.name}
      />

      <HotelOverview
        description={hotel.description}
        starRating={hotel.starRating}
        guestRating={hotel.rating}
        reviewCount={hotel.reviewCount}
        tags={hotel.categories}
      />

      <HotelStayDetails
        address={hotel.address}
        pricePerNight={hotel.pricePerNight ?? hotel.price ?? null}
        currency={hotel.currency}
        checkIn={hotel.checkIn}
        checkOut={hotel.checkOut}
        phone={hotel.phone}
        website={hotel.website}
      />

      {hotel.rating != null && (
        <HotelGuestRatings
          overall={hotel.rating}
          reviewCount={hotel.reviewCount}
          categories={hotel.guestRatingCategories}
        />
      )}

      <HotelRooms
        rooms={hotel.rooms}
        currency={hotel.currency}
      />

      <HotelAmenities groups={hotel.amenityGroups} />

      {hotel.latitude != null && hotel.longitude != null && (
        <EntityMap
          latitude={hotel.latitude}
          longitude={hotel.longitude}
          address={hotel.address}
          name={hotel.name}
        />
      )}
    </div>
  )
}
