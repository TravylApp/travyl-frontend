'use client'

import { useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { EditPencil, Xmark, NavArrowDown, Plus } from 'iconoir-react'
import type { BudgetCategoryData } from '@travyl/shared'
import { Red, Amber } from '@travyl/shared'
import { BudgetCategoryDetail } from './BudgetCategoryDetail'
import { AddCategoryForm } from './AddCategoryForm'
import { getCategoryColor } from './budgetColors'

interface BudgetMutations {
  upsertCategory: (category: { category: string; budgeted: number; [key: string]: unknown }) => void
  deleteCategory: (categoryId: string) => void
  addExpense: (expense: { category_id: string; description: string; amount: number; currency: string }) => void
  deleteExpense: (expenseId: string) => void
}

interface BudgetCategoryListProps {
  categories: BudgetCategoryData[]
  hoveredCategory: string | null
  onHoverCategory: (name: string | null) => void
  expandedCategory: string | null
  onExpandCategory: (id: string | null) => void
  mutations: BudgetMutations
  tripCurrency: string
  rates: Record<string, number> | null
  formatAmount: (amount: number) => string
}

export function BudgetCategoryList({
  categories,
  hoveredCategory,
  onHoverCategory,
  expandedCategory,
  onExpandCategory,
  mutations,
  tripCurrency,
  rates,
  formatAmount,
}: BudgetCategoryListProps) {
  const [showAddCategory, setShowAddCategory] = useState(false)
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null)
  const [editBudgetValue, setEditBudgetValue] = useState('')

  return (
    <div>
      {categories.map((cat) => {
        const isExpanded = expandedCategory === cat.id
        const isHovered = hoveredCategory === cat.name
        const color = getCategoryColor(cat.name)
        const percentClamped = Math.min(cat.percentUsed, 100)
        const barColor = cat.percentUsed >= 100 ? Red[500] : cat.percentUsed >= 80 ? Amber[500] : color

        return (
          <div key={cat.id}>
            {/* Row */}
            <div
              className={`group py-2.5 px-2 -mx-2 rounded-lg cursor-pointer transition-colors duration-200 ${
                isHovered ? 'bg-gray-50' : ''
              }`}
              onMouseEnter={() => onHoverCategory(cat.name)}
              onMouseLeave={() => onHoverCategory(null)}
              onClick={() => onExpandCategory(isExpanded ? null : cat.id)}
            >
              <div className="flex items-center">
                {/* Color dot */}
                <div
                  className="w-2.5 h-2.5 rounded-full shrink-0 mr-3"
                  style={{ backgroundColor: color }}
                />

                {/* Category name */}
                <span className="text-sm font-medium text-gray-700">{cat.name}</span>

                {/* Spacer */}
                <div className="flex-1" />

                {/* Amounts */}
                <span className={`text-sm tabular-nums mr-1 ${
                  cat.percentUsed >= 100 ? 'text-red-500 font-medium' : 'text-gray-900 font-medium'
                }`}>
                  {formatAmount(cat.actual)}
                </span>
                <span className="text-sm tabular-nums text-gray-400">
                  / {formatAmount(cat.budgeted)}
                </span>

                {/* Hover actions — inline edit budgeted amount */}
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setEditingCategoryId(cat.id)
                    setEditBudgetValue(cat.budgeted.toString())
                  }}
                  className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-gray-600 ml-2 transition-opacity duration-150"
                >
                  <EditPencil width={14} height={14} />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); mutations.deleteCategory(cat.id) }}
                  className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-gray-600 ml-1 transition-opacity duration-150"
                >
                  <Xmark width={14} height={14} />
                </button>

                {/* Chevron */}
                <NavArrowDown
                  width={16}
                  height={16}
                  className={`text-gray-400 ml-1 transition-transform duration-200 ${
                    isExpanded ? 'rotate-180' : ''
                  }`}
                />
              </div>

              {/* Hover progress bar — uses both CSS group-hover (instant on native hover)
                  and isHovered prop (cross-highlight from donut) */}
              <div className={`mt-1.5 h-0.5 rounded-full bg-gray-100 overflow-hidden transition-opacity duration-200 opacity-0 group-hover:opacity-100 ${
                isHovered ? '!opacity-100' : ''
              }`}>
                <div
                  className="h-full rounded-full transition-all duration-300"
                  style={{
                    width: `${percentClamped}%`,
                    backgroundColor: barColor,
                  }}
                />
              </div>
            </div>

            {/* Inline budget edit */}
            {editingCategoryId === cat.id && (
              <div className="flex items-center gap-2 px-2 py-1.5" onClick={(e) => e.stopPropagation()}>
                <span className="text-xs text-gray-400">Budget:</span>
                <input
                  type="number"
                  value={editBudgetValue}
                  onChange={(e) => setEditBudgetValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      const parsed = parseFloat(editBudgetValue)
                      if (!isNaN(parsed)) mutations.upsertCategory({ id: cat.id, category: cat.name, budgeted: parsed })
                      setEditingCategoryId(null)
                    }
                    if (e.key === 'Escape') setEditingCategoryId(null)
                  }}
                  onBlur={() => {
                    const parsed = parseFloat(editBudgetValue)
                    if (!isNaN(parsed)) mutations.upsertCategory({ id: cat.id, category: cat.name, budgeted: parsed })
                    setEditingCategoryId(null)
                  }}
                  autoFocus
                  className="w-24 border-b border-gray-200 focus:border-gray-400 outline-none text-sm py-0.5 bg-transparent tabular-nums transition-colors"
                />
              </div>
            )}

            {/* Expanded detail */}
            <AnimatePresence initial={false}>
              {isExpanded && (
                <motion.div
                  key="detail"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.25, ease: 'easeInOut' }}
                  className="overflow-hidden"
                >
                  <BudgetCategoryDetail
                    category={cat}
                    mutations={mutations}
                    tripCurrency={tripCurrency}
                    rates={rates}
                    formatAmount={formatAmount}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )
      })}

      {/* Add category action */}
      <AnimatePresence>
        {showAddCategory ? (
          <AddCategoryForm
            key="form"
            onSubmit={(cat) => {
              mutations.upsertCategory(cat)
              setShowAddCategory(false)
            }}
            onCancel={() => setShowAddCategory(false)}
          />
        ) : (
          <button
            key="link"
            onClick={() => setShowAddCategory(true)}
            className="flex items-center gap-1 text-sm text-gray-400 hover:text-gray-600 transition-colors mt-4"
          >
            <Plus width={14} height={14} />
            Add category
          </button>
        )}
      </AnimatePresence>
    </div>
  )
}
