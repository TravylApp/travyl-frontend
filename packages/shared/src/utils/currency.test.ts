import { describe, it, expect } from 'vitest'
import { convertToTripCurrency, formatBudgetAmount } from './currency'

describe('convertToTripCurrency', () => {
  const rates: Record<string, number> = { EUR: 0.92, GBP: 0.79, THB: 35.1 }

  it('returns amount unchanged when currencies match', () => {
    expect(convertToTripCurrency(100, 'USD', 'USD', rates)).toBe(100)
  })
  it('converts from a foreign currency to trip currency', () => {
    // rates are from open.er-api.com with base=USD, so EUR: 0.92 means 1 USD = 0.92 EUR
    // To convert 100 EUR to USD: 100 / 0.92 ≈ 108.70
    const result = convertToTripCurrency(100, 'EUR', 'USD', rates)
    expect(result).toBeCloseTo(108.70, 1)
  })
  it('converts THB to USD using rate', () => {
    // 1500 THB to USD: 1500 / 35.1 ≈ 42.74
    const result = convertToTripCurrency(1500, 'THB', 'USD', rates)
    expect(result).toBeCloseTo(42.74, 1)
  })
  it('returns original amount when rate is missing', () => {
    expect(convertToTripCurrency(100, 'JPY', 'USD', rates)).toBe(100)
  })
  it('returns original amount when rates is null', () => {
    expect(convertToTripCurrency(100, 'EUR', 'USD', null as unknown as Record<string, number>)).toBe(100)
  })
})

describe('formatBudgetAmount', () => {
  it('formats USD amounts', () => {
    expect(formatBudgetAmount(1234.5, 'USD')).toBe('$1,234.50')
  })
  it('formats EUR amounts', () => {
    const result = formatBudgetAmount(1234.5, 'EUR')
    expect(result).toContain('1,234.50')
  })
  it('handles zero', () => {
    expect(formatBudgetAmount(0, 'USD')).toBe('$0.00')
  })
  it('formats THB without throwing', () => {
    expect(() => formatBudgetAmount(1500, 'THB')).not.toThrow()
  })
})
