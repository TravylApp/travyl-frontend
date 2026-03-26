import Image from 'next/image'
import { EntitySection } from '../EntitySection'
import type { RoomType } from '@travyl/shared'

interface Props {
  rooms?: RoomType[]
  currency?: string | null
}

export function HotelRooms({ rooms, currency }: Props) {
  if (!rooms || rooms.length === 0) return null

  const currencySymbol = currency ?? 'USD'

  return (
    <EntitySection title="Rooms">
      <div className="space-y-4">
        {rooms.map((room, i) => (
          <div
            key={i}
            className="rounded-xl border border-gray-200 overflow-hidden flex flex-col sm:flex-row"
          >
            {/* Room image */}
            {room.image && (
              <div className="relative w-full sm:w-48 h-48 sm:h-auto flex-shrink-0">
                <Image
                  src={room.image}
                  alt={room.type}
                  fill
                  className="object-cover"
                  sizes="(max-width: 640px) 100vw, 192px"
                />
              </div>
            )}

            {/* Room details */}
            <div className="p-4 flex-1 flex flex-col justify-between gap-3">
              <div>
                <h3 className="text-base font-semibold text-gray-900 mb-1">{room.type}</h3>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-500">
                  {room.beds && <span>{room.beds}</span>}
                  {room.size && <span>{room.size}</span>}
                  {room.guests > 0 && <span>Up to {room.guests} guests</span>}
                </div>
              </div>

              {/* Amenity chips */}
              {room.amenities && room.amenities.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {room.amenities.map((a, j) => (
                    <span
                      key={j}
                      className="rounded-full bg-gray-100 text-gray-600 text-xs font-medium px-2.5 py-0.5"
                    >
                      {a}
                    </span>
                  ))}
                </div>
              )}

              {/* Price */}
              {room.price > 0 && (
                <p className="text-sm font-semibold text-[#1e3a5f]">
                  {currencySymbol} {room.price.toLocaleString()}
                  <span className="text-gray-400 font-normal"> / night</span>
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </EntitySection>
  )
}
