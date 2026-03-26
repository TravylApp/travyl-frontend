import type { Metadata } from 'next'
import type { ActivityDetail } from '@travyl/shared'
import { ActivityDetailClient } from './ActivityDetailClient'

interface Props {
  params: Promise<{ id: string }>
}

async function fetchActivity(id: string): Promise<ActivityDetail | null> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
    const res = await fetch(`${baseUrl}/api/activities/${encodeURIComponent(id)}`, {
      next: { revalidate: 3600 },
    })
    if (res.status === 404) return null
    if (!res.ok) return null
    const data = await res.json()
    return data.activity ?? null
  } catch {
    return null
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const activity = await fetchActivity(id)

  if (!activity) {
    return {
      title: 'Activity Not Found | Travyl',
    }
  }

  return {
    title: `${activity.name} | Travyl`,
    description: activity.description || `Discover ${activity.name} on Travyl.`,
    openGraph: {
      title: activity.name,
      description: activity.description || `Discover ${activity.name} on Travyl.`,
      images: activity.imageUrl ? [{ url: activity.imageUrl }] : [],
      type: 'website',
    },
    alternates: {
      canonical: `/activity/${id}`,
    },
  }
}

export default async function ActivityDetailPage({ params }: Props) {
  const { id } = await params
  const activity = await fetchActivity(id)

  return <ActivityDetailClient activity={activity} />
}
