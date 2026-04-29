'use client'

import { useState, useRef, useEffect } from 'react'
import { EditPencil } from 'iconoir-react'

interface BudgetSummaryStripProps {
  totalBudgeted: number
  totalSpent: number
  remaining: number
  formatAmount: (amount: number) => string
  onEditTotal: (newTotal: number) => void
}

export function BudgetSummaryStrip({
  totalBudgeted,
  totalSpent,
  remaining,
  formatAmount,
  onEditTotal,
}: BudgetSummaryStripProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [tempValue, setTempValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isEditing) inputRef.current?.focus()
  }, [isEditing])

  const handleStartEdit = () => {
    setTempValue(totalBudgeted.toString())
    setIsEditing(true)
  }

  const handleCommit = () => {
    const parsed = parseFloat(tempValue)
    if (!isNaN(parsed) && parsed > 0) {
      onEditTotal(parsed)
    }
    setIsEditing(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleCommit()
    if (e.key === 'Escape') setIsEditing(false)
  }

  return (
    <>
      <div className="flex items-start gap-12">
        {/* Total Budget — hover-editable */}
        <div className="group">
          <div className="flex items-center gap-2">
            {isEditing ? (
              <input
                ref={inputRef}
                type="number"
                value={tempValue}
                onChange={(e) => setTempValue(e.target.value)}
                onBlur={handleCommit}
                onKeyDown={handleKeyDown}
                className="text-3xl font-sans font-normal tracking-wide text-gray-900 bg-transparent border-b border-gray-300 focus:border-gray-500 outline-none w-36 transition-all duration-150"
              />
            ) : (
              <>
                <span className="text-3xl font-sans font-normal tracking-wide text-gray-900">
                  {formatAmount(totalBudgeted)}
                </span>
                <button
                  onClick={handleStartEdit}
                  className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 text-gray-300 hover:text-gray-500"
                >
                  <EditPencil width={14} height={14} />
                </button>
              </>
            )}
          </div>
          <span className="text-[11px] font-medium uppercase tracking-[0.08em] text-gray-400 mt-1 block">
            Total Budget
          </span>
        </div>

        {/* Total Spent */}
        <div>
          <span className="text-3xl font-sans font-normal tracking-wide text-gray-900 block">
            {formatAmount(totalSpent)}
          </span>
          <span className="text-[11px] font-medium uppercase tracking-[0.08em] text-gray-400 mt-1 block">
            Total Spent
          </span>
        </div>

        {/* Remaining */}
        <div>
          <span className={`text-3xl font-sans font-normal tracking-wide block ${
            remaining >= 0 ? 'text-emerald-600' : 'text-red-500'
          }`}>
            {formatAmount(Math.abs(remaining))}
          </span>
          <span className="text-[11px] font-medium uppercase tracking-[0.08em] text-gray-400 mt-1 block">
            Remaining
          </span>
        </div>
      </div>

      <div className="h-[1px] bg-gray-100 my-6" />
    </>
  )
}
