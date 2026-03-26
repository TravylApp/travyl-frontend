import type { PlaceItem } from '@travyl/shared'
import { EntitySection } from '../EntitySection'
import { EntityTagList } from '../EntityTagList'

interface Props {
  place: PlaceItem
}

export function PlaceAbout({ place }: Props) {
  const text = place.description || place.tagline || null
  const tags = place.tags ?? []

  if (!text && tags.length === 0) return null

  return (
    <EntitySection title="About">
      {text && (
        <p className="text-sm text-gray-700 leading-relaxed mb-4">{text}</p>
      )}
      {tags.length > 0 && <EntityTagList tags={tags} />}
    </EntitySection>
  )
}
