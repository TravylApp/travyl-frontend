'use client'

import { motion } from 'motion/react'

interface PackingProgressProps {
  packed: number
  total: number
  percent: number
  compact?: boolean
}

export function PackingProgress({ packed, total, percent, compact = false }: PackingProgressProps) {
  if (compact) {
    return (
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-[var(--cal-text-muted)]">Packing Progress</span>
          <span className="text-xs tabular-nums font-semibold text-[var(--cal-text)]">
            {packed}/{total}
          </span>
        </div>
        <div className="h-1.5 rounded-full bg-[var(--cal-border)] overflow-hidden">
          <motion.div
            className="h-full rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${percent}%` }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            style={{
              background: 'linear-gradient(90deg, #003594, #1e3a5f)',
            }}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-[var(--cal-border)] bg-[var(--cal-surface)] p-5 flex flex-col gap-3">
      <div className="flex items-end gap-2">
        <span className="text-4xl font-bold tabular-nums text-[var(--cal-text)]">{percent}%</span>
        <span className="text-sm text-[var(--cal-text-muted)] pb-1">packed</span>
      </div>

      <div className="h-2 rounded-full bg-[var(--cal-border)] overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${percent}%` }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          style={{
            background: 'linear-gradient(90deg, #003594, #1e3a5f)',
          }}
        />
      </div>

      <p className="text-sm text-[var(--cal-text-muted)]">
        {packed} of {total} item{total !== 1 ? 's' : ''} packed
      </p>
    </div>
  )
}
