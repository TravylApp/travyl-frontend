import { Check, Xmark } from 'iconoir-react'
import { EntitySection } from '../EntitySection'

interface Props {
  included?: string[]
  notIncluded?: string[]
}

export function ActivityInclusions({ included, notIncluded }: Props) {
  if (!included?.length && !notIncluded?.length) return null

  return (
    <EntitySection title="What's Included">
      <div className="space-y-2">
        {included?.map((item, i) => (
          <div key={`in-${i}`} className="flex items-start gap-3">
            <span className="flex-shrink-0 w-5 h-5 rounded-full bg-green-100 flex items-center justify-center mt-0.5">
              <Check className="w-3 h-3 text-green-600" />
            </span>
            <p className="text-sm text-gray-700">{item}</p>
          </div>
        ))}
        {notIncluded?.map((item, i) => (
          <div key={`not-${i}`} className="flex items-start gap-3">
            <span className="flex-shrink-0 w-5 h-5 rounded-full bg-red-100 flex items-center justify-center mt-0.5">
              <Xmark className="w-3 h-3 text-red-500" />
            </span>
            <p className="text-sm text-gray-500">{item}</p>
          </div>
        ))}
      </div>
    </EntitySection>
  )
}
