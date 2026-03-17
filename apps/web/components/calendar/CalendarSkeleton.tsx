'use client'

export function CalendarSkeleton() {
  // Rendered outside CalendarDashboard — read localStorage directly for initial theme
  const isDark =
    typeof window !== 'undefined' &&
    localStorage.getItem('travyl-calendar-theme') === 'dark'

  return (
    <div
      className={
        'flex h-screen overflow-hidden animate-pulse bg-gray-50 dark:bg-[#0a1520]' +
        (isDark ? ' dark' : '')
      }
    >
      {/* Sidebar placeholder */}
      <div className="w-60 flex-shrink-0 bg-white dark:bg-[#0f1a28] border-r border-gray-200 dark:border-[#1e3a5f]/30" />

      {/* Main column */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        {/* Header placeholder */}
        <div className="h-14 bg-white dark:bg-[#0f1a28] border-b border-gray-200 dark:border-[#1e3a5f]/30 flex items-center px-4 gap-4">
          <div className="h-5 w-40 rounded bg-gray-200 dark:bg-[#1e3a5f]/40" />
          <div className="ml-auto h-5 w-24 rounded bg-gray-200 dark:bg-[#1e3a5f]/40" />
        </div>

        {/* All-day row placeholder */}
        <div className="h-10 bg-gray-50 dark:bg-[#0a1520] border-b border-gray-200 dark:border-[#1e3a5f]/30" />

        {/* Grid placeholder — 5 columns */}
        <div className="flex flex-1 min-h-0 overflow-hidden">
          {/* Time gutter placeholder */}
          <div className="w-16 flex-shrink-0 bg-gray-50 dark:bg-[#0a1520] border-r border-gray-200 dark:border-[#1e3a5f]/30" />

          {/* Day columns */}
          <div className="flex flex-1 min-w-0">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="flex flex-col flex-1 min-w-0 border-l border-gray-200 dark:border-[#1e3a5f]/30"
              >
                {/* Column header */}
                <div className="h-7 border-b border-gray-200 dark:border-[#1e3a5f]/30 flex items-center justify-center">
                  <div className="h-3 w-16 rounded bg-gray-200 dark:bg-[#1e3a5f]/40" />
                </div>

                {/* Event placeholders */}
                <div className="relative flex-1 p-1 space-y-2">
                  <div
                    className="rounded bg-gray-200 dark:bg-[#1e3a5f]/40 mx-1"
                    style={{ height: 48, marginTop: 60 }}
                  />
                  <div
                    className="rounded bg-gray-200 dark:bg-[#1e3a5f]/40 mx-1"
                    style={{ height: 36, marginTop: 20 }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
