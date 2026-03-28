'use client'

import { usePathname } from 'next/navigation'
import { DashboardNavBar } from '@/components/dashboard/DashboardNavBar'

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const tripMatch = pathname.match(/^\/trip\/([^/]+)/)
  const isInsideTrip = !!(tripMatch && tripMatch[1] !== 'preview')

  if (isInsideTrip) {
    // Trip detail pages: no navbar — TripTabs handles navigation (vertical sidebar on
    // desktop, fixed bottom bar on mobile)
    return (
      <div className="flex h-screen overflow-hidden bg-white dark:bg-[var(--background)]">
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    )
  }

  // Dashboard list pages (/trips, /explore, /places): horizontal top navbar
  return (
    <div className="flex flex-col h-screen overflow-hidden bg-white dark:bg-[var(--background)]">
      <DashboardNavBar />
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  )
}
