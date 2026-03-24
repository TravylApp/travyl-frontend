import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchCollaborators, updateCollaboratorRole, removeCollaborator } from '../services/api';
import type { CollaboratorRole } from '../types';

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
