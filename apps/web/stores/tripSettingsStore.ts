import { create } from 'zustand'
import { useEffect } from 'react'
import { useAuthStore, isTripOwner, canEditTrip, updateTripDetails } from '@travyl/shared'
import type { Trip } from '@travyl/shared'
import { useTripTheme } from '@/components/trip/TripThemeContext'
import { useItineraryScreen } from '@travyl/shared'

// ─── Types ────────────────────────────────────────────────────

export interface TripSettingsRegistration {
  tripId: string
  themeId: string
  customColor: string | null
  hiddenTabs: Record<string, boolean>
  status: Trip['status']
  canEdit: boolean
  isOwner: boolean
  setTripTheme: (id: string, color?: string) => void
  setTabHidden: (segment: string, hidden: boolean) => void
  setStatus: (status: Trip['status']) => void
}

interface TripSettingsStoreState {
  registration: TripSettingsRegistration | null
  register: (reg: TripSettingsRegistration) => void
  unregister: () => void
}

// ─── Store ────────────────────────────────────────────────────

export const useTripSettingsStore = create<TripSettingsStoreState>((set) => ({
  registration: null,
  register: (reg) => set({ registration: reg }),
  unregister: () => set({ registration: null }),
}))

// ─── Registration Hook ───────────────────────────────────────

export function useTripSettingsRegistration(tripId: string) {
  const { trip, refetch } = useItineraryScreen(tripId)
  const user = useAuthStore((s) => s.user)
  const { themeId, customColor, hiddenTabs, setTripTheme, setTabHidden } = useTripTheme()
  const register = useTripSettingsStore((s) => s.register)
  const unregister = useTripSettingsStore((s) => s.unregister)

  useEffect(() => {
    if (!trip || !user) return

    const isOwner = isTripOwner(trip, user.id)
    const canEdit = canEditTrip(trip, user.id)

    register({
      tripId: trip.id,
      themeId,
      customColor,
      hiddenTabs,
      status: trip.status,
      canEdit,
      isOwner,
      setTripTheme,
      setTabHidden: (segment, hidden) => setTabHidden(segment, hidden),
      setStatus: async (status) => {
        await updateTripDetails(trip.id, { status })
        refetch()
      },
    })

    return () => unregister()
  }, [trip, user, themeId, customColor, hiddenTabs, register, unregister, setTripTheme, setTabHidden, refetch])
}
