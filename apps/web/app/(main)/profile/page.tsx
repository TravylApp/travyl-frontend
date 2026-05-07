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

// Transform Trip to TripCard for the component
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
    } catch (error) {
      toast.error('Failed to sign out')
    }
  }

  const metadataDisplayName = [
    user?.user_metadata?.display_name,
    user?.user_metadata?.full_name,
    [user?.user_metadata?.name, user?.user_metadata?.lastName].filter(Boolean).join(' ').trim(),
  ].find((value) => typeof value === 'string' && value.trim().length > 0)
  const displayName = profile?.display_name || metadataDisplayName || user?.email?.split('@')[0] || 'User'
  const initials = displayName
    .split(' ')
    .map((word: string) => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  const tripCount = trips?.length || 0

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-card border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-6">
              {/* Avatar */}
              <div className="shadow-lg rounded-full shrink-0">
                <PlaceholderAvatar
                  userId={user?.id}
                  name={displayName}
                  email={user?.email}
                  avatarUrl={profile?.avatar_url || user?.user_metadata?.avatar_url || user?.user_metadata?.picture || null}
                  size={96}
                />
              </div>

              {/* User Info */}
              <div>
                <h1 className="text-3xl font-bold text-foreground mb-2">{displayName}</h1>
                <p className="text-muted-foreground mb-4">{user?.email}</p>

                {/* Stats */}
                <div className="flex gap-6">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-primary" />
                    <div>
                      <p className="text-2xl font-bold text-foreground">{tripCount}</p>
                      <p className="text-sm text-muted-foreground">Trips</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-[#F59E0B]" />
                    <div>
                      <p className="text-2xl font-bold text-foreground">
                        {trips?.filter(t => t.status === 'completed').length || 0}
                      </p>
                      <p className="text-sm text-muted-foreground">Completed</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <Link
                href="/profile/settings"
                className="flex items-center gap-2 px-4 py-2 text-muted-foreground hover:bg-muted rounded-lg transition-colors"
              >
                <Settings className="w-5 h-5" />
                Settings
              </Link>
              <button
                onClick={handleSignOut}
                className="flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              >
                <LogOut className="w-5 h-5" />
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-card border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex gap-8">
            <button
              onClick={() => setActiveTab('trips')}
              className={`py-4 px-2 border-b-2 font-medium transition-colors ${
                activeTab === 'trips'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              My Trips
            </button>
            <button
              onClick={() => setActiveTab('favorites')}
              className={`py-4 px-2 border-b-2 font-medium transition-colors ${
                activeTab === 'favorites'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              Favorites
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'trips' && (
          <div>
            {tripsLoading ? (
              <div className="text-center py-12">
                <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                <p className="text-muted-foreground">Loading trips...</p>
              </div>
            ) : trips && trips.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {trips.map((trip) => (
                  <TripCard key={trip.id} trip={tripToCard(trip)} />
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <MapPin className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-foreground mb-2">No trips yet</h3>
                <p className="text-muted-foreground mb-6">Create your first trip to get started!</p>
                <Link
                  href="/trips"
                  className="inline-block px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                >
                  Explore Trips
                </Link>
              </div>
            )}
          </div>
        )}

        {activeTab === 'favorites' && (
          <div className="text-center py-12">
            <Heart className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-foreground mb-2">No favorites yet</h3>
            <p className="text-muted-foreground mb-6">
              Save places and destinations to see them here
            </p>
            <Link
              href="/"
              className="inline-block px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
            >
              Explore Destinations
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
