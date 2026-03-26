import { StarSolid, Star } from 'iconoir-react'
import { EntitySection } from '../EntitySection'
import { EntityTagList } from '../EntityTagList'

interface Props {
  description?: string | null
  starRating?: number | null
  guestRating?: number | null
  reviewCount?: number | null
  tags?: string[]
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

export function HotelOverview({ description, starRating, guestRating, reviewCount, tags }: Props) {
  const hasContent = description || starRating != null || guestRating != null || tags?.length
  if (!hasContent) return null

  const stars = starRating != null ? Math.round(starRating) : null

  return (
    <EntitySection title="Overview">
      <div className="space-y-5">
        {/* Star rating row */}
        {stars != null && (
          <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((n) => (
              n <= stars ? (
                <StarSolid key={n} className="w-5 h-5 text-amber-400" />
              ) : (
                <Star key={n} className="w-5 h-5 text-gray-300" />
              )
            ))}
            <span className="ml-1 text-sm text-gray-500">{stars}-star hotel</span>
          </div>
        )}

        {/* Guest rating */}
        {guestRating != null && (
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-xl bg-[#1e3a5f] flex items-center justify-center flex-shrink-0">
              <span className="text-white text-lg font-semibold">{guestRating.toFixed(1)}</span>
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">{getRatingLabel(guestRating)}</p>
              {reviewCount != null && (
                <p className="text-xs text-gray-500">{reviewCount.toLocaleString()} reviews</p>
              )}
            </div>
          </div>
        )}

        {/* Description */}
        {description && (
          <p className="text-sm text-gray-700 leading-relaxed">{description}</p>
        )}

        {/* Tags */}
        {tags && tags.length > 0 && <EntityTagList tags={tags} />}
      </div>
    </EntitySection>
  )
}
