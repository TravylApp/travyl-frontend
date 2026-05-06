'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Search } from 'iconoir-react'
import type { DbPackingItem } from '@travyl/shared'
import { PACKING_CATALOG, PACKING_CATEGORIES } from '@travyl/shared'
import { getCategoryLabel } from './utils'

interface SpotlightSearchProps {
  existingItems: DbPackingItem[]
  onAddItem: (name: string, category: string) => void
}

interface ResultItem {
  name: string
  category: string
  alreadyAdded: boolean
  isCustom?: boolean
}

export function SpotlightSearch({ existingItems, onAddItem }: SpotlightSearchProps) {
  const [query, setQuery] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)
  const [customCategory, setCustomCategory] = useState<string>('essentials')
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

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

  // Whether to show the "Add [query]" custom option
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

  // Reset active index when results change
  useEffect(() => {
    setActiveIndex(0)
  }, [query])

  // Close on outside click
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
      {/* Input */}
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-[var(--cal-border)] bg-cal-bg focus-within:border-[#003594] transition-colors duration-150">
        <Search width={15} height={15} className="text-[var(--cal-text-muted)] shrink-0" />
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
          placeholder="Search or add item…"
          className="flex-1 text-sm bg-transparent outline-none text-[var(--cal-text)] placeholder:text-[var(--cal-text-muted)]"
        />
      </div>

      {/* Dropdown */}
      {isOpen && allItems.length > 0 && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 rounded-lg border border-[var(--cal-border)] bg-cal-bg shadow-lg overflow-hidden">
          {allItems.map((item, idx) => (
            <div key={`${item.name}-${item.isCustom ? 'custom' : 'catalog'}`}>
              {/* Separator before custom item */}
              {item.isCustom && results.length > 0 && (
                <div className="h-px bg-cal-border mx-3" />
              )}
              <div
                className={`flex items-center gap-2 px-3 py-2 cursor-pointer transition-colors duration-100 ${
                  idx === activeIndex
                    ? 'bg-cal-surface'
                    : 'hover:bg-cal-surface'
                } ${item.alreadyAdded ? 'opacity-50 cursor-default' : ''}`}
                onMouseEnter={() => setActiveIndex(idx)}
                onClick={() => handleSelect(item)}
              >
                <span className={`flex-1 text-sm ${item.isCustom ? 'font-medium text-[#003594]' : 'text-[var(--cal-text)]'}`}>
                  {item.isCustom ? `Add "${item.name}"` : item.name}
                </span>

                {item.alreadyAdded ? (
                  <span className="text-xs text-[var(--cal-text-muted)]">already added</span>
                ) : (
                  <span className="text-xs text-[var(--cal-text-muted)]">
                    {getCategoryLabel(item.category)}
                  </span>
                )}

                {/* Category picker for custom item */}
                {item.isCustom && !item.alreadyAdded && (
                  <select
                    value={customCategory}
                    onChange={(e) => {
                      e.stopPropagation()
                      setCustomCategory(e.target.value)
                    }}
                    onClick={(e) => e.stopPropagation()}
                    className="text-xs border border-[var(--cal-border)] rounded px-1 py-0.5 bg-cal-bg text-[var(--cal-text)] outline-none"
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
}
