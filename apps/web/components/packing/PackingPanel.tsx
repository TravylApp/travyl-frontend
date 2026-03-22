'use client'

import { useRouter } from 'next/navigation'
import { Expand } from 'iconoir-react'
import { usePackingList, useAuthStore } from '@travyl/shared'
import { SpotlightSearch } from './SpotlightSearch'
import { PackingProgress } from './PackingProgress'
import { PackingCategoryList } from './PackingCategoryList'
import { PackingActivityFeed } from './PackingActivityFeed'

interface PackingPanelProps {
  tripId: string
}

export function PackingPanel({ tripId }: PackingPanelProps) {
  const router = useRouter()
  const { user } = useAuthStore()
  const { items, itemsByCategory, auditLog, progress, isLoading, error, addItem, togglePacked, removeItem } = usePackingList(tripId, user?.id)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-[var(--cal-border,#334155)] border-t-[#003594] rounded-full animate-spin" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-[13px] text-red-400">Failed to load packing list.</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-3 py-2 border-b border-[var(--cal-border,#1e293b)]">
        <h3 className="text-[14px] font-semibold text-[var(--cal-text,#e2e8f0)]">Packing List</h3>
        <button
          onClick={() => router.push(`/trip/${tripId}/packing`)}
          className="p-1 rounded hover:bg-white/10 transition-colors text-[var(--cal-text-muted,#64748b)]"
          title="Expand to full page"
        >
          <Expand width={14} height={14} />
        </button>
      </div>
      <SpotlightSearch existingItems={items} onAddItem={addItem} />
      <PackingProgress packed={progress.packed} total={progress.total} percent={progress.percent} compact />
      <div className="flex-1 overflow-auto">
        <PackingCategoryList itemsByCategory={itemsByCategory} onToggle={togglePacked} onRemove={removeItem} />
      </div>
      <PackingActivityFeed entries={auditLog} defaultCollapsed />
    </div>
  )
}
