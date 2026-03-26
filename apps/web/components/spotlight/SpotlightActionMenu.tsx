'use client'

import { motion } from 'motion/react'
import {
  ExternalLink,
  Copy,
  CopyPlus,
  Trash2,
  Pin,
  PinOff,
  Play,
  ChevronLeft,
  MapPin,
  Navigation,
  Share2,
  Eye,
} from 'lucide-react'
import type { SpotlightResult } from '@travyl/shared'
import { SpotlightResultItem } from './SpotlightResultItem'

export interface SpotlightAction {
  id: string
  label: string
  icon: React.ElementType
  shortcut?: string
  execute: () => void
}

interface Props {
  result: SpotlightResult
  actions: SpotlightAction[]
  activeActionIndex: number
  onBack: () => void
}

export function getActionsForResult(
  result: SpotlightResult,
  options: {
    isPinned: boolean
    onPin: () => void
    onUnpin: () => void
    onSelect: () => void
  },
): SpotlightAction[] {
  const { isPinned, onPin, onUnpin, onSelect } = options

  const pinAction: SpotlightAction = isPinned
    ? { id: 'unpin', label: 'Unpin', icon: PinOff, execute: onUnpin }
    : { id: 'pin', label: 'Pin to Top', icon: Pin, execute: onPin }

  const copyLinkAction: SpotlightAction = {
    id: 'copy-link',
    label: 'Copy Link',
    icon: Copy,
    shortcut: '\u2318C',
    execute: () => {
      if (result.href) {
        navigator.clipboard.writeText(window.location.origin + result.href)
      }
    },
  }

  const openAction: SpotlightAction = {
    id: 'open',
    label: 'Open',
    icon: ExternalLink,
    shortcut: '\u21B5',
    execute: onSelect,
  }

  const openDetailsAction: SpotlightAction = {
    id: 'open-details',
    label: 'Open Details',
    icon: ExternalLink,
    shortcut: '\u21B5',
    execute: onSelect,
  }

  const duplicateAction: SpotlightAction = {
    id: 'duplicate',
    label: 'Duplicate',
    icon: CopyPlus,
    execute: () => {},
  }

  const removeFromTripAction: SpotlightAction = {
    id: 'remove-from-trip',
    label: 'Remove from Trip',
    icon: Trash2,
    execute: () => {},
  }

  const meta = result.metadata as Record<string, unknown> | undefined
  const lat = meta?.latitude as number | undefined
  const lng = meta?.longitude as number | undefined

  const mapActions: SpotlightAction[] = []
  if (lat && lng) {
    mapActions.push({
      id: 'open-in-maps',
      label: 'Open in Maps',
      icon: MapPin,
      execute: () => {
        window.open(`https://www.google.com/maps/search/?api=1&query=${lat},${lng}`, '_blank')
      },
    })
    mapActions.push({
      id: 'get-directions',
      label: 'Get Directions',
      icon: Navigation,
      execute: () => {
        window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`, '_blank')
      },
    })
  }

  const viewTripAction: SpotlightAction | null = result.tripId
    ? {
        id: 'view-trip',
        label: 'View Trip',
        icon: Eye,
        execute: () => {
          window.location.href = `/trip/${result.tripId}`
        },
      }
    : null

  const shareTripAction: SpotlightAction = {
    id: 'share-trip',
    label: 'Share Trip',
    icon: Share2,
    execute: () => {
      navigator.clipboard.writeText(window.location.origin + result.href)
    },
  }

  switch (result.type) {
    case 'trip':
      return [openAction, copyLinkAction, shareTripAction, duplicateAction, pinAction]
    case 'hotel':
    case 'restaurant':
    case 'activity':
      return [
        openDetailsAction,
        ...mapActions,
        ...(viewTripAction ? [viewTripAction] : []),
        copyLinkAction,
        removeFromTripAction,
        pinAction,
      ]
    case 'flight':
      return [
        openDetailsAction,
        ...(viewTripAction ? [viewTripAction] : []),
        copyLinkAction,
        removeFromTripAction,
        pinAction,
      ]
    case 'destination':
      return [
        {
          id: 'explore-on-map',
          label: 'Explore on Map',
          icon: MapPin,
          execute: () => {
            window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(result.title)}`, '_blank')
          },
        },
        copyLinkAction,
        pinAction,
      ]
    case 'navigation':
      return [{ id: 'open', label: 'Open', icon: ExternalLink, execute: onSelect }]
    case 'command':
      return [{ id: 'execute', label: 'Execute', icon: Play, execute: onSelect }]
    default:
      return [openAction, pinAction]
  }
}

export function SpotlightActionMenu({ result, actions, activeActionIndex, onBack }: Props) {
  return (
    <div className="max-h-[400px] overflow-y-auto py-2">
      {/* Frozen result at top */}
      <div className="px-2 pb-1">
        <div className="flex items-center gap-2 px-3 py-1.5">
          <button
            onClick={onBack}
            className="flex items-center gap-1 text-[11px] font-medium text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
          >
            <ChevronLeft className="w-3 h-3" />
            Back
          </button>
        </div>
        <SpotlightResultItem
          result={result}
          isActive={false}
          onClick={onBack}
          query=""
        />
      </div>

      {/* Divider */}
      <div className="mx-4 my-1 h-px bg-gray-200 dark:bg-gray-700" />

      {/* Action list */}
      <div className="px-2 pb-1">
        <div className="flex items-center gap-2 px-3 py-1.5">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
            Actions
          </span>
        </div>
        {actions.map((action, i) => {
          const Icon = action.icon
          const isActive = i === activeActionIndex
          return (
            <button
              key={action.id}
              onClick={action.execute}
              className={`w-full flex items-center gap-3 px-3 py-2 text-left rounded-lg transition-colors relative ${
                isActive
                  ? 'bg-blue-50 dark:bg-blue-950/30'
                  : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'
              }`}
            >
              {isActive && (
                <motion.div
                  layoutId="spotlight-action-highlight"
                  className="absolute inset-0 bg-blue-50 dark:bg-blue-950/30 rounded-lg"
                  transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                />
              )}
              <div className="relative z-10 w-8 h-8 rounded-md bg-gray-100 dark:bg-gray-800 flex items-center justify-center flex-shrink-0">
                <Icon className="w-4 h-4 text-gray-600 dark:text-gray-300" />
              </div>
              <span className="relative z-10 flex-1 text-sm text-gray-700 dark:text-gray-200">
                {action.label}
              </span>
              {action.shortcut && (
                <kbd className="relative z-10 inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-medium text-gray-400 bg-gray-100 dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700 flex-shrink-0">
                  {action.shortcut}
                </kbd>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
