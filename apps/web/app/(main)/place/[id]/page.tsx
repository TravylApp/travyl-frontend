import type { Metadata } from 'next'
import type { PlaceItem } from '@travyl/shared'
import { PlaceDetailClient } from './PlaceDetailClient'

interface Props {
  params: Promise<{ id: string }>
}

async function fetchPlace(id: string): Promise<PlaceItem | null> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  try {
    const res = await fetch(`${baseUrl}/api/places/${encodeURIComponent(id)}`, {
      next: { revalidate: 3600 },
    })
    if (!res.ok) return null
    return res.json() as Promise<PlaceItem>
  } catch {
    return null
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const place = await fetchPlace(id)

  if (!place) {
    return {
      title: 'Place Not Found | Travyl',
      description: 'This place could not be found.',
    }
  }

  const description =
    place.description
      ? place.description.slice(0, 160)
      : place.tagline ?? `Discover ${place.name} on Travyl.`

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  const canonicalUrl = `${baseUrl}/place/${id}`

  return {
    title: `${place.name} | Travyl`,
    description,
    openGraph: {
      title: place.name,
      description,
      url: canonicalUrl,
      type: 'website',
      ...(place.image ? { images: [{ url: place.image, width: 600, height: 400, alt: place.name }] } : {}),
    },
    alternates: {
      canonical: canonicalUrl,
    },
  }
}

export default async function PlaceDetailPage({ params }: Props) {
  const { id } = await params
  const place = await fetchPlace(id)
  return <PlaceDetailClient place={place} />
}
