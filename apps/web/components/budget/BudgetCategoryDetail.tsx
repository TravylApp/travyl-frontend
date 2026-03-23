'use client'

import { useState } from 'react'
import { AnimatePresence } from 'motion/react'
import { Xmark, Plus } from 'iconoir-react'
import { convertToTripCurrency } from '@travyl/shared'
import type { BudgetCategoryData } from '@travyl/shared'
import { AddExpenseForm } from './AddExpenseForm'

interface BudgetMutations {
  addExpense: (expense: { category_id: string; description: string; amount: number; currency: string }) => void
  deleteExpense: (expenseId: string) => void
}

interface BudgetCategoryDetailProps {
  category: BudgetCategoryData
  mutations: BudgetMutations
  tripCurrency: string
  rates: Record<string, number> | null
  formatAmount: (amount: number) => string
}

export function BudgetCategoryDetail({
  category,
  mutations,
  tripCurrency,
  rates,
  formatAmount,
}: BudgetCategoryDetailProps) {
  const [showAddForm, setShowAddForm] = useState(false)

  return (
    <div className="pl-5 border-t border-gray-100 mt-2 pt-3">
      {/* From Calendar section */}
      {category.calendarItems.length > 0 && (
        <div className="mb-4">
          <div className="text-[11px] font-medium uppercase tracking-[0.08em] text-gray-400 mb-2">
            From Calendar
          </div>
          <div className="space-y-2">
            {category.calendarItems.map((item) => (
              <div key={item.id} className="flex items-start justify-between">
                <div>
                  <span className="text-sm text-gray-700">{item.name}</span>
                  <span className="text-xs text-gray-400 block">
                    {item.day > 0 ? `Day ${item.day}` : ''}
                    {item.time ? ` · ${item.time}` : ''}
                  </span>
                </div>
                <div className="text-sm font-medium text-gray-900 tabular-nums shrink-0 ml-4">
                  {formatAmount(item.cost)}
                  {item.originalCurrency && (
                    <span className="text-xs text-gray-400 ml-1">
                      ({item.originalCurrency})
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Manual Expenses section */}
      {category.manualExpenses.length > 0 && (
        <div className="mb-3">
          <div className="text-[11px] font-medium uppercase tracking-[0.08em] text-gray-400 mb-2 mt-4">
            Manual Expenses
          </div>
          <div className="space-y-2">
            {category.manualExpenses.map((expense) => (
              <div key={expense.id} className="group flex items-start justify-between">
                <div>
                  <span className="text-sm text-gray-700">{expense.description}</span>
                  <span className="text-[10px] uppercase tracking-[0.06em] text-amber-500 font-medium ml-2">
                    Manual
                  </span>
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-4">
                  <span className="text-sm font-medium text-gray-900 tabular-nums">
                    {formatAmount(convertToTripCurrency(expense.amount, expense.currency, tripCurrency, rates))}
                  </span>
                  <button
                    onClick={() => mutations.deleteExpense(expense.id)}
                    className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-500 transition-all duration-150"
                  >
                    <Xmark width={14} height={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add expense action */}
      <AnimatePresence>
        {showAddForm ? (
          <AddExpenseForm
            key="form"
            categoryId={category.id}
            tripCurrency={tripCurrency}
            onSubmit={(expense) => {
              mutations.addExpense(expense)
              setShowAddForm(false)
            }}
            onCancel={() => setShowAddForm(false)}
          />
        ) : (
          <button
            key="link"
            onClick={() => setShowAddForm(true)}
            className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 transition-colors mt-3"
          >
            <Plus width={12} height={12} />
            Add expense
          </button>
        )}
      </AnimatePresence>
    </div>
  )
}
