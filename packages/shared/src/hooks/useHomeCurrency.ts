"use client"
import { useCallback } from 'react'
import { useSettingsStore } from '../stores/settingsStore'
import { useExchangeRates } from './useExchangeRates'
import { convertToTripCurrency } from '../utils/currency'

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

export function useHomeCurrency(): UseHomeCurrencyResult {
  const currency = useSettingsStore((s) => s.currency)
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
            maximumFractionDigits: 0,
          }).format(amount)
        } catch {
          return `${currency} ${amount.toLocaleString()}`
        }
      }

      // Same currency — no conversion needed
      if (sourceCurrency === currency) {
        try {
          return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency,
            maximumFractionDigits: 0,
          }).format(amount)
        } catch {
          return `${currency} ${amount.toLocaleString()}`
        }
      }

      const converted = convert(amount, sourceCurrency)

      // If conversion didn't happen (no rate), show original currency per spec
      if (converted === amount && sourceCurrency !== currency) {
        try {
          return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: sourceCurrency,
            maximumFractionDigits: 0,
          }).format(amount)
        } catch {
          return `${sourceCurrency} ${amount.toLocaleString()}`
        }
      }

      // Successful conversion — format in home currency
      try {
        return new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency,
          maximumFractionDigits: 0,
        }).format(converted)
      } catch {
        return `${currency} ${converted.toLocaleString()}`
      }
    },
    [convert, currency],
  )

  return { currency, rates, isLoading, convert, format }
}
