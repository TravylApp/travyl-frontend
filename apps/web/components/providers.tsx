'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useAuthStore, configureSupabase } from '@travyl/shared';
import { getSupabaseBrowser } from '@/lib/supabase-browser';
import { GlobalCommandPalette } from './GlobalCommandPalette';

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 5 * 60 * 1000,
        gcTime: 10 * 60 * 1000,
        refetchOnWindowFocus: false,
        refetchOnMount: false,
        retry: false,
      },
    },
  }));

  const initialize = useAuthStore((s) => s.initialize);

  // Configure synchronously during render so child component effects see the
  // cookie-based client. useEffect fires after child effects, which is too late.
  const supabaseClient = getSupabaseBrowser();
  if (supabaseClient) {
    configureSupabase(supabaseClient);
  }

  useEffect(() => {
    const unsubscribe = initialize();
    return unsubscribe;
  }, [initialize]);

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <GlobalCommandPalette />
    </QueryClientProvider>
  );
}

export default Providers;
