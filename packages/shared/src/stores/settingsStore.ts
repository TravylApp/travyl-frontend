'use client';

// packages/shared/src/stores/settingsStore.ts
import { create } from 'zustand';
import { supabase } from '../services/supabase';

// ─── Types ────────────────────────────────────────────────────

export type Currency = string;
export type DistanceUnits = 'miles' | 'kilometers';
export type TravelStyle = 'balanced' | 'budget' | 'luxury' | 'adventure' | 'relaxed';
export type TimeFormat = '12h' | '24h';

const ISO_4217_PATTERN = /^[A-Z]{3}$/;
const VALID_DISTANCE_UNITS: DistanceUnits[] = ['miles', 'kilometers'];
const VALID_TRAVEL_STYLES: TravelStyle[] = ['balanced', 'budget', 'luxury', 'adventure', 'relaxed'];
const VALID_TIME_FORMATS: TimeFormat[] = ['12h', '24h'];

const DEFAULTS = {
  currency: 'USD' as Currency,
  distanceUnits: 'miles' as DistanceUnits,
  travelStyle: 'balanced' as TravelStyle,
  timeFormat: '12h' as TimeFormat,
  preferredAirport: '' as string, // 3-letter IATA, blank when unset
  pushNotifications: true,
  emailNotifications: false,
};

// ─── Validation helpers ───────────────────────────────────────

function validCurrency(v: unknown): Currency {
  return typeof v === 'string' && ISO_4217_PATTERN.test(v) ? v : DEFAULTS.currency;
}

function validDistanceUnits(v: unknown): DistanceUnits {
  return VALID_DISTANCE_UNITS.includes(v as DistanceUnits) ? (v as DistanceUnits) : DEFAULTS.distanceUnits;
}

function validTravelStyle(v: unknown): TravelStyle {
  return VALID_TRAVEL_STYLES.includes(v as TravelStyle) ? (v as TravelStyle) : DEFAULTS.travelStyle;
}

function validTimeFormat(v: unknown): TimeFormat {
  return VALID_TIME_FORMATS.includes(v as TimeFormat) ? (v as TimeFormat) : DEFAULTS.timeFormat;
}

function validIATA(v: unknown): string {
  if (typeof v !== 'string') return '';
  const trimmed = v.trim().toUpperCase();
  return /^[A-Z]{3}$/.test(trimmed) ? trimmed : '';
}

function validBool(v: unknown, fallback: boolean): boolean {
  return typeof v === 'boolean' ? v : fallback;
}

// ─── Store ────────────────────────────────────────────────────

interface SettingsState {
  currency: Currency;
  distanceUnits: DistanceUnits;
  travelStyle: TravelStyle;
  timeFormat: TimeFormat;
  preferredAirport: string;
  pushNotifications: boolean;
  emailNotifications: boolean;

  setCurrency: (v: string) => void;
  setDistanceUnits: (v: DistanceUnits) => void;
  setTravelStyle: (v: TravelStyle) => void;
  setTimeFormat: (v: TimeFormat) => void;
  toggleTimeFormat: () => void;
  setPreferredAirport: (v: string) => void;
  togglePushNotifications: () => void;
  toggleEmailNotifications: () => void;
  hydrate: (prefs: Record<string, unknown>) => void;
}

function persistPreferences(prefs: Record<string, unknown>) {
  supabase.auth.getUser().then(({ data }) => {
    if (!data.user) return;
    // Merge with the existing preferences column instead of replacing it.
    // The profiles.preferences JSONB also stores fields owned by other
    // surfaces (profile customization: accent_color, custom_quote,
    // card_outer_color, etc.). Writing only the settings-store snapshot
    // would clobber those and the user's profile would visually reset
    // every time they toggled a setting.
    supabase
      .from('profiles')
      .select('preferences')
      .eq('id', data.user.id)
      .single()
      .then(({ data: row }) => {
        const current = (row?.preferences ?? {}) as Record<string, unknown>;
        const merged = { ...current, ...prefs };
        return supabase
          .from('profiles')
          .update({ preferences: merged })
          .eq('id', data.user.id);
      })
      .then((res) => {
        // eslint-disable-next-line no-console
        if (res?.error) (globalThis as any).console?.error?.('Failed to persist preferences:', res.error);
      });
  });
}

function getPrefsSnapshot(state: SettingsState): Record<string, unknown> {
  return {
    currency: state.currency,
    distanceUnits: state.distanceUnits,
    travelStyle: state.travelStyle,
    timeFormat: state.timeFormat,
    preferredAirport: state.preferredAirport,
    pushNotifications: state.pushNotifications,
    emailNotifications: state.emailNotifications,
  };
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  ...DEFAULTS,

  setCurrency: (v) => {
    const validated = ISO_4217_PATTERN.test(v) ? v : DEFAULTS.currency;
    set({ currency: validated });
    persistPreferences({ ...getPrefsSnapshot(get()), currency: validated });
  },

  setDistanceUnits: (v) => {
    set({ distanceUnits: v });
    persistPreferences({ ...getPrefsSnapshot(get()), distanceUnits: v });
  },

  setTravelStyle: (v) => {
    set({ travelStyle: v });
    persistPreferences({ ...getPrefsSnapshot(get()), travelStyle: v });
  },

  setTimeFormat: (v) => {
    set({ timeFormat: v });
    persistPreferences({ ...getPrefsSnapshot(get()), timeFormat: v });
  },

  toggleTimeFormat: () => {
    const next: TimeFormat = get().timeFormat === '12h' ? '24h' : '12h';
    set({ timeFormat: next });
    persistPreferences({ ...getPrefsSnapshot(get()), timeFormat: next });
  },

  setPreferredAirport: (v) => {
    const validated = validIATA(v);
    set({ preferredAirport: validated });
    persistPreferences({ ...getPrefsSnapshot(get()), preferredAirport: validated });
  },

  togglePushNotifications: () => {
    const next = !get().pushNotifications;
    set({ pushNotifications: next });
    persistPreferences({ ...getPrefsSnapshot(get()), pushNotifications: next });
  },

  toggleEmailNotifications: () => {
    const next = !get().emailNotifications;
    set({ emailNotifications: next });
    persistPreferences({ ...getPrefsSnapshot(get()), emailNotifications: next });
  },

  hydrate: (prefs) => {
    set({
      currency: validCurrency(prefs.currency),
      distanceUnits: validDistanceUnits(prefs.distanceUnits),
      travelStyle: validTravelStyle(prefs.travelStyle),
      timeFormat: validTimeFormat(prefs.timeFormat),
      preferredAirport: validIATA(prefs.preferredAirport),
      pushNotifications: validBool(prefs.pushNotifications, DEFAULTS.pushNotifications),
      emailNotifications: validBool(prefs.emailNotifications, DEFAULTS.emailNotifications),
    });
  },
}));
