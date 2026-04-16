import { DashboardLayout } from '@/components/dashboard/DashboardLayout'

export default function DashboardRouteLayout({ children }: { children: React.ReactNode }) {
  return <DashboardLayout>{children}</DashboardLayout>
}
