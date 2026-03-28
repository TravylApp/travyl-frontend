'use client'

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  // GlobalNavbar handles top navigation for all pages.
  // Trip detail pages have their own TripTabs for in-trip navigation.
  return (
    <div className="flex flex-col h-screen overflow-hidden bg-white dark:bg-[var(--background)]">
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  )
}
