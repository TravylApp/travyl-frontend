import { DashboardLayout } from '@/components/dashboard/DashboardLayout'

// Auth-gated routes must render per-request — never cache the SSR shell at
// the CDN, otherwise the first user's session-derived markup would be
// served to every subsequent visitor.
export const dynamic = 'force-dynamic'

export default function DashboardRouteLayout({ children }: { children: React.ReactNode }) {
  return <DashboardLayout>{children}</DashboardLayout>
}
