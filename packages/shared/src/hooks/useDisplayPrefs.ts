/**
 * @module useDisplayPrefs
 * Returns the user's display preferences derived from their profile.country.
 *
 * Replaces the old "Display" settings tab — Noah said currency and units
 * should be inherited from where you live (US = USD + miles + °F; rest
 * of the world = local currency + km + °C). No manual override.
 */

'use client'

import { useProfile } from './useProfile'
import { currencyForCountry, unitsForCountry, type DistanceUnits } from '../utils/countryDefaults'

export interface DisplayPrefs {
  /** ISO 4217 currency code derived from profile.country. Defaults to 'USD'. */
  currency: string
  /** Distance unit derived from profile.country. Defaults to 'kilometers'. */
  distanceUnits: DistanceUnits
  /** Convenience: true when distanceUnits === 'miles'. */
  useFahrenheit: boolean
}

/**
 * Reads profile.country (via React Query) and derives display defaults.
 * Returns USD + kilometers while the profile is still loading or for users
 * who haven't set a country yet.
 */
export function useDisplayPrefs(): DisplayPrefs {
  const { data: profile } = useProfile()
  const country = profile?.country ?? null
  const distanceUnits = unitsForCountry(country)
  return {
    currency: currencyForCountry(country) ?? 'USD',
    distanceUnits,
    useFahrenheit: distanceUnits === 'miles',
  }
}
