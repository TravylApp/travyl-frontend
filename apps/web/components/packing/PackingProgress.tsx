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
          <span className="text-xs font-medium text-gray-600 dark:text-gray-400">Packing Progress</span>
          <span className="text-xs tabular-nums font-semibold text-gray-900 dark:text-white">
            {packed}/{total}
          </span>
        </div>
        <div className="h-1.5 rounded-full bg-gray-100 dark:bg-white/[0.06] overflow-hidden">
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
    <div className="rounded-xl border border-gray-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.03] shadow-sm p-5 flex flex-col gap-3">
      <div className="flex items-end gap-2">
        <span className="text-4xl font-bold tabular-nums text-gray-900 dark:text-white">{percent}%</span>
        <span className="text-sm text-gray-600 dark:text-gray-400 pb-1">packed</span>
      </div>

      <div className="h-2 rounded-full bg-gray-100 dark:bg-white/[0.06] overflow-hidden">
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

      <p className="text-sm text-gray-600 dark:text-gray-400">
        {packed} of {total} item{total !== 1 ? 's' : ''} packed
      </p>
    </div>
  )
}
