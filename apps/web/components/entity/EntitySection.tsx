import { ReactNode } from 'react'

interface Props {
  title: string
  children: ReactNode
  className?: string
}

export function EntitySection({ title, children, className }: Props) {
  return (
    <section className={`px-6 md:px-10 py-6 ${className ?? ''}`}>
      <h2 className="text-2xl font-serif font-normal text-[#1e3a5f] tracking-wide mb-4">
        {title}
      </h2>
      {children}
    </section>
  )
}
