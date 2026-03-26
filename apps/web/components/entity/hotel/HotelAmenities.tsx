import { EntitySection } from '../EntitySection'

interface AmenityGroup {
  category: string
  items: string[]
}

interface Props {
  groups?: AmenityGroup[]
}

export function HotelAmenities({ groups }: Props) {
  if (!groups || groups.length === 0) return null

  return (
    <EntitySection title="Amenities">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {groups.map((group, i) => (
          <div key={i}>
            <h3 className="text-sm font-semibold text-gray-900 mb-2">{group.category}</h3>
            <ul className="space-y-1.5">
              {group.items.map((item, j) => (
                <li key={j} className="flex items-start gap-2 text-sm text-gray-700">
                  <span
                    className="mt-1.5 w-1.5 h-1.5 rounded-full bg-[#003594] flex-shrink-0"
                    aria-hidden="true"
                  />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </EntitySection>
  )
}
