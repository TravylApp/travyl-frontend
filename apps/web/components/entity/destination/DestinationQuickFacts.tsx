import { MapPin, Clock, Wallet } from 'iconoir-react'
import { EntitySection } from '@/components/entity/EntitySection'
import { EntityQuickInfo } from '@/components/entity/EntityQuickInfo'

interface Props {
  country?: string
  language?: string
  currency?: string
  timezone?: string
  bestTimeToVisit?: string
  budgetLevel?: 1 | 2 | 3 | 4
}

function BudgetDots({ level }: { level: 1 | 2 | 3 | 4 }) {
  const labels = ['Budget', 'Moderate', 'Upscale', 'Luxury']
  return (
    <span className="flex items-center gap-1">
      {[1, 2, 3, 4].map((l) => (
        <span
          key={l}
          className={`text-sm font-medium ${l <= level ? 'text-gray-900' : 'text-gray-300'}`}
        >
          $
        </span>
      ))}
      <span className="text-sm text-gray-500 ml-1">({labels[level - 1]})</span>
    </span>
  )
}

export function DestinationQuickFacts({
  country,
  language,
  currency,
  timezone,
  bestTimeToVisit,
  budgetLevel,
}: Props) {
  const items = [
    country
      ? { icon: <MapPin className="w-4 h-4" />, label: 'Country', value: country }
      : null,
    language
      ? { icon: <MapPin className="w-4 h-4" />, label: 'Language', value: language }
      : null,
    currency
      ? { icon: <Wallet className="w-4 h-4" />, label: 'Currency', value: currency }
      : null,
    timezone
      ? { icon: <Clock className="w-4 h-4" />, label: 'Timezone', value: timezone }
      : null,
    bestTimeToVisit
      ? { icon: <Clock className="w-4 h-4" />, label: 'Best Time to Visit', value: bestTimeToVisit }
      : null,
    budgetLevel
      ? {
          icon: <Wallet className="w-4 h-4" />,
          label: 'Budget Level',
          value: <BudgetDots level={budgetLevel} />,
        }
      : null,
  ].filter(Boolean) as { icon: React.ReactNode; label: string; value: string | React.ReactNode }[]

  if (!items.length) return null

  return (
    <EntitySection title="Quick Facts">
      <EntityQuickInfo items={items} />
    </EntitySection>
  )
}
