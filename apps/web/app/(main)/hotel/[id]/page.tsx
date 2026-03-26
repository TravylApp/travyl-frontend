import type { Metadata } from 'next'
import { HotelDetailClient } from './HotelDetailClient'

interface Props {
  params: Promise<{ id: string }>
}

interface HotelApiResponse {
  id: string
  name: string
  description?: string | null
  image_url?: string | null
  images?: string[]
  city?: string | null
  [key: string]: unknown
}

async function fetchHotel(id: string): Promise<HotelApiResponse | null> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  try {
    const res = await fetch(`${baseUrl}/api/hotels/${encodeURIComponent(id)}`, {
      next: { revalidate: 3600 },
    })
    if (!res.ok) return null
    return res.json() as Promise<HotelApiResponse>
  } catch {
    return null
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const hotel = await fetchHotel(id)

  if (!hotel) {
    return {
      title: 'Hotel Not Found | Travyl',
      description: 'This hotel could not be found.',
    }
  }

  const description = hotel.description
    ? hotel.description.slice(0, 160)
    : `Discover ${hotel.name} on Travyl.`

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  const canonicalUrl = `${baseUrl}/hotel/${id}`
  const ogImage = hotel.image_url ?? hotel.images?.[0] ?? null

  return {
    title: `${hotel.name} | Travyl`,
    description,
    openGraph: {
      title: hotel.name,
      description,
      url: canonicalUrl,
      type: 'website',
      ...(ogImage ? { images: [{ url: ogImage, width: 600, height: 400, alt: hotel.name }] } : {}),
    },
    alternates: {
      canonical: canonicalUrl,
    },
  }
}

export default async function HotelDetailPage({ params }: Props) {
  const { id } = await params
  const hotel = await fetchHotel(id)
  return <HotelDetailClient hotel={hotel} />
}
