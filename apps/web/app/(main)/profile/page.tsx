'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useTrips, useAuthStore, useProfile } from '@travyl/shared'
import type { Trip, TripCard as TripCardType } from '@travyl/shared'
import { TripCard } from '@/components/trips/TripCard'
import { PlaceholderAvatar } from '@/components/ui/PlaceholderAvatar'
import { Settings, LogOut, MapPin, Calendar, Search, X } from 'lucide-react'
import { toast } from 'sonner'

type StatusFilter = 'all' | 'planning' | 'booked' | 'active' | 'completed'

const STATUS_OPTIONS: { id: StatusFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'planning', label: 'Planning' },
  { id: 'booked', label: 'Booked' },
  { id: 'active', label: 'Traveling' },
  { id: 'completed', label: 'Completed' },
]

function tripToCard(trip: Trip): TripCardType {
  const coverImage = trip.cover_image_url || trip.trip_context?.hero_images?.[0] || ''
  return {
    ...trip,
    image: coverImage,
    images: trip.trip_context?.hero_images || [],
  }
}

export default function ProfilePage() {
  const router = useRouter()
  const user = useAuthStore((s) => s.user)
  const signOut = useAuthStore((s) => s.signOut)
  const { data: profile } = useProfile()
  const { data: trips, isLoading: tripsLoading } = useTrips()

  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [query, setQuery] = useState('')

  const handleSignOut = async () => {
    try {
      await signOut()
      toast.success('Signed out successfully')
      router.push('/')
    } catch {
      toast.error('Failed to sign out')
    }
  }

  const metadataDisplayName = [
    user?.user_metadata?.display_name,
    user?.user_metadata?.full_name,
    [user?.user_metadata?.name, user?.user_metadata?.lastName].filter(Boolean).join(' ').trim(),
  ].find((value) => typeof value === 'string' && value.trim().length > 0)
  const displayName = profile?.display_name || metadataDisplayName || user?.email?.split('@')[0] || 'User'

  const tripCount = trips?.length || 0
  const completedCount = trips?.filter((t) => t.status === 'completed').length || 0
  const planningCount = trips?.filter((t) => t.status === 'planning').length || 0
  const homeCity = profile?.city
    ? profile.country
      ? `${profile.city}, ${profile.country}`
      : profile.city
    : null

  const statusCounts = useMemo(() => {
    const counts: Record<StatusFilter, number> = { all: 0, planning: 0, booked: 0, active: 0, completed: 0 }
    if (!trips) return counts
    counts.all = trips.length
    for (const t of trips) {
      if (t.status in counts) counts[t.status as StatusFilter] = (counts[t.status as StatusFilter] || 0) + 1
    }
    return counts
  }, [trips])

  const filteredTrips = useMemo(() => {
    if (!trips) return []
    const q = query.trim().toLowerCase()
    return trips.filter((t) => {
      if (statusFilter !== 'all' && t.status !== statusFilter) return false
      if (!q) return true
      return (
        t.title.toLowerCase().includes(q) ||
        t.destination.toLowerCase().includes(q)
      )
    })
  }, [trips, statusFilter, query])

  return (
    <div className="min-h-screen bg-background relative">
      {/* Sand wash echoing the home hero */}
      <div
        aria-hidden
        className="absolute inset-x-0 top-0 h-[420px] bg-[radial-gradient(ellipse_at_top,_rgba(242,230,216,0.55),_transparent_70%)] pointer-events-none"
      />

      {/* Header */}
      <header className="relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 md:pt-16 pb-8">
          <div className="flex items-start justify-between gap-6 flex-wrap">
            <div className="flex items-center gap-6 min-w-0">
              <div className="shadow-md rounded-full shrink-0 ring-4 ring-background">
                <PlaceholderAvatar
                  userId={user?.id}
                  name={displayName}
                  email={user?.email}
                  avatarUrl={profile?.avatar_url || user?.user_metadata?.avatar_url || user?.user_metadata?.picture || null}
                  size={104}
                />
              </div>

              <div className="min-w-0">
                <p className="text-[11px] font-bold uppercase tracking-widest text-[#1e3a5f] mb-2">
                  Traveler
                </p>
                <h1 className="text-3xl md:text-4xl font-serif font-normal tracking-wide text-foreground truncate">
                  {displayName}
                </h1>
                <p className="text-sm text-muted-foreground mt-1.5">{user?.email}</p>
                {homeCity && (
                  <p className="inline-flex items-center gap-1.5 text-xs text-muted-foreground mt-2">
                    <MapPin size={12} className="text-[#1e3a5f]" />
                    {homeCity}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Link
                href="/profile/settings"
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-foreground hover:bg-card border border-border rounded-xl transition-colors"
              >
                <Settings className="w-4 h-4" />
                Settings
              </Link>
              <button
                onClick={handleSignOut}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Sign out
              </button>
            </div>
          </div>

          {/* Stats — subtle pills on the magazine-surface wash */}
          <div className="mt-8 flex flex-wrap gap-3">
            <StatPill icon={<MapPin size={14} className="text-[#1e3a5f]" />} value={tripCount} label="Trips" />
            <StatPill icon={<Calendar size={14} className="text-[#b8953e]" />} value={completedCount} label="Completed" />
            <StatPill
              icon={<MapPin size={14} className="text-emerald-600" />}
              value={planningCount}
              label="In planning"
            />
          </div>
        </div>
      </header>

      {/* Content */}
      <section className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12 md:pb-16">
        <div className="border-t border-border pt-8">
          <div className="flex items-center justify-between gap-4 mb-6 flex-wrap">
            <h2 className="text-xl md:text-2xl font-serif font-normal tracking-wide text-foreground">My trips</h2>

            <div className="relative w-full sm:w-72">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by name or destination…"
                className="w-full h-10 pl-9 pr-9 text-sm text-foreground bg-card border border-border rounded-xl placeholder:text-muted-foreground/70 focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20 focus:border-[#1e3a5f]/40 transition-colors"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  aria-label="Clear search"
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 inline-flex items-center justify-center rounded-md text-muted-foreground hover:bg-muted"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>

          {/* Status filter chips */}
          <div className="flex flex-wrap gap-2 mb-6">
            {STATUS_OPTIONS.map((opt) => {
              const count = statusCounts[opt.id]
              const isActive = statusFilter === opt.id
              return (
                <button
                  key={opt.id}
                  onClick={() => setStatusFilter(opt.id)}
                  className={`inline-flex items-center gap-2 px-3.5 h-9 rounded-full border text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-[#1e3a5f] text-white border-[#1e3a5f]'
                      : 'bg-card text-foreground border-border hover:border-[#1e3a5f]/40'
                  }`}
                >
                  {opt.label}
                  <span
                    className={`text-xs tabular-nums ${
                      isActive ? 'text-white/70' : 'text-muted-foreground'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              )
            })}
          </div>

          {tripsLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-64 rounded-2xl bg-muted shimmer-skeleton" />
              ))}
            </div>
          ) : !trips || trips.length === 0 ? (
            <EmptyState
              icon={<MapPin className="w-12 h-12 text-[#1e3a5f]/30" />}
              title="No trips yet"
              body="Create your first trip and we'll help you plan, pack, and explore."
              cta={{ href: '/trips', label: 'Explore trips' }}
            />
          ) : filteredTrips.length === 0 ? (
            <EmptyState
              icon={<Search className="w-10 h-10 text-[#1e3a5f]/30" />}
              title="Nothing matches"
              body={
                query
                  ? `No trips match "${query}"${statusFilter !== 'all' ? ` in ${statusFilter}` : ''}.`
                  : `You don't have any ${statusFilter} trips yet.`
              }
              cta={{ href: '/trips', label: 'Browse all trips' }}
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredTrips.map((trip) => (
                <TripCard key={trip.id} trip={tripToCard(trip)} />
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  )
}

function StatPill({ icon, value, label }: { icon: React.ReactNode; value: number; label: string }) {
  return (
    <div className="inline-flex items-center gap-2.5 pl-3 pr-4 py-2 rounded-full border border-border bg-card">
      {icon}
      <span className="text-base font-serif text-foreground tabular-nums">{value}</span>
      <span className="text-xs uppercase tracking-widest text-muted-foreground font-semibold">{label}</span>
    </div>
  )
}

function EmptyState({
  icon,
  title,
  body,
  cta,
}: {
  icon: React.ReactNode
  title: string
  body: string
  cta: { href: string; label: string }
}) {
  return (
    <div className="text-center py-16 max-w-md mx-auto">
      <div className="flex justify-center mb-5">{icon}</div>
      <h3 className="text-xl md:text-2xl font-serif font-normal tracking-wide text-foreground mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground mb-6">{body}</p>
      <Link
        href={cta.href}
        className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#1e3a5f] hover:bg-[#162d4a] text-white rounded-xl text-sm font-semibold transition-colors"
      >
        {cta.label}
      </Link>
    </div>
  )
}
