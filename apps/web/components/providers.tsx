'use client';

import { QueryClient } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import { createStore as createIdbStore, get as idbGet, set as idbSet, del as idbDel } from 'idb-keyval';
import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation'
import { useAuthStore, useSettingsStore, configureSupabase } from '@travyl/shared';
import { getSupabaseBrowser } from '@/lib/supabase-browser';
import { useCommandRegistry } from '@/stores/commandRegistry'
import { SITE_ROUTES } from '@/lib/sitemap'
import type { GlobalCommand } from '@/lib/commands/types'

// Configure supabase at module load — before any component renders or auth initializes
configureSupabase(getSupabaseBrowser());
import { SpotlightSearch } from './spotlight/SpotlightSearch';
import GlobalNavbar from './GlobalNavbar';
import { Toaster } from './ui/sonner';
import { OnboardingOverlay } from './onboarding';
import { useChordShortcuts } from '@/hooks/useChordShortcuts';
import { ChordHUD } from '@/components/ChordHUD';

// Bump when query payload shape changes incompatibly so old caches drop.
const PERSIST_BUSTER = 'travyl-rq-v1';
const PERSIST_MAX_AGE = 24 * 60 * 60 * 1000; // 24h — long enough to survive day-to-day use

// Browser-only IndexedDB persister. Falls back to a no-op store on the
// server (Next.js SSR) or in older browsers where indexedDB is unavailable.
function makeStorage() {
  if (typeof window === 'undefined' || typeof indexedDB === 'undefined') {
    return {
      getItem: async () => null,
      setItem: async () => undefined,
      removeItem: async () => undefined,
    };
  }
  const store = createIdbStore('travyl-rq', 'cache');
  return {
    getItem: (key: string) => idbGet<string>(key, store).then((v) => v ?? null),
    setItem: (key: string, value: string) => idbSet(key, value, store),
    removeItem: (key: string) => idbDel(key, store),
  };
}

export default function Providers({ children }: { children: React.ReactNode }) {
  const queryClientRef = useRef(
    new QueryClient({
      defaultOptions: {
        queries: {
          staleTime: 5 * 60 * 1000, // 5 min — cached data served instantly, no background refetch
          gcTime: 24 * 60 * 60 * 1000, // 24h — must be ≥ persist max age or persisted entries get evicted on hydrate
          refetchOnWindowFocus: false,
          refetchOnMount: false, // Don't refetch when component remounts (tab switches)
          retry: false,
        },
      },
    }),
  );

  const persisterRef = useRef(
    createAsyncStoragePersister({
      storage: makeStorage(),
      key: 'travyl-rq-cache',
      throttleTime: 1000, // Debounce write bursts during rapid invalidations
    }),
  );

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
    <PersistQueryClientProvider
      client={queryClientRef.current}
      persistOptions={{
        persister: persisterRef.current,
        maxAge: PERSIST_MAX_AGE,
        buster: PERSIST_BUSTER,
        dehydrateOptions: {
          // Only persist queries explicitly opted-in via meta.persist === true.
          // Trip preload + search results opt in; auth/profile/realtime do not.
          shouldDehydrateQuery: (query) => query.meta?.persist === true,
        },
      }}
    >
      <ChordShortcutProvider>
        <GlobalCommandRegistrar />
        <GlobalNavbar />
        {children}
        <SpotlightSearch />
        <OnboardingOverlay />
        <ChordHUD />
      </ChordShortcutProvider>
      <Toaster />
    </PersistQueryClientProvider>
  );
}

function GlobalCommandRegistrar() {
  const router = useRouter()
  const setGlobalCommands = useCommandRegistry((s) => s.setGlobalCommands)

  useEffect(() => {
    const commands: GlobalCommand[] = SITE_ROUTES.map((route) => ({
      id: `nav-${route.path}`,
      label: route.title,
      description: route.description,
      group: 'navigation' as const,
      icon: route.icon,
      isEnabled: true,
      execute: () => {
        const pathname = window.location.pathname
        if (pathname !== route.path) {
          router.push(route.path)
        }
      },
    }))

    commands.push({
      id: 'new-trip',
      label: 'New Trip',
      description: 'Create a new trip',
      group: 'action',
      chord: 'g+',
      isEnabled: true,
      execute: () => { router.push('/trips?new=true') },
    })

    setGlobalCommands(commands)
  }, [setGlobalCommands, router])

  return null
}

function ChordShortcutProvider({ children }: { children: React.ReactNode }) {
  useChordShortcuts()
  return <>{children}</>
}
