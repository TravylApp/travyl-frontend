import { ReactNode } from 'react'

interface Props {
  title: string
  children: ReactNode
  className?: string
}

export function EntitySection({ title, children, className }: Props) {
  return (
    <section className={`px-6 md:px-10 py-6 border-t border-gray-100 dark:border-white/[0.06] ${className ?? ''}`}>
      <h2 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wide mb-4">
        {title}
      </h2>
      {children}
    </section>
  )
}
