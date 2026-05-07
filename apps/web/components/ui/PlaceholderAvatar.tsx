/**
 * PlaceholderAvatar — gradient circle shown when a user has no avatar_url.
 *
 * The component was referenced from `bcaba4e7 feat: UI homogenization` but
 * the file was never committed; rather than scatter inline placeholder
 * markup across the 3 consumers (GlobalNavbar, profile/page, user/page),
 * we restore the component with the obvious implementation: deterministic
 * gradient seeded by userId so the same user always gets the same color
 * across the app, with a static fallback for anon users.
 */

interface Props {
  userId?: string | null
  size?: number
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

export function PlaceholderAvatar({ userId, size = 32 }: Props) {
  const [from, to] = pickGradient(userId)
  return (
    <div
      aria-hidden
      className="rounded-full"
      style={{
        width: size,
        height: size,
        background: `linear-gradient(135deg, ${from}, ${to})`,
      }}
    />
  )
}
