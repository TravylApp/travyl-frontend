import { useQuery } from '@tanstack/react-query';
import { fetchSavedItems } from '../services/api';
import { useAuthStore } from '../stores/authStore';

export function useSavedItems() {
  const user = useAuthStore((s) => s.user);
  return useQuery({
    queryKey: ['savedItems'],
    queryFn: fetchSavedItems,
    enabled: !!user,
  });
}
