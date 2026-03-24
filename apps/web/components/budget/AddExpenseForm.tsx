'use client'

import { useState } from 'react'
import { motion } from 'motion/react'

interface AddExpenseFormProps {
  categoryId: string
  tripCurrency: string
  onSubmit: (expense: { category_id: string; description: string; amount: number; currency: string }) => void
  onCancel: () => void
}

export function AddExpenseForm({ categoryId, tripCurrency, onSubmit, onCancel }: AddExpenseFormProps) {
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')

  const handleSubmit = () => {
    const parsed = parseFloat(amount)
    if (description.trim() && !isNaN(parsed) && parsed > 0) {
      onSubmit({
        category_id: categoryId,
        description: description.trim(),
        amount: parsed,
        currency: tripCurrency,
      })
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSubmit()
    if (e.key === 'Escape') onCancel()
  }

  return (
    <motion.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: 'auto', opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      transition={{ duration: 0.25, ease: 'easeInOut' }}
      className="overflow-hidden"
    >
      <div className="flex items-end gap-3 mt-3">
        <input
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Description"
          autoFocus
          className="flex-1 border-b border-gray-200 focus:border-gray-400 outline-none text-sm py-1 bg-transparent transition-colors"
        />
        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="$0"
          className="w-24 border-b border-gray-200 focus:border-gray-400 outline-none text-sm py-1 bg-transparent tabular-nums transition-colors"
        />
        <button
          onClick={handleSubmit}
          className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors shrink-0"
        >
          Add
        </button>
        <button
          onClick={onCancel}
          className="text-sm text-gray-400 hover:text-gray-600 transition-colors shrink-0"
        >
          Cancel
        </button>
      </div>
    </motion.div>
  )
}
