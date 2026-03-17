'use client'

import { use } from 'react'
import { useAuthStore } from '@travyl/shared'
import { YjsTripProvider } from '@/components/calendar/providers/YjsTripProvider'
import { CalendarDashboard } from '@/components/calendar/CalendarDashboard'

export default function TripPage(props: { params: Promise<{ id: string }> }) {
  const { id: tripId } = use(props.params)
  const user = useAuthStore((s) => s.user)
  const loading = useAuthStore((s) => s.loading)

  if (loading) return null
  if (!user) return <div>Please sign in to view this trip.</div>

  const userId = user.id
  const userName = user.user_metadata?.display_name ?? user.email ?? 'Anonymous'

  return (
    <YjsTripProvider tripId={tripId}>
      <CalendarDashboard tripId={tripId} userId={userId} userName={userName} />
    </YjsTripProvider>
  )
}
