// packages/shared/src/stores/settingsStore.ts
import { create } from 'zustand';
import { supabase } from '../services/supabase';

// ─── Types ────────────────────────────────────────────────────

export type Currency = string;
export type DistanceUnits = 'miles' | 'kilometers';
export type TravelStyle = 'balanced' | 'budget' | 'luxury' | 'adventure' | 'relaxed';

const ISO_4217_PATTERN = /^[A-Z]{3}$/;
const VALID_DISTANCE_UNITS: DistanceUnits[] = ['miles', 'kilometers'];
const VALID_TRAVEL_STYLES: TravelStyle[] = ['balanced', 'budget', 'luxury', 'adventure', 'relaxed'];

const DEFAULTS = {
  currency: 'USD' as Currency,
  distanceUnits: 'miles' as DistanceUnits,
  travelStyle: 'balanced' as TravelStyle,
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

function validBool(v: unknown, fallback: boolean): boolean {
  return typeof v === 'boolean' ? v : fallback;
}

// ─── Store ────────────────────────────────────────────────────

interface SettingsState {
  currency: Currency;
  distanceUnits: DistanceUnits;
  travelStyle: TravelStyle;
  pushNotifications: boolean;
  emailNotifications: boolean;

  setCurrency: (v: string) => void;
  setDistanceUnits: (v: DistanceUnits) => void;
  setTravelStyle: (v: TravelStyle) => void;
  togglePushNotifications: () => void;
  toggleEmailNotifications: () => void;
  hydrate: (prefs: Record<string, unknown>) => void;
}

function persistPreferences(prefs: Record<string, unknown>) {
  supabase.auth.getUser().then(({ data }) => {
    if (!data.user) return;
    supabase
      .from('profiles')
      .update({ preferences: prefs })
      .eq('id', data.user.id)
      .then(({ error }) => {
        if (error) console.error('Failed to persist preferences:', error);
      });
  });
}

function getPrefsSnapshot(state: SettingsState): Record<string, unknown> {
  return {
    currency: state.currency,
    distanceUnits: state.distanceUnits,
    travelStyle: state.travelStyle,
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
      pushNotifications: validBool(prefs.pushNotifications, DEFAULTS.pushNotifications),
      emailNotifications: validBool(prefs.emailNotifications, DEFAULTS.emailNotifications),
    });
  },
}));
