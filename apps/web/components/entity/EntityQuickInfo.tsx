import { ReactNode } from 'react'

interface QuickInfoItem {
  icon: ReactNode
  label: string
  value: string | ReactNode
  href?: string
}

interface Props {
  items: QuickInfoItem[]
}

export function EntityQuickInfo({ items }: Props) {
  const visibleItems = items.filter(
    (item) => item.value !== null && item.value !== undefined && item.value !== ''
  )

  if (!visibleItems.length) return null

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {visibleItems.map((item, i) => (
        <div key={i} className="flex items-start gap-3">
          <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center text-gray-500">
            {item.icon}
          </div>
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-wide text-gray-500 mb-0.5">{item.label}</p>
            {item.href ? (
              <a
                href={item.href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-[#003594] hover:text-[#002B7A] transition-colors break-words"
              >
                {item.value}
              </a>
            ) : (
              <p className="text-sm text-gray-900 break-words">{item.value}</p>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
