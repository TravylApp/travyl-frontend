'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Plus, Heart, HeartSolid, ShareAndroid } from 'iconoir-react'
import { useAuthStore } from '@travyl/shared'

interface Props {
  entityId: string
  entityType: 'place' | 'hotel' | 'activity' | 'destination'
  entityName: string
  variant?: 'default' | 'destination'
}

export function EntityActionsBar({ entityId, entityType, entityName, variant = 'default' }: Props) {
  const user = useAuthStore((s) => s.user)
  const [favorited, setFavorited] = useState(false)
  const [shared, setShared] = useState(false)

  const handleShare = async () => {
    const url = window.location.href
    if (navigator.share) {
      try {
        await navigator.share({ title: entityName, url })
      } catch {
        // user cancelled or error — silent
      }
    } else {
      await navigator.clipboard.writeText(url)
      setShared(true)
      setTimeout(() => setShared(false), 2000)
    }
  }

  const handleFavorite = () => {
    setFavorited((f) => !f)
  }

  if (!user) {
    return (
      <div className="px-6 md:px-10 py-4 border-b border-gray-100">
        <p className="text-sm text-gray-500">
          <Link href="/login" className="text-[#003594] hover:text-[#002B7A] font-medium underline-offset-2 hover:underline">
            Sign in
          </Link>{' '}
          to save this {entityType}
        </p>
      </div>
    )
  }

  return (
    <div className="px-6 md:px-10 py-4 border-b border-gray-100 flex items-center gap-3">
      {/* Primary CTA */}
      <button className="inline-flex items-center gap-2 bg-[#003594] hover:bg-[#002B7A] text-white text-sm font-medium px-4 py-2.5 rounded-xl transition-colors">
        <Plus className="w-4 h-4" />
        {variant === 'destination' ? 'Plan a Trip' : 'Add to Trip'}
      </button>

      {/* Favorite */}
      <button
        onClick={handleFavorite}
        aria-label={favorited ? 'Remove from favorites' : 'Add to favorites'}
        className={`inline-flex items-center justify-center w-10 h-10 rounded-xl border transition-colors ${
          favorited
            ? 'bg-red-50 border-red-200 text-red-500'
            : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300'
        }`}
      >
        {favorited ? (
          <HeartSolid className="w-4 h-4 text-red-500" />
        ) : (
          <Heart className="w-4 h-4" />
        )}
      </button>

      {/* Share */}
      <button
        onClick={handleShare}
        aria-label="Share"
        className="inline-flex items-center justify-center w-10 h-10 rounded-xl border border-gray-200 bg-white text-gray-500 hover:border-gray-300 transition-colors"
      >
        <ShareAndroid className="w-4 h-4" />
      </button>

      {shared && (
        <span className="text-xs text-gray-500 animate-in fade-in duration-200">Link copied!</span>
      )}
    </div>
  )
}
