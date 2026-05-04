/**
 * @module useProfile
 * Fetches the Supabase profile record for the currently authenticated user.
 * The query is kept disabled when no user is logged in.
 * Used by the web and mobile profile/settings screens.
 */

'use client';

import { useQuery } from '@tanstack/react-query';
import { fetchProfile } from '../services/api';
import { useAuthStore } from '../stores/authStore';

/**
 * Fetches the profile record for the currently authenticated user.
 * The query is disabled when `user` is `null` (i.e., logged-out state),
 * preventing unnecessary network requests.
 * @returns React Query result with `data: Profile`, `isLoading`, and `error`
 * @example
 * ```tsx
 * const { data: profile, isLoading } = useProfile();
 * if (isLoading) return <Spinner />;
 * return <Avatar url={profile?.avatar_url} />;
 * ```
 */
export function useProfile() {
  const user = useAuthStore((s) => s.user);
  return useQuery({
    queryKey: ['profile', user?.id],
    queryFn: () => fetchProfile(user!.id),
    enabled: !!user,
  });
}
