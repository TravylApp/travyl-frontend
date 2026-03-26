import { EntitySection } from '@/components/entity/EntitySection'
import { EntityTagList } from '@/components/entity/EntityTagList'

interface Props {
  description?: string | null
  tags?: string[]
}

export function DestinationOverview({ description, tags }: Props) {
  const hasTags = (tags ?? []).length > 0
  if (!description && !hasTags) return null

  return (
    <EntitySection title="Overview">
      {description && (
        <p className="text-gray-700 leading-relaxed mb-4">{description}</p>
      )}
      {hasTags && <EntityTagList tags={tags!} />}
    </EntitySection>
  )
}
