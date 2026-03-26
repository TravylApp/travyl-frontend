'use client'

import { Pencil, Trash2, Share2, Heart } from 'lucide-react'

interface Props {
  onEdit?: () => void
  onRemove?: () => void
  onShare?: () => void
  isFavorited?: boolean
  onToggleFavorite?: () => void
}

export function EntityActionsBar({ onEdit, onRemove, onShare, isFavorited, onToggleFavorite }: Props) {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-t border-gray-200 dark:border-gray-700">
      <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {onEdit && (
            <button onClick={onEdit} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
              <Pencil className="w-3.5 h-3.5" /> Edit
            </button>
          )}
          {onRemove && (
            <button onClick={onRemove} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 rounded-lg hover:bg-red-100 dark:hover:bg-red-950/50 transition-colors">
              <Trash2 className="w-3.5 h-3.5" /> Remove
            </button>
          )}
        </div>
        <div className="flex items-center gap-2">
          {onShare && (
            <button onClick={onShare} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
              <Share2 className="w-3.5 h-3.5" /> Share
            </button>
          )}
          {onToggleFavorite && (
            <button onClick={onToggleFavorite} className="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
              <Heart className={`w-4 h-4 ${isFavorited ? 'fill-red-500 text-red-500' : 'text-gray-500'}`} />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
