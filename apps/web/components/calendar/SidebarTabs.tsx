'use client'
import React from 'react'

interface SidebarTabsProps {
  activeTab: 'for-you' | 'map'
  onTabChange: (tab: 'for-you' | 'map') => void
  forYouContent: React.ReactNode
  mapContent: React.ReactNode
  width?: number
}

export default function SidebarTabs({
  activeTab,
  onTabChange,
  forYouContent,
  mapContent,
}: SidebarTabsProps) {
  return (
    <div className="flex flex-col h-full">
      <div className="flex border-b border-[var(--cal-border)]">
        <button
          onClick={() => onTabChange('for-you')}
          className={[
            'px-4 py-2 text-sm font-medium transition-colors',
            activeTab === 'for-you'
              ? 'text-[#003594] border-b-2 border-[#003594]'
              : 'text-[var(--cal-text-secondary)] hover:text-[var(--cal-text)]',
          ].join(' ')}
        >
          For You
        </button>
        <button
          onClick={() => onTabChange('map')}
          className={[
            'px-4 py-2 text-sm font-medium transition-colors',
            activeTab === 'map'
              ? 'text-[#003594] border-b-2 border-[#003594]'
              : 'text-[var(--cal-text-secondary)] hover:text-[var(--cal-text)]',
          ].join(' ')}
        >
          Map
        </button>
      </div>
      <div className="flex-1 overflow-hidden">
        {activeTab === 'for-you' ? forYouContent : mapContent}
      </div>
    </div>
  )
}
