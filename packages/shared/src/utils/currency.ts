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

export function formatBudgetAmount(amount: number, currency: string): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(amount)
}
