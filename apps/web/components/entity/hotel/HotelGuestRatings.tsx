import { EntitySection } from '../EntitySection'

interface RatingCategory {
  label: string
  score: number
}

interface Props {
  overall: number
  reviewCount?: number | null
  categories?: RatingCategory[]
}

const RATING_LABELS = [
  { min: 4.5, label: 'Excellent' },
  { min: 4.0, label: 'Very Good' },
  { min: 3.0, label: 'Good' },
  { min: 0, label: 'Fair' },
]

function getRatingLabel(score: number): string {
  return RATING_LABELS.find((r) => score >= r.min)?.label ?? 'Fair'
}

export function HotelGuestRatings({ overall, reviewCount, categories }: Props) {
  if (!categories || categories.length === 0) return null

  return (
    <EntitySection title="Guest Ratings">
      <div className="space-y-6">
        {/* Overall score */}
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-xl bg-[#1e3a5f] flex items-center justify-center flex-shrink-0">
            <span className="text-white text-xl font-semibold">{overall.toFixed(1)}</span>
          </div>
          <div>
            <p className="text-base font-semibold text-gray-900">{getRatingLabel(overall)}</p>
            {reviewCount != null && (
              <p className="text-sm text-gray-500">{reviewCount.toLocaleString()} reviews</p>
            )}
          </div>
        </div>

        {/* Category bars */}
        <div className="space-y-3">
          {categories.map((cat, i) => {
            const pct = Math.min(100, Math.max(0, (cat.score / 5) * 100))
            return (
              <div key={i}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-gray-700">{cat.label}</span>
                  <span className="text-sm font-medium text-gray-900">{cat.score.toFixed(1)}</span>
                </div>
                <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-[#003594]"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </EntitySection>
  )
}
