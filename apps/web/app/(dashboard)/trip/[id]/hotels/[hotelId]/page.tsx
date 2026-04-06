'use client'

import { use } from 'react'
import { Star, MapPin, Calendar, CreditCard, Hash } from 'lucide-react'
import { useHotels } from '@travyl/shared'
import { EntityBreadcrumb } from '@/components/entity/EntityBreadcrumb'
import { EntityHero } from '@/components/entity/EntityHero'
import { EntitySection } from '@/components/entity/EntitySection'
import { EntityMap } from '@/components/entity/EntityMap'
import { EntityActionsBar } from '@/components/entity/EntityActionsBar'

export default function HotelDetailPage({
  params,
}: {
  params: Promise<{ id: string; hotelId: string }>
}) {
  const { id: tripId, hotelId } = use(params)
  const { data: hotels, isLoading } = useHotels(tripId)

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-6 pb-24 animate-pulse">
        <div className="h-4 w-32 bg-gray-200 dark:bg-white/[0.06] rounded mb-4" />
        <div className="w-full h-[280px] bg-gray-200 dark:bg-white/[0.06] rounded-xl mb-6" />
        <div className="h-7 w-2/3 bg-gray-200 dark:bg-white/[0.06] rounded mb-3" />
        <div className="h-4 w-1/3 bg-gray-200 dark:bg-white/[0.06] rounded mb-2" />
        <div className="h-4 w-1/2 bg-gray-200 dark:bg-white/[0.06] rounded mb-6" />
        <div className="h-px bg-gray-100 dark:bg-white/[0.06] mb-4" />
        <div className="h-4 w-40 bg-gray-200 dark:bg-white/[0.06] rounded mb-3" />
        <div className="h-4 w-56 bg-gray-200 dark:bg-white/[0.06] rounded mb-6" />
        <div className="h-px bg-gray-100 dark:bg-white/[0.06] mb-4" />
        <div className="h-4 w-36 bg-gray-200 dark:bg-white/[0.06] rounded mb-3" />
        <div className="h-4 w-48 bg-gray-200 dark:bg-white/[0.06] rounded" />
      </div>
    )
  }

  const hotel = hotels?.find((h) => h.id === hotelId)

  if (!hotel) {
    return (
      <div className="max-w-3xl mx-auto py-6">
        <EntityBreadcrumb
          items={[{ label: 'Trip', href: `/trip/${tripId}` }]}
          current="Hotel not found"
        />
        <p className="text-gray-500 dark:text-gray-400 px-6 py-4">Hotel not found.</p>
      </div>
    )
  }

  const data = hotel.data

  const images = data.image_url ? [data.image_url] : []

  const checkInDate = new Date(data.check_in)
  const checkOutDate = new Date(data.check_out)
  const nights = Math.round(
    (checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24)
  )

  const hasCoordinates =
    data.latitude !== null && data.longitude !== null

  return (
    <div className="max-w-3xl mx-auto pb-24">
      <EntityBreadcrumb
        items={[{ label: 'Trip', href: `/trip/${tripId}` }, { label: 'Hotels', href: `/trip/${tripId}/hotels` }]}
        current={data.name}
      />

      <EntityHero
        images={images}
        title={data.name}
        overline="Hotel"
        rating={data.rating ?? null}
      />

      <EntityActionsBar
        entityId={hotelId}
        entityType="hotel"
        entityName={data.name}
      />

      {/* Overview */}
      <div className="px-6 md:px-10 py-6 border-b border-gray-100 dark:border-white/[0.06]">
        {data.star_rating !== null && (
          <div className="flex items-center gap-0.5 mb-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star
                key={i}
                className={`w-4 h-4 ${
                  i < data.star_rating!
                    ? 'fill-yellow-400 text-yellow-400'
                    : 'text-gray-300 dark:text-gray-600'
                }`}
              />
            ))}
          </div>
        )}

        {data.address && (
          <div className="flex items-start gap-1.5 text-sm text-gray-500 dark:text-gray-400 mt-1">
            <MapPin className="w-4 h-4 mt-0.5 shrink-0" />
            <span>{data.address}</span>
          </div>
        )}
      </div>

      {/* Stay Details */}
      <EntitySection title="Stay Details">
        <div className="flex flex-col gap-3 text-sm text-gray-700 dark:text-gray-300">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-gray-400 shrink-0" />
            <div>
              <span className="font-medium">Check-in:</span>{' '}
              {checkInDate.toLocaleDateString()}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-gray-400 shrink-0" />
            <div>
              <span className="font-medium">Check-out:</span>{' '}
              {checkOutDate.toLocaleDateString()}
            </div>
          </div>
          <div className="text-gray-500 dark:text-gray-400 pl-6">
            {nights} {nights === 1 ? 'night' : 'nights'}
          </div>
        </div>
      </EntitySection>

      {/* Pricing */}
      {(data.price_per_night !== null || data.total_price !== null) && (
        <EntitySection title="Pricing">
          <div className="flex flex-col gap-3 text-sm text-gray-700 dark:text-gray-300">
            {data.price_per_night !== null && (
              <div className="flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-gray-400 shrink-0" />
                <div>
                  <span className="font-medium">Per night:</span>{' '}
                  {data.currency ?? ''} {data.price_per_night.toFixed(2)}
                </div>
              </div>
            )}
            {data.total_price !== null && (
              <div className="flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-gray-400 shrink-0" />
                <div>
                  <span className="font-medium">Total:</span>{' '}
                  {data.currency ?? ''} {data.total_price.toFixed(2)}
                </div>
              </div>
            )}
          </div>
        </EntitySection>
      )}

      {/* Booking */}
      {data.booking_ref && (
        <EntitySection title="Booking">
          <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
            <Hash className="w-4 h-4 text-gray-400 shrink-0" />
            <span className="font-medium">Reference:</span>
            <span className="font-mono">{data.booking_ref}</span>
          </div>
        </EntitySection>
      )}

      {/* Location */}
      {hasCoordinates && (
        <EntityMap
          latitude={data.latitude!}
          longitude={data.longitude!}
          address={data.address ?? null}
          name={data.name}
        />
      )}
    </div>
  )
}
