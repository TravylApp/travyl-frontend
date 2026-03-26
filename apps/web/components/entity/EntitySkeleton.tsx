export function EntitySkeleton() {
  return (
    <div className="animate-pulse">
      {/* Hero placeholder */}
      <div className="w-full aspect-[4/3] md:aspect-[16/9] bg-gray-200" />

      {/* Breadcrumb placeholder */}
      <div className="px-6 md:px-10 py-3 flex items-center gap-2">
        <div className="h-3 w-16 bg-gray-200 rounded" />
        <div className="h-3 w-3 bg-gray-200 rounded" />
        <div className="h-3 w-24 bg-gray-200 rounded" />
      </div>

      {/* Actions bar placeholder */}
      <div className="px-6 md:px-10 py-4 border-b border-gray-100 flex items-center gap-3">
        <div className="h-10 w-32 bg-gray-200 rounded-xl" />
        <div className="h-10 w-10 bg-gray-200 rounded-xl" />
        <div className="h-10 w-10 bg-gray-200 rounded-xl" />
      </div>

      {/* Quick info placeholder */}
      <div className="px-6 md:px-10 py-6 border-b border-gray-100">
        <div className="h-6 w-40 bg-gray-200 rounded mb-4" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="flex items-start gap-3">
              <div className="w-8 h-8 bg-gray-200 rounded-lg flex-shrink-0" />
              <div className="flex-1">
                <div className="h-2.5 w-16 bg-gray-200 rounded mb-1.5" />
                <div className="h-3.5 w-32 bg-gray-200 rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Description section placeholder */}
      <div className="px-6 md:px-10 py-6 border-b border-gray-100">
        <div className="h-6 w-36 bg-gray-200 rounded mb-4" />
        <div className="space-y-2">
          <div className="h-3 bg-gray-200 rounded w-full" />
          <div className="h-3 bg-gray-200 rounded w-full" />
          <div className="h-3 bg-gray-200 rounded w-5/6" />
          <div className="h-3 bg-gray-200 rounded w-4/6" />
        </div>
      </div>

      {/* Map placeholder */}
      <div className="px-6 md:px-10 py-6">
        <div className="h-6 w-28 bg-gray-200 rounded mb-4" />
        <div className="h-64 md:h-80 bg-gray-200 rounded-xl" />
      </div>
    </div>
  )
}
