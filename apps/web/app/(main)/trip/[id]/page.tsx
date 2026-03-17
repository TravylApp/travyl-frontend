import { CalendarDashboard } from '@/components/calendar/CalendarDashboard'

export default function TripPage(_props: { params: Promise<{ id: string }> }) {
  return <CalendarDashboard />
}
