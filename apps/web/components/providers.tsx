'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect, useState, useRef } from 'react';
import { useAuthStore, useSettingsStore, configureSupabase } from '@travyl/shared';
import { getSupabaseBrowser } from '@/lib/supabase-browser';
import { SpotlightSearch } from './spotlight/SpotlightSearch';

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

  const user = useAuthStore((s) => s.user);
  const hydrateSettings = useSettingsStore((s) => s.hydrate);

  useEffect(() => {
    if (!user) {
      hydrateSettings({});
      return;
    }
    const sb = getSupabaseBrowser();
    sb.from('profiles')
      .select('preferences')
      .eq('id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.preferences) {
          hydrateSettings(data.preferences as Record<string, unknown>);
        }
      });
  }, [user, hydrateSettings]);

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <SpotlightSearch />
    </QueryClientProvider>
  );
}

export default Providers;
