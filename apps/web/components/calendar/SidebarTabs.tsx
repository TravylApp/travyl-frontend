'use client'

import { useState } from 'react'

type Tab = 'for-you' | 'events' | 'map'

interface SidebarTabsProps {
  forYouContent: React.ReactNode
  eventsContent: React.ReactNode
  mapContent: React.ReactNode
  width?: number
}

export default function SidebarTabs({
  forYouContent,
  eventsContent,
  mapContent,
}: SidebarTabsProps) {
  const [activeTab, setActiveTab] = useState<Tab>('for-you')

  const tabs: { id: Tab; label: string }[] = [
    { id: 'for-you', label: 'For You' },
    { id: 'events', label: 'Events' },
    { id: 'map', label: 'Map' },
  ]

  const content =
    activeTab === 'for-you' ? forYouContent
    : activeTab === 'events' ? eventsContent
    : mapContent

  return (
    <div className="flex flex-col h-full">
      <div className="flex border-b border-cal-border">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={[
              'px-4 py-2 text-sm font-medium transition-colors',
              activeTab === tab.id
                ? 'text-primary border-b-2 border-primary'
                : 'text-cal-text-secondary hover:text-cal-text',
            ].join(' ')}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-hidden">
        {content}
      </div>
    </div>
  )
}
