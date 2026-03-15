'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { useAuthStore } from '@travyl/shared';

export default function Providers({ children }: { children: React.ReactNode }) {
  const queryClientRef = useRef(new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 5 * 60 * 1000, // 5 min — cached data served instantly, no background refetch
        gcTime: 10 * 60 * 1000,   // 10 min — keep unused cache longer
        refetchOnWindowFocus: false,
        refetchOnMount: false,     // Don't refetch when component remounts (tab switches)
        retry: false,
      },
    },
  }));
  const initialize = useAuthStore((s) => s.initialize);

  useEffect(() => {
    const unsubscribe = initialize();
    return unsubscribe;
  }, [initialize]);

  return (
    <QueryClientProvider client={queryClientRef.current}>
      {children}
    </QueryClientProvider>
  );
}
