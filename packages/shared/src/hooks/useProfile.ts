import { useQuery } from '@tanstack/react-query';
import { fetchProfile } from '../services/api';
import { useAuthStore } from '../stores/authStore';

export function useProfile() {
  const user = useAuthStore((s) => s.user);
  return useQuery({
    queryKey: ['profile', user?.id],
    queryFn: () => fetchProfile(user!.id),
    enabled: !!user,
  });
}
