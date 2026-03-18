'use client'

import { createContext, useContext, useMemo } from 'react'
import type { ReactNode } from 'react'
import type { Trip, EffectivePermission, TripCollaborator } from '@travyl/shared'
import { useAuthStore } from '@travyl/shared'

const TripPermissionCtx = createContext<EffectivePermission>({
  role: 'viewer',
  canEdit: false,
  canDelete: false,
  canInvite: false,
  canCreateNotes: false,
})

export function useEffectivePermission(): EffectivePermission {
  return useContext(TripPermissionCtx)
}

interface TripPermissionProviderProps {
  trip: Trip
  collaborators: TripCollaborator[]
  children: ReactNode
}

export function TripPermissionProvider({ trip, collaborators, children }: TripPermissionProviderProps) {
  const user = useAuthStore((s) => s.user)

  const permission = useMemo<EffectivePermission>(() => {
    if (!user) {
      return { role: 'viewer', canEdit: false, canDelete: false, canInvite: false, canCreateNotes: false }
    }
    if (trip.user_id === user.id) {
      return { role: 'owner', canEdit: true, canDelete: true, canInvite: true, canCreateNotes: true }
    }
    const collab = collaborators.find((c) => c.user_id === user.id && c.invite_status === 'accepted')
    if (collab) {
      const isEditor = collab.role_type === 'editor'
      return { role: isEditor ? 'editor' : 'viewer', canEdit: isEditor, canDelete: false, canInvite: false, canCreateNotes: isEditor }
    }
    return { role: 'viewer', canEdit: false, canDelete: false, canInvite: false, canCreateNotes: false }
  }, [user, trip.user_id, collaborators])

  return <TripPermissionCtx.Provider value={permission}>{children}</TripPermissionCtx.Provider>
}
