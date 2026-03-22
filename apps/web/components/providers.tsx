'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { useAuthStore, configureSupabase } from '@travyl/shared';
import { getSupabaseBrowser } from '@/lib/supabase-browser';

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

  // Configure synchronously during render so child component effects see the
  // cookie-based client. useEffect fires after child effects, which is too late.
  configureSupabase(getSupabaseBrowser());

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
