/**
 * @module useExchangeRates
 * Fetches live currency exchange rates relative to a given base currency.
 * Calls the /api/exchange-rates proxy to avoid CORS issues with the external rates API.
 * Results are cached for 24 hours. Used by `useHomeCurrency` and the budget tab.
 */

'use client';

import { useQuery } from '@tanstack/react-query'

/**
 * Return shape of `useExchangeRates`, with a flat structure for easy destructuring.
 */
interface ExchangeRatesResult {
  /** Map of currency code to rate relative to the base currency; null while loading */
  rates: Record<string, number> | null
  /** True while the initial fetch is in progress */
  isLoading: boolean
  /** Error object if the fetch failed, otherwise null */
  error: Error | null
  /** Manually re-trigger the rates fetch */
  refetch: () => void
}

/**
 * Calls the /api/exchange-rates proxy with the given base currency.
 * @param baseCurrency - ISO 4217 currency code to use as the base (e.g. 'USD')
 * @returns Map of currency codes to their rate relative to baseCurrency
 * @throws Error if the network response is not OK
 */
async function fetchRates(baseCurrency: string): Promise<Record<string, number>> {
  // Use our proxy route to avoid CORS issues with external API
  const res = await fetch(`/api/exchange-rates?base=${baseCurrency}`)
  if (!res.ok) throw new Error(`Exchange rate fetch failed: ${res.status}`)
  const data = (await res.json()) as { rates: Record<string, number> }
  return data.rates
}

/**
 * Fetches and caches live exchange rates for a given base currency.
 * Results are cached for 24 hours and retried once on failure.
 * Returns a flat result object instead of the raw React Query shape for convenience.
 * @param baseCurrency - ISO 4217 currency code used as the base (e.g. 'USD')
 * @returns Object with `rates`, `isLoading`, `error`, and `refetch`
 * @example
 * ```tsx
 * const { rates, isLoading } = useExchangeRates('USD');
 * const eurRate = rates?.EUR; // e.g. 0.92
 * ```
 */
export function useExchangeRates(baseCurrency: string): ExchangeRatesResult {
  const query = useQuery({
    queryKey: ['exchangeRates', baseCurrency],
    queryFn: () => fetchRates(baseCurrency),
    staleTime: 24 * 60 * 60 * 1000, // 24 hours
    retry: 1,
  })

  return {
    rates: query.data ?? null,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  }
}
