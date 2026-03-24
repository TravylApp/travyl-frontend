'use client';

import { createContext, useContext, useState, useCallback, useMemo, useEffect } from 'react';
import { resolveTheme, adjustBrightness } from '@travyl/shared';
import type { TripTheme, Trip } from '@travyl/shared';

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

export function TripThemeProvider({
  trip,
  children,
}: {
  trip: Trip | null;
  children: React.ReactNode;
}) {
  const [themeId, setThemeId] = useState('navy');
  const [customColor, setCustomColor] = useState<string | null>(null);
  const [tabColorOverrides, setTabColorOverrides] = useState<Record<string, string>>({});
  const [itineraryColorOverrides, setItineraryColorOverrides] = useState<Record<string, string>>({});
  const [hiddenTabs, setHiddenTabs] = useState<Record<string, boolean>>({});
  const [synced, setSynced] = useState(false);

  // Sync from trip data when it loads (once)
  useEffect(() => {
    if (!trip || synced) return;
    setThemeId(trip.theme ?? 'navy');
    setCustomColor(trip.custom_theme_color ?? null);
    if (trip.tab_color_overrides && Object.keys(trip.tab_color_overrides).length > 0) {
      setTabColorOverrides(trip.tab_color_overrides);
    }
    if (trip.itinerary_color_overrides && Object.keys(trip.itinerary_color_overrides).length > 0) {
      setItineraryColorOverrides(trip.itinerary_color_overrides);
    }
    if (trip.hidden_tabs && Object.keys(trip.hidden_tabs).length > 0) {
      setHiddenTabs(trip.hidden_tabs);
    }
    setSynced(true);
  }, [trip, synced]);

  // Reset sync flag when trip ID changes
  const tripId = trip?.id;
  useEffect(() => {
    setSynced(false);
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
