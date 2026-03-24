import type { RecommendationSection } from './types'

const SECTION_TINTS: Record<RecommendationSection['sectionType'], string> = {
  destination: 'var(--cal-accent)',
  category: 'var(--cal-text-secondary)',
  affinity: '#f59e0b',
  schedule: '#10b981',
  social: '#8b5cf6',
}

interface SectionBannerProps {
  sectionType: RecommendationSection['sectionType']
  title: string
  subtitle?: string
}

export function SectionBanner({ sectionType, title, subtitle }: SectionBannerProps) {
  const tint = SECTION_TINTS[sectionType]

  return (
    <div
      className="rounded-lg px-3 py-2.5 mb-2"
      style={{ background: `color-mix(in srgb, ${tint} 8%, var(--cal-surface-elevated))` }}
    >
      <h3
        className="text-[12px] font-semibold tracking-wide"
        style={{ color: tint }}
      >
        {title}
      </h3>
      {subtitle && (
        <p className="text-[10px] text-[var(--cal-text-tertiary)] mt-0.5">
          {subtitle}
        </p>
      )}
    </div>
  )
}
