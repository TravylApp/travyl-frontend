/**
 * @module useHomeCurrency
 * Provides the user's home currency along with conversion and formatting utilities.
 * Currency is derived from `profile.country` via `useDisplayPrefs` (Noah removed
 * the manual Display tab — currency follows where you live).
 * Used by the budget tab and anywhere prices from external APIs need to be shown
 * in the user's local currency.
 */

'use client';

import { useCallback } from 'react'
import { useDisplayPrefs } from './useDisplayPrefs'
import { useExchangeRates } from './useExchangeRates'
import { convertToTripCurrency } from '../utils/currency'

/**
 * Return shape of `useHomeCurrency`.
 */
interface UseHomeCurrencyResult {
  /** User's home currency code (e.g. 'USD') */
  currency: string
  /** Exchange rates keyed by source currency (1 home = X foreign). Null while loading. */
  rates: Record<string, number> | null
  /** True while rates are being fetched */
  isLoading: boolean
  /**
   * Convert an amount from sourceCurrency to the user's home currency.
   * Returns the original amount if rates aren't loaded or source === home.
   */
  convert: (amount: number, sourceCurrency: string) => number
  /**
   * Convert and format an amount in the user's home currency.
   * Falls back to formatting in the source currency if rates aren't available.
   */
  format: (amount: number, sourceCurrency?: string) => string
}

/**
 * Returns the user's home currency and helpers to convert and format foreign amounts.
 * Pulls the preferred currency from `settingsStore` and live rates from `useExchangeRates`.
 * `convert` and `format` are memoized and update only when currency or rates change.
 * @returns Object with `currency`, `rates`, `isLoading`, `convert`, and `format`
 * @example
 * ```tsx
 * const { format } = useHomeCurrency();
 * // Formats $1500 USD into the user's home currency
 * const label = format(1500, 'USD'); // e.g. "€1,380"
 * ```
 */
export function useHomeCurrency(): UseHomeCurrencyResult {
  const { currency } = useDisplayPrefs()
  const { rates, isLoading } = useExchangeRates(currency)

  const convert = useCallback(
    (amount: number, sourceCurrency: string): number => {
      return convertToTripCurrency(amount, sourceCurrency, currency, rates)
    },
    [currency, rates],
  )

  const format = useCallback(
    (amount: number, sourceCurrency?: string): string => {
      // If no source currency given, just format the number in home currency
      if (!sourceCurrency) {
        try {
          return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency,
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          }).format(amount)
        } catch {
          return `${currency} ${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
        }
      }

      // Same currency — no conversion needed
      if (sourceCurrency === currency) {
        try {
          return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency,
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          }).format(amount)
        } catch {
          return `${currency} ${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
        }
      }

      const converted = convert(amount, sourceCurrency)

      // If conversion didn't happen (no rate), show original currency per spec
      if (converted === amount && sourceCurrency !== currency) {
        try {
          return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: sourceCurrency,
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          }).format(amount)
        } catch {
          return `${sourceCurrency} ${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
        }
      }

      // Successful conversion — format in home currency
      try {
        return new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency,
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }).format(converted)
      } catch {
        return `${currency} ${converted.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
      }
    },
    [convert, currency],
  )

  return { currency, rates, isLoading, convert, format }
}
