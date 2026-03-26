import { MapPin, Wallet, Clock, Phone, Globe } from 'iconoir-react'
import { EntitySection } from '../EntitySection'
import { EntityQuickInfo } from '../EntityQuickInfo'

interface Props {
  address?: string | null
  pricePerNight?: number | null
  currency?: string | null
  checkIn?: string | null
  checkOut?: string | null
  phone?: string | null
  website?: string | null
}

function safeHostname(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}

export function HotelStayDetails({
  address,
  pricePerNight,
  currency,
  checkIn,
  checkOut,
  phone,
  website,
}: Props) {
  const currencySymbol = currency ?? 'USD'

  const checkInOutValue =
    checkIn && checkOut
      ? `Check-in: ${checkIn} · Check-out: ${checkOut}`
      : checkIn
      ? `Check-in: ${checkIn}`
      : checkOut
      ? `Check-out: ${checkOut}`
      : null

  const items = [
    address
      ? {
          icon: <MapPin className="w-4 h-4" />,
          label: 'Address',
          value: address,
        }
      : null,
    pricePerNight != null
      ? {
          icon: <Wallet className="w-4 h-4" />,
          label: 'Price per night',
          value: `${currencySymbol} ${pricePerNight.toLocaleString()}`,
        }
      : null,
    checkInOutValue
      ? {
          icon: <Clock className="w-4 h-4" />,
          label: 'Check-in / Check-out',
          value: checkInOutValue,
        }
      : null,
    phone
      ? {
          icon: <Phone className="w-4 h-4" />,
          label: 'Phone',
          value: phone,
          href: `tel:${phone}`,
        }
      : null,
    website
      ? {
          icon: <Globe className="w-4 h-4" />,
          label: 'Website',
          value: safeHostname(website),
          href: website,
        }
      : null,
  ].filter(Boolean) as {
    icon: React.ReactNode
    label: string
    value: string
    href?: string
  }[]

  if (!items.length) return null

  return (
    <EntitySection title="Stay Details">
      <EntityQuickInfo items={items} />
    </EntitySection>
  )
}
