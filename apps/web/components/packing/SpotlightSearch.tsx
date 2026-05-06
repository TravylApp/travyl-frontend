'use client'

import { useState, useRef, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react'
import { Search } from 'iconoir-react'
import type { DbPackingItem } from '@travyl/shared'
import { PACKING_CATALOG, PACKING_CATEGORIES } from '@travyl/shared'
import { getCategoryLabel } from './utils'

interface SpotlightSearchProps {
  existingItems: DbPackingItem[]
  onAddItem: (name: string, category: string) => void
}

export interface SpotlightSearchHandle {
  focus: () => void
}

interface ResultItem {
  name: string
  category: string
  alreadyAdded: boolean
  isCustom?: boolean
}

export const SpotlightSearch = forwardRef<SpotlightSearchHandle, SpotlightSearchProps>(function SpotlightSearch(
  { existingItems, onAddItem }: SpotlightSearchProps,
  ref,
) {
  const [query, setQuery] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)
  const [customCategory, setCustomCategory] = useState<string>('essentials')
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useImperativeHandle(ref, () => ({
    focus: () => inputRef.current?.focus(),
  }), [])

  const existingNames = new Set(existingItems.map((i) => i.name.toLowerCase()))

  const filteredCatalog = useCallback((): ResultItem[] => {
    if (!query.trim()) return []

    const q = query.toLowerCase()
    const matched = PACKING_CATALOG.filter(
      (item) =>
        item.name.toLowerCase().includes(q) ||
        item.tags.some((tag) => tag.toLowerCase().includes(q))
    ).slice(0, 8)

    return matched.map((item) => ({
      name: item.name,
      category: item.category,
      alreadyAdded: existingNames.has(item.name.toLowerCase()),
    }))
  }, [query, existingNames])

  const results = filteredCatalog()

  const showCustom =
    query.trim().length > 0 &&
    !results.some((r) => r.name.toLowerCase() === query.trim().toLowerCase())

  const allItems: ResultItem[] = [
    ...results,
    ...(showCustom
      ? [
          {
            name: query.trim(),
            category: customCategory,
            alreadyAdded: existingNames.has(query.trim().toLowerCase()),
            isCustom: true,
          },
        ]
      : []),
  ]

  useEffect(() => {
    setActiveIndex(0)
  }, [query])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  function handleSelect(item: ResultItem) {
    if (item.alreadyAdded) return
    onAddItem(item.name, item.category)
    setQuery('')
    setIsOpen(false)
    inputRef.current?.focus()
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!isOpen || allItems.length === 0) return

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex((i) => Math.min(i + 1, allItems.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const item = allItems[activeIndex]
      if (item) handleSelect(item)
    } else if (e.key === 'Escape') {
      setIsOpen(false)
      setQuery('')
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <div className="flex items-center gap-2 h-11 rounded-xl border border-gray-200 dark:border-white/[0.10] bg-white dark:bg-white/[0.04] px-4 focus-within:border-[var(--trip-base)]/50 focus-within:ring-2 focus-within:ring-[var(--trip-base)]/20 transition">
        <Search width={15} height={15} className="text-gray-400 shrink-0" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setIsOpen(true)
          }}
          onFocus={() => { if (query.trim()) setIsOpen(true) }}
          onKeyDown={handleKeyDown}
          placeholder="Search or add an item…"
          className="flex-1 text-[14px] bg-transparent outline-none text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500"
        />
      </div>

      {isOpen && allItems.length > 0 && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#1a2230] shadow-xl overflow-hidden">
          {allItems.map((item, idx) => (
            <div key={`${item.name}-${item.isCustom ? 'custom' : 'catalog'}`}>
              {item.isCustom && results.length > 0 && (
                <div className="h-px bg-gray-100 dark:bg-white/[0.06] mx-3" />
              )}
              <div
                className={`flex items-center gap-2 px-3 py-2 cursor-pointer transition-colors duration-100 ${
                  idx === activeIndex
                    ? 'bg-[rgb(var(--trip-base-rgb)/0.08)] dark:bg-white/[0.06]'
                    : 'hover:bg-gray-50 dark:hover:bg-white/[0.03]'
                } ${item.alreadyAdded ? 'opacity-50 cursor-default' : ''}`}
                onMouseEnter={() => setActiveIndex(idx)}
                onClick={() => handleSelect(item)}
              >
                <span className={`flex-1 text-sm ${item.isCustom ? 'font-medium text-[var(--trip-base)]' : 'text-gray-900 dark:text-white'}`}>
                  {item.isCustom ? `Add "${item.name}"` : item.name}
                </span>

                {item.alreadyAdded ? (
                  <span className="text-xs text-gray-400">already added</span>
                ) : (
                  <span className="text-xs text-gray-400">
                    {getCategoryLabel(item.category)}
                  </span>
                )}

                {item.isCustom && !item.alreadyAdded && (
                  <select
                    value={customCategory}
                    onChange={(e) => {
                      e.stopPropagation()
                      setCustomCategory(e.target.value)
                    }}
                    onClick={(e) => e.stopPropagation()}
                    className="text-xs border border-gray-200 dark:border-white/10 rounded px-1 py-0.5 bg-white dark:bg-white/[0.04] text-gray-700 dark:text-gray-300 outline-none"
                  >
                    {PACKING_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {getCategoryLabel(cat)}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
})
