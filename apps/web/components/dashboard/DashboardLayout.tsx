'use client'

import { usePathname } from 'next/navigation'

// DashboardNavBar is available at @/components/dashboard/DashboardNavBar
// for future use as a secondary nav on dashboard list pages.

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  // Trip pages hide GlobalNavbar — no padding needed
  const isTripRoute = pathname.startsWith('/trip/')

  return (
    <div className="flex flex-col min-h-screen bg-white dark:bg-background" style={{ paddingTop: isTripRoute ? 0 : 48 }}>
      <main className="flex-1">
        {children}
      </main>
    </div>
  )
}
