import { useQuery } from '@tanstack/react-query';
import { fetchTrips } from '../services/api';
import { useAuthStore } from '../stores/authStore';
import { MOCK_TRIPS } from '../config/mockTripsData';
import { USE_MOCK_DATA } from '../config/featureFlags';

export function useTrips() {
  const user = useAuthStore((s) => s.user);
  return useQuery({
    queryKey: ['trips'],
    queryFn: user ? fetchTrips : () => Promise.resolve(MOCK_TRIPS),
    enabled: !!user || USE_MOCK_DATA,
  });
}
