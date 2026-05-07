// Re-export from shared. The country → currency map and the matching
// units derivation now live in @travyl/shared so mobile + web (and the
// useDisplayPrefs hook) can share them.
export { currencyForCountry } from '@travyl/shared'
