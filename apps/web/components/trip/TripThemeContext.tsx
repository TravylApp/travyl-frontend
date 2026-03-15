'use client';

import { createContext, useContext, useState, useCallback, useMemo, useEffect } from 'react';
import { resolveTheme, adjustBrightness } from '@travyl/shared';
import type { TripTheme } from '@travyl/shared';

interface TripThemeContextValue {
  theme: TripTheme;
  themeId: string;
  customColor: string | null;
  setTripTheme: (id: string, customColor?: string) => void;
  tabColorOverrides: Record<string, string>;
  setTabColor: (name: string, color: string) => void;
  resetTabColors: () => void;
  itineraryColorOverrides: Record<string, string>;
  setItineraryColor: (section: string, color: string) => void;
  resetItineraryColors: () => void;
  hiddenTabs: Record<string, boolean>;
  setTabHidden: (segment: string, hidden: boolean) => void;
}

const TripThemeCtx = createContext<TripThemeContextValue | null>(null);

function hexToRgb(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `${r} ${g} ${b}`;
}

function getStorageKey(tripId: string) {
  return `trip-theme-${tripId}`;
}

interface PersistedThemeState {
  themeId: string;
  customColor: string | null;
  tabColorOverrides: Record<string, string>;
  itineraryColorOverrides: Record<string, string>;
  hiddenTabs: Record<string, boolean>;
}

function loadPersistedState(tripId: string): PersistedThemeState | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(getStorageKey(tripId));
    if (!raw) return null;
    return JSON.parse(raw) as PersistedThemeState;
  } catch {
    return null;
  }
}

function persistState(tripId: string, state: PersistedThemeState) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(getStorageKey(tripId), JSON.stringify(state));
  } catch {
    // storage full or unavailable — silently ignore
  }
}

export function TripThemeProvider({
  tripId,
  initialThemeId = 'navy',
  initialCustomColor,
  children,
}: {
  tripId: string;
  initialThemeId?: string;
  initialCustomColor?: string | null;
  children: React.ReactNode;
}) {
  // Always initialize with defaults so server and client match (avoids hydration mismatch)
  const [themeId, setThemeId] = useState(initialThemeId);
  const [customColor, setCustomColor] = useState<string | null>(initialCustomColor ?? null);
  const [tabColorOverrides, setTabColorOverrides] = useState<Record<string, string>>({});
  const [itineraryColorOverrides, setItineraryColorOverrides] = useState<Record<string, string>>({});
  const [hiddenTabs, setHiddenTabs] = useState<Record<string, boolean>>({});
  const [hydrated, setHydrated] = useState(false);

  // After mount, restore persisted state from localStorage
  useEffect(() => {
    const saved = loadPersistedState(tripId);
    if (saved) {
      setThemeId(saved.themeId);
      setCustomColor(saved.customColor);
      setTabColorOverrides(saved.tabColorOverrides ?? {});
      setItineraryColorOverrides(saved.itineraryColorOverrides ?? {});
      setHiddenTabs(saved.hiddenTabs ?? {});
    }
    setHydrated(true);
  }, [tripId]);

  const theme = resolveTheme(themeId, customColor ?? undefined);

  const cssVars = useMemo(() => ({
    '--trip-base': theme.base,
    '--trip-base-rgb': hexToRgb(theme.base),
    '--trip-base-dark': theme.baseDark,
    '--trip-base-light': adjustBrightness(theme.base, 20),
    '--trip-accent': theme.accent,
    '--trip-text': theme.textOnBase,
  } as React.CSSProperties), [theme]);

  const setTripTheme = useCallback((id: string, color?: string) => {
    setThemeId(id);
    setCustomColor(color ?? null);
  }, []);

  const setTabColor = useCallback((name: string, color: string) => {
    setTabColorOverrides((prev) => ({ ...prev, [name]: color }));
  }, []);

  const resetTabColors = useCallback(() => setTabColorOverrides({}), []);

  const setItineraryColor = useCallback((section: string, color: string) => {
    setItineraryColorOverrides((prev) => ({ ...prev, [section]: color }));
  }, []);

  const resetItineraryColors = useCallback(() => setItineraryColorOverrides({}), []);

  const setTabHidden = useCallback((segment: string, hidden: boolean) => {
    setHiddenTabs((prev) => ({ ...prev, [segment]: hidden }));
  }, []);

  // Persist to localStorage whenever any theme state changes (only after hydration to avoid overwriting with defaults)
  useEffect(() => {
    if (!hydrated) return;
    persistState(tripId, { themeId, customColor, tabColorOverrides, itineraryColorOverrides, hiddenTabs });
  }, [hydrated, tripId, themeId, customColor, tabColorOverrides, itineraryColorOverrides, hiddenTabs]);

  return (
    <TripThemeCtx.Provider
      value={{
        theme, themeId, customColor,
        setTripTheme,
        tabColorOverrides, setTabColor, resetTabColors,
        itineraryColorOverrides, setItineraryColor, resetItineraryColors,
        hiddenTabs, setTabHidden,
      }}
    >
      <div style={cssVars}>{children}</div>
    </TripThemeCtx.Provider>
  );
}

export function useTripTheme() {
  const ctx = useContext(TripThemeCtx);
  if (!ctx) throw new Error('useTripTheme must be used inside TripThemeProvider');
  return ctx;
}
