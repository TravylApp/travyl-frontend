'use client'

export function CalendarSkeleton() {
  return (
    <div className="flex h-screen bg-cal-bg text-cal-text">
      {/* Sidebar skeleton */}
      <div className="w-14 border-r border-cal-border bg-cal-surface flex flex-col gap-1 p-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="w-10 h-10 rounded-lg bg-cal-border animate-pulse" />
        ))}
      </div>

      {/* Main area skeleton */}
      <div className="flex-1 flex flex-col">
        {/* Header skeleton */}
        <div className="h-14 border-b border-cal-border bg-cal-surface-elevated flex items-center gap-3 px-4">
          <div className="w-8 h-8 rounded-lg bg-cal-border animate-pulse" />
          <div className="w-32 h-4 rounded bg-cal-border animate-pulse" />
          <div className="w-24 h-8 rounded-lg bg-cal-border animate-pulse" />
          <div className="flex-1" />
          <div className="w-8 h-8 rounded-lg bg-cal-border animate-pulse" />
        </div>

        {/* Grid skeleton */}
        <div className="flex-1 flex">
          {/* Time gutter */}
          <div className="w-14 border-r border-cal-border flex flex-col pt-0">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="h-12 pr-3 flex items-start justify-end">
                <div className="w-6 h-3 rounded bg-cal-border animate-pulse" />
              </div>
            ))}
          </div>

          {/* Day columns */}
          <div className="flex-1 flex">
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="flex-1 border-r border-cal-border flex flex-col gap-2 p-2">
                {Array.from({ length: 3 }).map((_, j) => (
                  <div
                    key={j}
                    className="rounded-md bg-cal-border animate-pulse"
                    style={{ height: 40 + j * 20 }}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
