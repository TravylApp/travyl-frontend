'use client'

import type { ReactNode } from 'react'

export function highlightMatch(text: string, query: string): ReactNode {
  if (!query || query.length < 1) return text
  const index = text.toLowerCase().indexOf(query.toLowerCase())
  if (index === -1) return text
  return (
    <>
      {text.slice(0, index)}
      <mark className="bg-yellow-200/60 dark:bg-yellow-500/30 text-inherit rounded-sm px-0.5">
        {text.slice(index, index + query.length)}
      </mark>
      {text.slice(index + query.length)}
    </>
  )
}
