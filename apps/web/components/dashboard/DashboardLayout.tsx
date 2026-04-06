'use client'

// DashboardNavBar is available at @/components/dashboard/DashboardNavBar
// for future use as a secondary nav on dashboard list pages.

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col min-h-screen bg-white dark:bg-[var(--background)]" style={{ paddingTop: 48 }}>
      <main className="flex-1">
        {children}
      </main>
    </div>
  )
}
