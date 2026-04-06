'use client';

import { useQuery } from '@tanstack/react-query'

interface ExchangeRatesResult {
  rates: Record<string, number> | null
  isLoading: boolean
  error: Error | null
  refetch: () => void
}

async function fetchRates(baseCurrency: string): Promise<Record<string, number>> {
  // Use our proxy route to avoid CORS issues with external API
  const res = await fetch(`/api/exchange-rates?base=${baseCurrency}`)
  if (!res.ok) throw new Error(`Exchange rate fetch failed: ${res.status}`)
  const data = (await res.json()) as { rates: Record<string, number> }
  return data.rates
}

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
