import { EntitySection } from './EntitySection'
import { Check } from 'iconoir-react'

interface Props {
  items?: string[]
}

export function EntityAccessibility({ items }: Props) {
  if (!items?.length) return null

  return (
    <EntitySection title="Accessibility">
      <div className="flex flex-wrap gap-2">
        {items.map((item, i) => (
          <span
            key={i}
            className="inline-flex items-center gap-1.5 rounded-full bg-green-50 text-green-700 text-xs font-medium px-3 py-1"
          >
            <Check className="w-3 h-3" />
            {item}
          </span>
        ))}
      </div>
    </EntitySection>
  )
}
