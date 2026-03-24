'use client'

import { useState } from 'react'
import { motion } from 'motion/react'

interface AddCategoryFormProps {
  onSubmit: (category: { category: string; budgeted: number }) => void
  onCancel: () => void
}

export function AddCategoryForm({ onSubmit, onCancel }: AddCategoryFormProps) {
  const [name, setName] = useState('')
  const [budgeted, setBudgeted] = useState('')

  const handleSubmit = () => {
    if (name.trim()) {
      onSubmit({
        category: name.trim().toLowerCase(),
        budgeted: parseFloat(budgeted) || 0,
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
      <div className="flex items-end gap-3 py-2.5">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Category name"
          autoFocus
          className="flex-1 border-b border-gray-200 focus:border-gray-400 outline-none text-sm py-1 bg-transparent transition-colors"
        />
        <input
          type="number"
          value={budgeted}
          onChange={(e) => setBudgeted(e.target.value)}
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
