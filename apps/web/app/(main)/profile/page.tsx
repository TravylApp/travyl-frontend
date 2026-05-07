'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useTrips, useAuthStore, useProfile } from '@travyl/shared'
import type { Trip, TripCard as TripCardType } from '@travyl/shared'
import { TripCard } from '@/components/trips/TripCard'
import { PlaceholderAvatar } from '@/components/ui/PlaceholderAvatar'
import { Settings, LogOut, MapPin, Calendar, Heart } from 'lucide-react'
import { toast } from 'sonner'

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

  const [activeTab, setActiveTab] = useState<'trips' | 'favorites'>('trips')

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
  const homeCity = profile?.city
    ? profile.country
      ? `${profile.city}, ${profile.country}`
      : profile.city
    : null

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
              icon={<Heart size={14} className="text-rose-500" />}
              value={trips?.filter((t) => t.status === 'planning').length || 0}
              label="In planning"
            />
          </div>
        </div>
      </header>

      {/* Tabs */}
      <nav className="relative bg-background/60 backdrop-blur border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex gap-8">
          <TabButton active={activeTab === 'trips'} onClick={() => setActiveTab('trips')}>My trips</TabButton>
          <TabButton active={activeTab === 'favorites'} onClick={() => setActiveTab('favorites')}>Favorites</TabButton>
        </div>
      </nav>

      {/* Content */}
      <section className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-12">
        {activeTab === 'trips' && (
          <div>
            {tripsLoading ? (
              <div className="text-center py-16">
                <div className="w-10 h-10 border-4 border-[#1e3a5f] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                <p className="text-sm text-muted-foreground">Loading trips…</p>
              </div>
            ) : trips && trips.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {trips.map((trip) => (
                  <TripCard key={trip.id} trip={tripToCard(trip)} />
                ))}
              </div>
            ) : (
              <EmptyState
                icon={<MapPin className="w-12 h-12 text-[#1e3a5f]/30" />}
                title="No trips yet"
                body="Create your first trip and we'll help you plan, pack, and explore."
                cta={{ href: '/trips', label: 'Explore trips' }}
              />
            )}
          </div>
        )}

        {activeTab === 'favorites' && (
          <EmptyState
            icon={<Heart className="w-12 h-12 text-[#1e3a5f]/30" />}
            title="No favorites yet"
            body="Save places and destinations to see them here."
            cta={{ href: '/places', label: 'Explore destinations' }}
          />
        )}
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

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className={`relative py-4 text-sm font-medium tracking-wide transition-colors ${
        active ? 'text-[#1e3a5f]' : 'text-muted-foreground hover:text-foreground'
      }`}
    >
      {children}
      {active && (
        <span className="absolute left-0 right-0 -bottom-px h-0.5 bg-[#1e3a5f] rounded-full" />
      )}
    </button>
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
