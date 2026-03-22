import type { RecommendationSection, SuggestionCard as SuggestionCardType } from './types'
import { SectionBanner } from './SectionBanner'
import { SuggestionCard } from './SuggestionCard'

interface SuggestionSectionProps {
  section: RecommendationSection
  columnCount: number
  onCardVisible?: (id: string, category: string) => void
  onCardClick?: (suggestion: SuggestionCardType, anchorEl: HTMLElement) => void
  onSave?: (suggestion: SuggestionCardType) => void
  onSchedule?: (suggestion: SuggestionCardType) => void
}

export function SuggestionSection({
  section,
  columnCount,
  onCardVisible,
  onCardClick,
  onSave,
  onSchedule,
}: SuggestionSectionProps) {
  if (section.suggestions.length === 0) return null

  const columns: SuggestionCardType[][] = Array.from({ length: columnCount }, () => [])
  section.suggestions.forEach((s, i) => {
    columns[i % columnCount].push(s)
  })

  return (
    <div className="mb-3">
      <SectionBanner
        sectionType={section.sectionType}
        title={section.sectionTitle}
        subtitle={section.sectionSubtitle}
      />
      <div className="flex gap-2">
        {columns.map((col, colIdx) => (
          <div key={colIdx} className="flex-1 flex flex-col gap-2">
            {col.map((suggestion) => (
              <SuggestionCard
                key={suggestion.id}
                suggestion={suggestion}
                onVisible={() => onCardVisible?.(suggestion.id, suggestion.category)}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
