import Link from 'next/link'
import { NavArrowRight } from 'iconoir-react'

interface BreadcrumbItem {
  label: string
  href: string
}

interface Props {
  items: BreadcrumbItem[]
  current: string
}

export function EntityBreadcrumb({ items, current }: Props) {
  return (
    <nav aria-label="Breadcrumb" className="px-6 md:px-10 py-3">
      <ol className="flex items-center gap-1 flex-wrap">
        {items.map((item, i) => (
          <li key={i} className="flex items-center gap-1">
            <Link
              href={item.href}
              className="text-sm text-gray-500 dark:text-gray-400 hover:text-[#003594] dark:hover:text-blue-400 transition-colors"
            >
              {item.label}
            </Link>
            <NavArrowRight className="w-3 h-3 text-gray-400 dark:text-gray-500 flex-shrink-0" />
          </li>
        ))}
        <li>
          <span className="text-sm text-gray-900 dark:text-white font-medium truncate">{current}</span>
        </li>
      </ol>
    </nav>
  )
}
