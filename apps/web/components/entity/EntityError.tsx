import Link from 'next/link'

interface Props {
  type: 'place' | 'hotel' | 'activity' | 'destination'
  variant: '404' | 'error'
  onRetry?: () => void
}

const listingHrefs: Record<Props['type'], string> = {
  place: '/places',
  hotel: '/places',
  activity: '/places',
  destination: '/',
}

const typeLabels: Record<Props['type'], string> = {
  place: 'place',
  hotel: 'hotel',
  activity: 'activity',
  destination: 'destination',
}

const typePlurals: Record<Props['type'], string> = {
  place: 'places',
  hotel: 'hotels',
  activity: 'activities',
  destination: 'destinations',
}

export function EntityError({ type, variant, onRetry }: Props) {
  const label = typeLabels[type]
  const plural = typePlurals[type]
  const href = listingHrefs[type]

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-6">
      <div className="text-center max-w-md">
        {variant === '404' ? (
          <>
            <p className="text-6xl font-serif font-normal text-gray-200 mb-4">404</p>
            <h1 className="text-2xl font-serif font-normal text-[#1e3a5f] tracking-wide mb-3">
              We couldn&apos;t find this {label}
            </h1>
            <p className="text-sm text-gray-500 mb-8">
              It may have been removed or the link might be incorrect.
            </p>
            <Link
              href={href}
              className="inline-flex items-center gap-2 bg-[#003594] hover:bg-[#002B7A] text-white text-sm font-medium px-6 py-3 rounded-xl transition-colors"
            >
              Browse {plural}
            </Link>
          </>
        ) : (
          <>
            <p className="text-6xl mb-4">⚠</p>
            <h1 className="text-2xl font-serif font-normal text-[#1e3a5f] tracking-wide mb-3">
              Something went wrong
            </h1>
            <p className="text-sm text-gray-500 mb-8">
              We had trouble loading this {label}. Please try again.
            </p>
            <div className="flex items-center justify-center gap-3">
              {onRetry && (
                <button
                  onClick={onRetry}
                  className="inline-flex items-center gap-2 bg-[#003594] hover:bg-[#002B7A] text-white text-sm font-medium px-6 py-3 rounded-xl transition-colors"
                >
                  Try again
                </button>
              )}
              <Link
                href={href}
                className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 transition-colors"
              >
                Browse {plural}
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
