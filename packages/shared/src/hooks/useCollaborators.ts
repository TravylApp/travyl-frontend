/**
 * @module useCollaborators
 * Fetches the list of collaborators for a trip and provides mutations to update
 * a collaborator's role or remove them entirely. All mutations invalidate the
 * cached collaborator list on success so the UI stays in sync.
 * Used by the web and mobile sharing/collaborators settings panel.
 */

'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchCollaborators, updateCollaboratorRole, removeCollaborator } from '../services/api';
import type { CollaboratorRole } from '../types';

/**
 * Loads collaborators for a trip and exposes role-management mutations.
 *
 * The query is disabled while `tripId` is undefined. Both `updateRole` and
 * `removeCollaborator` invalidate `['collaborators', tripId]` on success.
 *
 * @param tripId - UUID of the trip, or undefined while loading
 * @returns Object with:
 *   - `collaborators` — array of collaborator records (defaults to `[]`)
 *   - `isLoading` — true while the query is pending
 *   - `error` — query error, if any
 *   - `updateRole({ collaboratorId, role })` — change a collaborator's role
 *   - `removeCollaborator(collaboratorId)` — remove a collaborator from the trip
 *
 * @example
 * ```tsx
 * const { collaborators, updateRole, removeCollaborator } = useCollaborators(tripId);
 * updateRole({ collaboratorId: 'abc', role: 'viewer' });
 * ```
 */
export function useCollaborators(tripId: string | undefined) {
  const queryClient = useQueryClient();
  const queryKey = ['collaborators', tripId];

  const query = useQuery({
    queryKey,
    queryFn: () => fetchCollaborators(tripId!),
    enabled: !!tripId,
  });

  const updateRole = useMutation({
    mutationFn: ({ collaboratorId, role }: { collaboratorId: string; role: CollaboratorRole }) =>
      updateCollaboratorRole(collaboratorId, role),
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  const remove = useMutation({
    mutationFn: (collaboratorId: string) => removeCollaborator(collaboratorId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  return {
    collaborators: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    updateRole: updateRole.mutate,
    removeCollaborator: remove.mutate,
  };
}
