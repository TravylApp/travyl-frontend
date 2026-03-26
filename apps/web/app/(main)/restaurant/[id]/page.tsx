import type { Metadata } from 'next'
import { RestaurantDetailClient } from './RestaurantDetailClient'

interface Props {
  params: Promise<{ id: string }>
}

async function fetchRestaurant(id: string) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  try {
    const res = await fetch(`${baseUrl}/api/restaurants/${encodeURIComponent(id)}`, {
      next: { revalidate: 3600 },
    })
    if (!res.ok) return null
    return res.json()
  } catch {
    return null
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const restaurant = await fetchRestaurant(id)

  if (!restaurant) {
    return { title: 'Restaurant Not Found | Travyl' }
  }

  return {
    title: `${restaurant.name} | Travyl`,
    description: restaurant.description ?? `View details about ${restaurant.name} on Travyl.`,
    openGraph: {
      title: restaurant.name,
      description: restaurant.description ?? '',
      images: restaurant.image_url ? [{ url: restaurant.image_url }] : [],
    },
  }
}

export default async function RestaurantPage({ params }: Props) {
  const { id } = await params
  const restaurant = await fetchRestaurant(id)

  return <RestaurantDetailClient restaurant={restaurant} id={id} />
}
