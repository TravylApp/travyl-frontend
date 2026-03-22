'use client'

import { use, useState, useMemo } from 'react'
import { useTripBudget, useTrip, formatBudgetAmount } from '@travyl/shared'
import {
  BudgetSkeleton,
  BudgetSummaryStrip,
  BudgetDonutChart,
  BudgetCategoryList,
  CurrencyFooter,
} from '@/components/budget'

export default function Budget({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { data: trip } = useTrip(id)
  const tripCurrency = trip?.currency ?? 'USD'

  const {
    categories,
    totalBudgeted,
    totalSpent,
    remaining,
    isLoading,
    error,
    rates,
    ratesLoading,
    refetchRates,
    upsertCategory,
    deleteCategory,
    addExpense,
    deleteExpense,
  } = useTripBudget(id, tripCurrency)

  const [hoveredCategory, setHoveredCategory] = useState<string | null>(null)
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null)

  const formatAmount = useMemo(
    () => (amount: number) => formatBudgetAmount(amount, tripCurrency),
    [tripCurrency],
  )

  const mutations = useMemo(() => ({
    upsertCategory,
    deleteCategory,
    addExpense,
    deleteExpense,
  }), [upsertCategory, deleteCategory, addExpense, deleteExpense])

  // Collect currencies present in trip data for CurrencyFooter
  const activeCurrencies = useMemo(() => {
    const currencies = new Set<string>()
    for (const cat of categories) {
      for (const item of cat.calendarItems) {
        if (item.originalCurrency) currencies.add(item.originalCurrency)
      }
      for (const expense of cat.manualExpenses) {
        if (expense.currency !== tripCurrency) currencies.add(expense.currency)
      }
    }
    return Array.from(currencies)
  }, [categories, tripCurrency])

  // Handle total budget edit (proportional redistribution)
  const handleEditTotal = (newTotal: number) => {
    if (totalBudgeted <= 0) return
    const ratio = newTotal / totalBudgeted
    for (const cat of categories) {
      upsertCategory({
        id: cat.id,
        category: cat.name,
        budgeted: Math.round(cat.budgeted * ratio * 100) / 100,
      })
    }
  }

  if (isLoading) return <BudgetSkeleton />

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <p className="text-sm text-gray-500 mb-2">Failed to load budget data</p>
        <button
          onClick={() => window.location.reload()}
          className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
        >
          Retry
        </button>
      </div>
    )
  }

  return (
    <div>
      <BudgetSummaryStrip
        totalBudgeted={totalBudgeted}
        totalSpent={totalSpent}
        remaining={remaining}
        formatAmount={formatAmount}
        onEditTotal={handleEditTotal}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <BudgetDonutChart
          categories={categories}
          hoveredCategory={hoveredCategory}
          onHoverCategory={setHoveredCategory}
          formatAmount={formatAmount}
        />
        <BudgetCategoryList
          categories={categories}
          hoveredCategory={hoveredCategory}
          onHoverCategory={setHoveredCategory}
          expandedCategory={expandedCategory}
          onExpandCategory={setExpandedCategory}
          mutations={mutations}
          tripCurrency={tripCurrency}
          rates={rates}
          formatAmount={formatAmount}
        />
      </div>

      <CurrencyFooter
        tripCurrency={tripCurrency}
        rates={rates}
        isLoading={ratesLoading}
        onRefresh={refetchRates}
        activeCurrencies={activeCurrencies}
      />
    </div>
  )
}
