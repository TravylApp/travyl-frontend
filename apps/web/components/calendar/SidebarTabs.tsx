'use client'

import { useState } from 'react'
import { SunLight, MapPin, Calendar } from 'iconoir-react'
import { Tooltip } from '@/components/ui/tooltip'

type Tab = 'for-you' | 'events' | 'map'

interface SidebarTabsProps {
  forYouContent: React.ReactNode
  eventsContent: React.ReactNode
  mapContent: React.ReactNode
  width?: number
}

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: 'for-you', label: 'For You', icon: <SunLight width={15} height={15} /> },
  { id: 'events', label: 'Events', icon: <Calendar width={15} height={15} /> },
  { id: 'map', label: 'Map', icon: <MapPin width={15} height={15} /> },
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
      <div className="flex border-b border-cal-border bg-white/40 dark:bg-white/[0.02]">
        {TABS.map(tab => {
          const isActive = activeTab === tab.id
          return (
            <Tooltip key={tab.id} content={tab.label}>
              <button
                onClick={() => setActiveTab(tab.id)}
                className={[
                  'flex items-center gap-1.5 flex-1 justify-center py-3 text-xs font-medium transition-all relative',
                  isActive
                    ? 'text-primary'
                    : 'text-cal-text-secondary hover:text-cal-text',
                ].join(' ')}
              >
                {tab.icon}
                <span>{tab.label}</span>
                {isActive && (
                  <div className="absolute bottom-0 left-3 right-3 h-0.5 rounded-full bg-primary" />
                )}
              </button>
            </Tooltip>
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
