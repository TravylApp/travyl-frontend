export function BudgetSkeleton() {
  return (
    <div className="space-y-6">
      {/* Summary strip skeleton */}
      <div className="flex items-start gap-8">
        {[1, 2, 3].map((i) => (
          <div key={i} className="space-y-1.5">
            <div className="h-8 w-20 bg-gray-100 animate-pulse rounded" />
            <div className="h-3 w-16 bg-gray-100 animate-pulse rounded" />
          </div>
        ))}
      </div>

      <div className="h-[1px] bg-gray-100" />

      {/* Two-column layout skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Donut skeleton */}
        <div className="flex items-center justify-center">
          <div className="w-[200px] h-[200px] rounded-full border-[28px] border-gray-100 animate-pulse" />
        </div>

        {/* Category list skeleton */}
        <div className="space-y-4 py-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="w-2.5 h-2.5 rounded-full bg-gray-100 animate-pulse" />
              <div className="h-4 bg-gray-100 animate-pulse rounded" style={{ width: `${60 + i * 8}%` }} />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
