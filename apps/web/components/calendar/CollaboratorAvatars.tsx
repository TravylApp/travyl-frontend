'use client'
import type { CalendarActivity, UserAwareness } from './types'

interface CollaboratorAvatarsProps {
  collaborators: UserAwareness[]
  activities: CalendarActivity[]
  expanded: boolean
}

export function CollaboratorAvatars({
  collaborators,
  activities,
  expanded,
}: CollaboratorAvatarsProps) {
  if (collaborators.length === 0) return null

  if (!expanded) {
    // Collapsed: stacked avatar circles with online dot
    return (
      <div
        className="flex flex-col items-center gap-1.5 py-2"
        aria-label="Collaborators"
      >
        {collaborators.map((c, i) => (
          <div
            key={c.userId}
            className="relative"
            style={{ zIndex: collaborators.length - i }}
            title={c.name}
          >
            <div
              className="flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold text-white"
              style={{ backgroundColor: c.color }}
              aria-label={c.name}
            >
              {c.avatarInitial}
            </div>
            {c.isOnline && (
              <span
                className="absolute bottom-0 right-0 h-2 w-2 rounded-full border border-[#1a1f2e] bg-green-400"
                aria-label="Online"
              />
            )}
          </div>
        ))}
      </div>
    )
  }

  // Expanded: full list with names and activity status
  return (
    <div className="flex flex-col gap-1 px-3 py-2" aria-label="Collaborators">
      <p className="mb-1 text-[10px] font-medium uppercase tracking-wide text-gray-500">
        Collaborators
      </p>
      {collaborators.map((c) => {
        const viewedActivity = c.selectedEventId
          ? activities.find((a) => a.id === c.selectedEventId)
          : null

        return (
          <div key={c.userId} className="flex items-center gap-2 py-0.5">
            {/* Avatar */}
            <div className="relative shrink-0">
              <div
                className="flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold text-white"
                style={{ backgroundColor: c.color }}
              >
                {c.avatarInitial}
              </div>
              {c.isOnline && (
                <span className="absolute bottom-0 right-0 h-2 w-2 rounded-full border border-[#1a1f2e] bg-green-400" />
              )}
            </div>

            {/* Name + status */}
            <div className="flex flex-col min-w-0">
              <span className="truncate text-xs font-medium text-gray-200">{c.name}</span>
              {viewedActivity ? (
                <span className="truncate text-[10px] text-gray-500">
                  Viewing {viewedActivity.title}
                </span>
              ) : (
                <span className="text-[10px] text-gray-600">
                  {c.isOnline ? 'Online' : 'Offline'}
                </span>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
