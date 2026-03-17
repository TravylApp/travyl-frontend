import { useQuery } from '@tanstack/react-query';
import { fetchHeroConfig } from '../services/api';

export function useHeroConfig() {
  return useQuery({
    queryKey: ['hero-config'],
    queryFn: fetchHeroConfig,
  });
}
