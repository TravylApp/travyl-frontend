/**
 * @module useServerFavorites
 * Manages the authenticated user's server-persisted place favorites.
 * Provides a query for listing favorites plus mutations for adding and removing them.
 * Calls /api/favorites (GET/POST/DELETE) with a Bearer token header.
 * Used by place cards and the favorites page on both web and mobile.
 */

'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { ServerFavorite } from '../types';

/**
 * Resolves the API base URL for the current runtime environment.
 * Returns EXPO_PUBLIC_WEB_API_URL when running in Expo (mobile),
 * or an empty string for relative paths on the web.
 * @returns The API base URL string (may be empty)
 */
function getApiBase(): string {
  if (typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_WEB_API_URL) {
    return process.env.EXPO_PUBLIC_WEB_API_URL;
  }
  return '';
}

/**
 * Fetches, adds, and removes server-persisted favorites for an authenticated user.
 * The query is skipped when `authToken` is null. Both mutations invalidate the
 * `server-favorites` query on success so the list stays in sync automatically.
 * @param authToken - Supabase JWT Bearer token for the current user; null disables the query
 * @returns React Query result spread plus `addFavorite`, `removeFavorite`, `isAdding`, `isRemoving`
 * @example
 * ```tsx
 * const { data: favs, addFavorite, removeFavorite } = useServerFavorites(token);
 * const isFaved = favs?.some(f => f.place_id === placeId);
 * <button onClick={() => isFaved ? removeFavorite(fav.id) : addFavorite(placeId)}>
 *   {isFaved ? 'Unfavorite' : 'Favorite'}
 * </button>
 * ```
 */
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
