'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, useEffect, useRef } from 'react';
import { useAuthStore, useSettingsStore, configureSupabase } from '@travyl/shared';
import { getSupabaseBrowser } from '@/lib/supabase-browser';

// Configure supabase at module load — before any component renders or auth initializes
configureSupabase(getSupabaseBrowser());
import { SpotlightSearch } from './spotlight/SpotlightSearch';
import GlobalNavbar from './GlobalNavbar';
import { Toaster } from './ui/sonner';
import { OnboardingOverlay } from './onboarding';

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
    <QueryClientProvider client={queryClientRef.current}>
      <GlobalNavbar />
      {children}
      <SpotlightSearch />
      <OnboardingOverlay />
      <Toaster />
    </QueryClientProvider>
  );
}
