/**
 * @module currency
 * Currency formatting and cross-currency conversion utilities.
 * Used by the budget view model, packing, and any component that needs to
 * display monetary amounts in the trip's chosen currency.
 */

/**
 * Converts a monetary amount from one currency to the trip's display currency
 * using a pre-fetched exchange rates table.
 *
 * All rates are assumed to be relative to a common base (e.g. USD = 1).
 * If either currency is the same, or rates are unavailable, the original amount
 * is returned unchanged.
 *
 * @param amount - Numeric amount to convert
 * @param fromCurrency - ISO 4217 code of the source currency (e.g. "EUR")
 * @param tripCurrency - ISO 4217 code of the target trip currency (e.g. "USD")
 * @param rates - Exchange rate table keyed by ISO currency code, or null if unavailable
 * @returns Converted amount in `tripCurrency` units
 * @example convertToTripCurrency(100, "EUR", "USD", { EUR: 0.92 }) // → ~108.7
 */
export function convertToTripCurrency(
  amount: number,
  fromCurrency: string,
  tripCurrency: string,
  rates: Record<string, number> | null,
): number {
  if (fromCurrency === tripCurrency) return amount
  if (!rates) return amount
  const rate = rates[fromCurrency]
  if (!rate) return amount
  return amount / rate
}

/**
 * Formats a numeric amount as a localized currency string using the browser's
 * `Intl.NumberFormat` API with the `en-US` locale.
 *
 * @param amount - Numeric amount to format
 * @param currency - ISO 4217 currency code (e.g. "USD", "EUR", "GBP")
 * @returns Formatted currency string (e.g. "$1,234.56", "€1.234,56")
 * @example formatBudgetAmount(1234.5, "USD") // → "$1,234.50"
 */
export function formatBudgetAmount(amount: number, currency: string): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(amount)
}
