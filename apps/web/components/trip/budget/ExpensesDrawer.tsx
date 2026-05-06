'use client';

import { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { motion } from 'motion/react';
import type { BudgetExpense } from './types';

export interface ExpensesDrawerProps {
  expenses: BudgetExpense[];
  formatAmount: (n: number) => string;
  onAddExpense: (description: string, amount: number, date?: string) => void;
  onDeleteExpense: (expenseId: string) => void;
}

export function ExpensesDrawer({ expenses, formatAmount, onAddExpense, onDeleteExpense }: ExpensesDrawerProps) {
  const [adding, setAdding] = useState(false);
  const [desc, setDesc] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState('');

  const reset = () => { setDesc(''); setAmount(''); setDate(''); setAdding(false); };

  const submit = () => {
    const parsed = Number(amount);
    if (!desc.trim() || Number.isNaN(parsed) || parsed <= 0) return;
    onAddExpense(desc.trim(), parsed, date || undefined);
    reset();
  };

  return (
    <motion.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: 'auto', opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className="overflow-hidden"
    >
      <div className="bg-[#fafaf7] dark:bg-white/[0.02] border border-[#f0eee9] dark:border-white/[0.06] rounded-lg p-3 my-2">
        <div className="flex items-center justify-between px-1 pb-2">
          <span className="text-[9px] uppercase tracking-[0.08em] font-bold text-gray-400">
            {expenses.length} {expenses.length === 1 ? 'expense' : 'expenses'}
          </span>
          {!adding && (
            <button onClick={() => setAdding(true)} className="text-[12px] text-[var(--trip-base)] hover:underline font-medium">
              + Add expense
            </button>
          )}
        </div>

        {expenses.length > 0 && (
          <div className="space-y-1.5">
            {expenses.map((e) => (
              <div key={e.id} className="grid grid-cols-[1fr_90px_80px_22px] gap-2 items-center bg-white dark:bg-white/[0.04] border border-[#f0eee9] dark:border-white/[0.06] rounded-md px-2.5 py-2 text-[12px]">
                <span className="text-gray-900 dark:text-gray-200 truncate">{e.description}</span>
                <span className="text-[10px] text-gray-400 text-right">{e.date ?? ''}</span>
                <span className="tabular-nums font-semibold text-gray-900 dark:text-white text-right">{formatAmount(e.amount)}</span>
                <button onClick={() => onDeleteExpense(e.id)} aria-label="Delete expense" className="text-gray-300 hover:text-red-600 transition-colors text-center">
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>
        )}

        {adding && (
          <div className="grid grid-cols-[1fr_90px_80px_auto] gap-2 items-center mt-2 px-2.5 py-2 border border-dashed border-[var(--trip-base)] rounded-md bg-white dark:bg-white/[0.04]">
            <input
              type="text"
              autoFocus
              placeholder="Description"
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') submit(); else if (e.key === 'Escape') reset(); }}
              className="text-[12px] bg-transparent border-none outline-none placeholder:text-gray-400 text-gray-900 dark:text-white"
            />
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') submit(); else if (e.key === 'Escape') reset(); }}
              className="text-[10px] bg-transparent border-none outline-none text-gray-600 dark:text-gray-300 text-right"
            />
            <input
              type="number"
              step="any"
              min="0"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') submit(); else if (e.key === 'Escape') reset(); }}
              className="text-[12px] bg-transparent border-none outline-none text-right tabular-nums font-semibold text-gray-900 dark:text-white"
            />
            <div className="flex items-center gap-1.5">
              <button onClick={submit} aria-label="Add" className="w-6 h-6 rounded-md bg-[var(--trip-base)] text-white flex items-center justify-center hover:opacity-90 transition-opacity">
                <Plus size={12} />
              </button>
              <button onClick={reset} aria-label="Cancel" className="w-6 h-6 rounded-md text-gray-400 hover:bg-gray-100 dark:hover:bg-white/[0.06] flex items-center justify-center">
                <X size={12} />
              </button>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
