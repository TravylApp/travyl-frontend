'use client'

import { usePackingList, useAuthStore } from '@travyl/shared'
import { SpotlightSearch } from './SpotlightSearch'
import { PackingProgress } from './PackingProgress'
import { PackingCategoryList } from './PackingCategoryList'
import { PackingActivityFeed } from './PackingActivityFeed'

interface PackingPageProps {
  tripId: string
}

export function PackingPage({ tripId }: PackingPageProps) {
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
    <div className="flex gap-6 h-full p-6">
      <div className="flex-1 flex flex-col min-w-0">
        <SpotlightSearch existingItems={items} onAddItem={addItem} />
        <div className="flex-1 overflow-auto mt-4">
          <PackingCategoryList itemsByCategory={itemsByCategory} onToggle={togglePacked} onRemove={removeItem} />
        </div>
      </div>
      <div className="w-80 flex flex-col gap-4 shrink-0">
        <PackingProgress packed={progress.packed} total={progress.total} percent={progress.percent} />
        <div className="flex-1 overflow-auto">
          <PackingActivityFeed entries={auditLog} defaultCollapsed={false} />
        </div>
      </div>
    </div>
  )
}
