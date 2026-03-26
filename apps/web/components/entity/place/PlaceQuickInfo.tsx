import type { PlaceItem } from '@travyl/shared'
import { Clock, Phone, Globe, Wallet } from 'iconoir-react'
import { EntitySection } from '../EntitySection'
import { EntityQuickInfo } from '../EntityQuickInfo'

interface Props {
  place: PlaceItem
}

function getHostname(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}

function priceLevelLabel(level: 1 | 2 | 3 | 4): string {
  const labels: Record<number, string> = {
    1: 'Budget-friendly ($)',
    2: 'Moderate ($$)',
    3: 'Upscale ($$$)',
    4: 'Luxury ($$$$)',
  }
  return labels[level] ?? '$'.repeat(level)
}

export function PlaceQuickInfo({ place }: Props) {
  const items = [
    place.hours
      ? {
          icon: <Clock className="w-4 h-4" />,
          label: 'Hours',
          value: place.hours,
        }
      : null,
    place.priceLevel != null
      ? {
          icon: <Wallet className="w-4 h-4" />,
          label: 'Price Level',
          value: priceLevelLabel(place.priceLevel),
        }
      : null,
    place.phone
      ? {
          icon: <Phone className="w-4 h-4" />,
          label: 'Phone',
          value: place.phone,
          href: `tel:${place.phone}`,
        }
      : null,
    place.website
      ? {
          icon: <Globe className="w-4 h-4" />,
          label: 'Website',
          value: getHostname(place.website),
          href: place.website,
        }
      : null,
    place.duration
      ? {
          icon: <Clock className="w-4 h-4" />,
          label: 'Typical Visit',
          value: place.duration,
        }
      : null,
    place.admissionFee
      ? {
          icon: <Wallet className="w-4 h-4" />,
          label: 'Admission',
          value: place.admissionFee,
        }
      : null,
  ].filter(Boolean) as { icon: React.ReactNode; label: string; value: string; href?: string }[]

  if (items.length === 0) return null

  return (
    <EntitySection title="Quick Info">
      <EntityQuickInfo items={items} />
    </EntitySection>
  )
}
