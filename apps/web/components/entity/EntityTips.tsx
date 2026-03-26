import { EntitySection } from './EntitySection'

interface Props {
  tips?: string[]
}

export function EntityTips({ tips }: Props) {
  if (!tips?.length) return null

  return (
    <EntitySection title="Tips">
      <ul className="space-y-2">
        {tips.map((tip, i) => (
          <li key={i} className="flex items-start gap-2">
            <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-gray-400 flex-shrink-0" />
            <p className="text-sm text-gray-700">{tip}</p>
          </li>
        ))}
      </ul>
    </EntitySection>
  )
}
