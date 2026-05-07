'use client';

import { useMemo, useState } from 'react';
import { Plus, X } from 'lucide-react';
import { motion } from 'motion/react';
import type { BudgetExpense } from './types';

export interface ExpensesDrawerProps {
  expenses: BudgetExpense[];
  formatAmount: (n: number) => string;
  onAddExpense: (description: string, amount: number, date?: string) => void;
  onDeleteExpense: (expenseId: string) => void;
}

type FieldError = 'description' | 'amount' | null;

export function ExpensesDrawer({ expenses, formatAmount, onAddExpense, onDeleteExpense }: ExpensesDrawerProps) {
  const [adding, setAdding] = useState(false);
  const [desc, setDesc] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState('');
  const [error, setError] = useState<{ field: FieldError; message: string } | null>(null);

  // Derive the currency symbol from the parent formatter so we always match
  // the user's home currency without plumbing the code through props.
  const currencySymbol = useMemo(() => {
    const sample = formatAmount(0);
    const stripped = sample.replace(/[\d.,\s ]/g, '').trim();
    return stripped || '$';
  }, [formatAmount]);

  const reset = () => {
    setDesc('');
    setAmount('');
    setDate('');
    setError(null);
    setAdding(false);
  };

  const submit = () => {
    const trimmed = desc.trim();
    if (!trimmed) {
      setError({ field: 'description', message: 'Add a description' });
      return;
    }
    const parsed = Number(amount);
    if (!amount || Number.isNaN(parsed) || parsed <= 0) {
      setError({ field: 'amount', message: 'Enter an amount greater than 0' });
      return;
    }
    onAddExpense(trimmed, parsed, date || undefined);
    reset();
  };

  const descError = error?.field === 'description';
  const amountError = error?.field === 'amount';

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
            {expenses.map((e) => {
              const isAuto = e.source && e.source !== 'manual';
              return (
                <div
                  key={e.id}
                  className="grid grid-cols-[1fr_90px_100px_22px] gap-2 items-center bg-white dark:bg-white/[0.04] border border-[#f0eee9] dark:border-white/[0.06] rounded-md px-2.5 py-2 text-[12px]"
                >
                  <span className="text-gray-900 dark:text-gray-200 truncate flex items-center gap-1.5">
                    {isAuto && (
                      <span
                        title="Pulled from itinerary"
                        className="text-[8px] uppercase tracking-[0.08em] font-bold text-[var(--trip-base)] bg-[rgb(var(--trip-base-rgb)/0.08)] rounded px-1 py-0.5"
                      >
                        Auto
                      </span>
                    )}
                    {e.description}
                  </span>
                  <span className="text-[10px] text-gray-400 text-right">{e.date ?? ''}</span>
                  <span className="tabular-nums font-semibold text-gray-900 dark:text-white text-right">{formatAmount(e.amount)}</span>
                  <button onClick={() => onDeleteExpense(e.id)} aria-label="Delete expense" className="text-gray-300 hover:text-red-600 transition-colors text-center">
                    <X size={12} />
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {adding && (
          <div className="mt-2 space-y-1">
            <div
              className={`grid grid-cols-[1fr_120px_120px_auto] gap-2 items-center px-2.5 py-2 border rounded-md bg-white dark:bg-white/[0.04] transition-colors ${
                error ? 'border-red-300 dark:border-red-500/50' : 'border-dashed border-[var(--trip-base)]'
              }`}
            >
              <input
                type="text"
                autoFocus
                placeholder="Description"
                value={desc}
                onChange={(e) => { setDesc(e.target.value); if (descError) setError(null); }}
                onKeyDown={(e) => { if (e.key === 'Enter') submit(); else if (e.key === 'Escape') reset(); }}
                aria-invalid={descError}
                className={`text-[12px] bg-transparent border-none outline-none placeholder:text-gray-400 text-gray-900 dark:text-white ${
                  descError ? 'placeholder:text-red-400' : ''
                }`}
              />
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') submit(); else if (e.key === 'Escape') reset(); }}
                className="text-[11px] bg-transparent border-none outline-none text-gray-600 dark:text-gray-300"
              />
              <div
                className={`flex items-center gap-1 border rounded-md px-2 h-7 ${
                  amountError
                    ? 'border-red-300 dark:border-red-500/50 bg-red-50/50 dark:bg-red-500/[0.06]'
                    : 'border-gray-200 dark:border-white/[0.08]'
                }`}
              >
                <span className="text-[12px] text-gray-400 select-none">{currencySymbol}</span>
                <input
                  type="number"
                  step="any"
                  min="0"
                  inputMode="decimal"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => { setAmount(e.target.value); if (amountError) setError(null); }}
                  onKeyDown={(e) => { if (e.key === 'Enter') submit(); else if (e.key === 'Escape') reset(); }}
                  aria-invalid={amountError}
                  className="text-[12px] bg-transparent border-none outline-none text-right tabular-nums font-semibold text-gray-900 dark:text-white w-full"
                />
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={submit}
                  aria-label="Add expense"
                  className="w-7 h-7 rounded-md bg-[var(--trip-base)] text-white flex items-center justify-center hover:opacity-90 transition-opacity"
                >
                  <Plus size={13} />
                </button>
                <button
                  onClick={reset}
                  aria-label="Cancel"
                  className="w-7 h-7 rounded-md text-gray-400 hover:bg-gray-100 dark:hover:bg-white/[0.06] flex items-center justify-center"
                >
                  <X size={13} />
                </button>
              </div>
            </div>
            {error && (
              <p role="alert" className="text-[11px] font-medium text-red-600 dark:text-red-400 px-1">
                {error.message}
              </p>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}
