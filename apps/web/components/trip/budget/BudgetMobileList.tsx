'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { AnimatePresence } from 'motion/react';
import { iconFor } from './categoryIcons';
import { computeHealth } from './budgetMath';
import { ExpensesDrawer } from './ExpensesDrawer';
import { EditableCell } from './EditableCell';
import type { BudgetItem } from './types';

export interface BudgetMobileListProps {
  items: BudgetItem[];
  formatAmount: (n: number) => string;
  onChangeBudgeted: (id: string, next: number) => void;
  onAddExpense: (id: string, description: string, amount: number, date?: string) => void;
  onDeleteExpense: (id: string, expenseId: string) => void;
}

export function BudgetMobileList({
  items, formatAmount, onChangeBudgeted, onAddExpense, onDeleteExpense,
}: BudgetMobileListProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <div className="md:hidden space-y-2.5">
      {items.map((item) => {
        const Icon = iconFor(item.category);
        const pct = item.budgeted > 0 ? (item.actual / item.budgeted) * 100 : 0;
        const health = computeHealth(pct);
        const isExpanded = expandedId === item.id;
        const barColor =
          health === 'over' ? '#dc2626'
          : health === 'warn' ? '#d97706'
          : 'var(--trip-base)';
        const pctColor =
          health === 'over' ? 'text-red-700 dark:text-red-400'
          : health === 'warn' ? 'text-amber-700 dark:text-amber-400'
          : 'text-gray-600 dark:text-gray-400';

        return (
          <div key={item.id} className="bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.08] rounded-xl p-3">
            <button
              onClick={() => setExpandedId(isExpanded ? null : item.id)}
              aria-expanded={isExpanded}
              className="w-full flex items-center justify-between text-left"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-md flex items-center justify-center" style={{ backgroundColor: 'rgb(var(--trip-base-rgb) / 0.08)', color: 'var(--trip-base)' }}>
                  <Icon size={14} />
                </div>
                <span className="text-sm font-semibold text-gray-900 dark:text-white">{item.category}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className={`text-[11px] font-semibold tabular-nums ${pctColor}`}>{pct.toFixed(0)}%</span>
                <ChevronDown size={12} className={`text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
              </div>
            </button>

            <div className="grid grid-cols-2 gap-3 mt-3 mb-2">
              <div>
                <div className="text-[9px] uppercase tracking-[0.08em] font-semibold text-gray-400 mb-0.5">Spent</div>
                <div className="font-serif text-[15px] text-gray-900 dark:text-white tabular-nums">{formatAmount(item.actual)}</div>
              </div>
              <div className="text-right">
                <div className="text-[9px] uppercase tracking-[0.08em] font-semibold text-gray-400 mb-0.5">Budget</div>
                <EditableCell
                  value={item.budgeted}
                  onCommit={(n) => onChangeBudgeted(item.id, n)}
                  format={formatAmount}
                  ariaLabel={`Budget for ${item.category}`}
                  className="font-serif text-[15px] text-gray-900 dark:text-white"
                />
              </div>
            </div>

            <div className="h-1 rounded-full bg-[#f0eee9] dark:bg-white/[0.06] overflow-hidden">
              <div className="h-full rounded-full" style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: barColor }} />
            </div>

            <AnimatePresence initial={false}>
              {isExpanded && (
                <ExpensesDrawer
                  expenses={item.expenses ?? []}
                  formatAmount={formatAmount}
                  onAddExpense={(d, a, dt) => onAddExpense(item.id, d, a, dt)}
                  onDeleteExpense={(eid) => onDeleteExpense(item.id, eid)}
                />
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}
