'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { ServerFavorite } from '../types';

function getApiBase(): string {
  if (typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_WEB_API_URL) {
    return process.env.EXPO_PUBLIC_WEB_API_URL;
  }
  return '';
}

export function useServerFavorites(authToken: string | null) {
  const base = getApiBase();
  const queryClient = useQueryClient();

  const query = useQuery<ServerFavorite[]>({
    queryKey: ['server-favorites'],
    queryFn: async () => {
      const res = await fetch(`${base}/api/favorites`, {
        headers: { Authorization: `Bearer ${authToken!}` },
      });
      if (!res.ok) throw new Error('Favorites fetch failed');
      return res.json() as Promise<ServerFavorite[]>;
    },
    enabled: !!authToken,
    staleTime: 5 * 60 * 1000,
  });

  const addFavorite = useMutation({
    mutationFn: async (placeId: string) => {
      const res = await fetch(`${base}/api/favorites`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ place_id: placeId }),
      });
      if (!res.ok) throw new Error('Add favorite failed');
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['server-favorites'] }),
  });

  const removeFavorite = useMutation({
    mutationFn: async (favoriteId: string) => {
      const res = await fetch(`${base}/api/favorites/${favoriteId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (!res.ok) throw new Error('Remove favorite failed');
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['server-favorites'] }),
  });

  return {
    ...query,
    addFavorite: addFavorite.mutate,
    removeFavorite: removeFavorite.mutate,
    isAdding: addFavorite.isPending,
    isRemoving: removeFavorite.isPending,
  };
}
