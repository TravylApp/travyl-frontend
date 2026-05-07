'use client'

import { useState } from 'react'
import { Star, MapPin, Calendar } from 'iconoir-react'

type Tab = 'for-you' | 'events' | 'map'

interface SidebarTabsProps {
  forYouContent: React.ReactNode
  eventsContent: React.ReactNode
  mapContent: React.ReactNode
  width?: number
}

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: 'for-you', label: 'For You', icon: <Star width={14} height={14} /> },
  { id: 'events', label: 'Events', icon: <Calendar width={14} height={14} /> },
  { id: 'map', label: 'Map', icon: <MapPin width={14} height={14} /> },
]

export default function SidebarTabs({
  forYouContent,
  eventsContent,
  mapContent,
}: SidebarTabsProps) {
  const [activeTab, setActiveTab] = useState<Tab>('for-you')

  const content =
    activeTab === 'for-you' ? forYouContent
    : activeTab === 'events' ? eventsContent
    : mapContent

  return (
    <div className="flex flex-col h-full">
      {/* Tab bar */}
      <div role="tablist" className="flex w-full border-b border-cal-border bg-cal-surface-elevated">
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              role="tab"
              aria-selected={isActive}
              onClick={() => setActiveTab(tab.id)}
              className={[
                'flex-1 min-w-0 flex items-center justify-center gap-1.5 py-3 text-[12.5px] font-semibold tracking-tight transition-colors relative',
                isActive
                  ? 'text-cal-text'
                  : 'text-cal-text-tertiary hover:text-cal-text-secondary',
              ].join(' ')}
            >
              <span className={isActive ? 'text-primary' : 'text-cal-text-tertiary'}>
                {tab.icon}
              </span>
              <span>{tab.label}</span>
              {isActive && (
                <div className="absolute -bottom-px left-4 right-4 h-[2px] rounded-full bg-primary" />
              )}
            </button>
          )
        })}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {content}
      </div>
    </div>
  )
}
