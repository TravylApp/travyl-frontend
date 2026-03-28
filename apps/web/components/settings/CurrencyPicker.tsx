'use client'

import { useState, useMemo } from 'react'
import { useSettingsStore, CURRENCIES } from '@travyl/shared'

interface CurrencyPickerProps {
  onClose: () => void
}

export function CurrencyPicker({ onClose }: CurrencyPickerProps) {
  const currency = useSettingsStore((s) => s.currency)
  const setCurrency = useSettingsStore((s) => s.setCurrency)
  const [search, setSearch] = useState('')

  const filtered = useMemo(
    () =>
      CURRENCIES.filter(
        (c) =>
          c.code.toLowerCase().includes(search.toLowerCase()) ||
          c.name.toLowerCase().includes(search.toLowerCase()),
      ),
    [search],
  )

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40" onClick={onClose}>
      <div
        className="w-full sm:max-w-sm bg-background rounded-t-2xl sm:rounded-2xl border border-border shadow-xl p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-foreground">Home Currency</h2>
          <button onClick={onClose} className="text-xs text-muted-foreground hover:text-foreground">Done</button>
        </div>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search currencies..."
          autoFocus
          className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background text-foreground placeholder:text-muted-foreground mb-2 outline-none focus:ring-1 focus:ring-primary"
        />
        <div className="max-h-72 overflow-y-auto rounded-lg border border-border divide-y divide-border">
          {filtered.map((c) => (
            <button
              key={c.code}
              onClick={() => {
                setCurrency(c.code)
                onClose()
              }}
              className={`w-full flex items-center justify-between px-3 py-2.5 text-left text-sm transition-colors hover:bg-muted/50 ${
                currency === c.code ? 'bg-muted font-medium text-foreground' : 'text-foreground'
              }`}
            >
              <span>
                <span className="font-mono text-muted-foreground w-8 inline-block">{c.code}</span>
                {' '}{c.name}
              </span>
              <span className="text-muted-foreground ml-2">{c.symbol}</span>
            </button>
          ))}
          {filtered.length === 0 && (
            <p className="px-3 py-4 text-sm text-muted-foreground text-center">No currencies found</p>
          )}
        </div>
      </div>
    </div>
  )
}
