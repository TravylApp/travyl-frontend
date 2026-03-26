import { Suspense } from 'react'
import DashboardNavbar from '@/components/DashboardNavbar'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Suspense>
        <DashboardNavbar />
      </Suspense>
      <main className="pt-14 bg-background text-foreground">{children}</main>
    </>
  )
}
