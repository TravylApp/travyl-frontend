'use client'

interface CurrencyFooterProps {
  tripCurrency: string
  rates: Record<string, number> | null
  isLoading: boolean
  onRefresh: () => void
  activeCurrencies: string[]
}

export function CurrencyFooter({
  tripCurrency,
  rates,
  isLoading,
  onRefresh,
  activeCurrencies,
}: CurrencyFooterProps) {
  if (isLoading) return null

  const relevantCurrencies = activeCurrencies.filter((c) => c !== tripCurrency)

  return (
    <div className="mt-8 text-xs text-gray-400">
      {rates && relevantCurrencies.length > 0 ? (
        <span>
          {tripCurrency}
          {relevantCurrencies.map((currency) => {
            const rate = rates[currency]
            if (!rate) return null
            const inverse = (1 / rate).toFixed(2)
            return (
              <span key={currency}>
                {' · '}1 {currency} = {new Intl.NumberFormat('en-US', { style: 'currency', currency: tripCurrency }).format(Number(inverse))}
              </span>
            )
          })}
          {' · '}
          <button
            onClick={onRefresh}
            className="hover:text-gray-600 hover:underline transition-colors cursor-pointer"
          >
            Refresh
          </button>
        </span>
      ) : rates ? (
        <span>{tripCurrency}</span>
      ) : (
        <span>Rates unavailable</span>
      )}
    </div>
  )
}
