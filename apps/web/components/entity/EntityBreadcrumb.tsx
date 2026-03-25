'use client'

import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'

interface Props {
  label: string
  href: string
}

export function EntityBreadcrumb({ label, href }: Props) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors mb-4"
    >
      <ChevronLeft className="w-4 h-4" />
      Back to {label}
    </Link>
  )
}
