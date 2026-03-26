import type { Metadata } from 'next'
import type { DestinationDetail } from '@travyl/shared'
import { DestinationDetailClient } from './DestinationDetailClient'

interface Props {
  params: Promise<{ name: string }>
}

async function fetchDestination(name: string): Promise<DestinationDetail | null> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  try {
    const res = await fetch(
      `${baseUrl}/api/destinations/${encodeURIComponent(name)}`,
      { next: { revalidate: 3600 } }
    )
    if (!res.ok) return null
    return res.json() as Promise<DestinationDetail>
  } catch {
    return null
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { name } = await params
  const destination = await fetchDestination(name)

  const displayName = destination?.name ?? decodeURIComponent(name).replace(/-/g, ' ')

  if (!destination) {
    return {
      title: `${displayName} | Travyl`,
      description: `Explore ${displayName} — discover top attractions, activities, and travel tips.`,
    }
  }

  const title = destination.country
    ? `${destination.name}, ${destination.country} | Travyl`
    : `${destination.name} | Travyl`

  const description = destination.description
    ? destination.description.slice(0, 160)
    : `Explore ${destination.name} — discover top attractions, activities, and travel tips.`

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  const canonicalUrl = `${baseUrl}/destination/${encodeURIComponent(name)}`

  return {
    title,
    description,
    openGraph: {
      title: destination.name,
      description,
      url: canonicalUrl,
      type: 'website',
      ...(destination.image
        ? { images: [{ url: destination.image, width: 1200, height: 630, alt: destination.name }] }
        : {}),
    },
    alternates: {
      canonical: canonicalUrl,
    },
  }
}

export default async function DestinationPage({ params }: Props) {
  const { name } = await params
  const destination = await fetchDestination(name)
  return <DestinationDetailClient destination={destination} />
}
