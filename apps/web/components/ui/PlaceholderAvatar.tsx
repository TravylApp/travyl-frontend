'use client'

/**
 * PlaceholderAvatar — user avatar with three render priorities:
 *   1. `avatarUrl` (e.g. Google photo from `user.user_metadata.avatar_url`
 *      or `picture`, or a Supabase profile.avatar_url) — img with onError
 *      fallback to initial.
 *   2. Initial of `name` (or first char of email if name absent) — white
 *      letter centered on a deterministic gradient seeded by userId.
 *   3. Bare gradient — when neither URL nor name/email is known
 *      (anonymous / placeholder render).
 */

import { useState } from 'react'

interface Props {
  userId?: string | null
  /** Display name; first character is used when avatarUrl is missing or fails. */
  name?: string | null
  /** Email fallback if `name` isn't provided — first character before '@'. */
  email?: string | null
  /** Avatar image URL — Google OAuth photo, Supabase-stored upload, etc. */
  avatarUrl?: string | null
  size?: number
  className?: string
}

const GRADIENTS = [
  ['#1e3a5f', '#3b82f6'],
  ['#7c3aed', '#a855f7'],
  ['#059669', '#10b981'],
  ['#d97706', '#f59e0b'],
  ['#dc2626', '#f87171'],
  ['#0891b2', '#06b6d4'],
  ['#be185d', '#ec4899'],
  ['#65a30d', '#84cc16'],
] as const

function pickGradient(userId: string | null | undefined): readonly [string, string] {
  if (!userId) return GRADIENTS[0]
  let h = 0
  for (let i = 0; i < userId.length; i++) h = (h * 31 + userId.charCodeAt(i)) | 0
  return GRADIENTS[Math.abs(h) % GRADIENTS.length]
}

function getInitial(name?: string | null, email?: string | null): string | null {
  const source = name?.trim() || email?.split('@')[0]?.trim()
  if (!source) return null
  const ch = source.charAt(0)
  return ch ? ch.toUpperCase() : null
}

export function PlaceholderAvatar({ userId, name, email, avatarUrl, size = 32, className }: Props) {
  const [imgFailed, setImgFailed] = useState(false)
  const [from, to] = pickGradient(userId)
  const initial = getInitial(name, email)
  const showImage = !!avatarUrl && !imgFailed

  if (showImage) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={avatarUrl!}
        alt={name ?? email ?? 'User avatar'}
        referrerPolicy="no-referrer"
        onError={() => setImgFailed(true)}
        className={`rounded-full object-cover ${className ?? ''}`}
        style={{ width: size, height: size }}
      />
    )
  }

  return (
    <div
      aria-hidden={!initial}
      role={initial ? 'img' : undefined}
      aria-label={initial ? (name ?? email ?? 'User avatar') : undefined}
      className={`rounded-full flex items-center justify-center select-none ${className ?? ''}`}
      style={{
        width: size,
        height: size,
        background: `linear-gradient(135deg, ${from}, ${to})`,
        color: 'white',
        fontSize: Math.max(11, Math.round(size * 0.42)),
        fontWeight: 600,
        lineHeight: 1,
      }}
    >
      {initial}
    </div>
  )
}
