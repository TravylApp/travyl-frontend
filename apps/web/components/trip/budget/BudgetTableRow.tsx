'use client';

import { useState } from 'react';
import { ChevronRight } from 'lucide-react';
import { iconFor } from './categoryIcons';
import { computeHealth } from './budgetMath';
import { ExpensesDrawer } from './ExpensesDrawer';
import { EditableCell } from './EditableCell';
import type { BudgetItem } from './types';

export interface BudgetTableRowProps {
  item: BudgetItem;
  formatAmount: (n: number) => string;
  onChangeBudgeted: (id: string, next: number) => void;
  onAddExpense: (id: string, description: string, amount: number, date?: string) => void;
  onDeleteExpense: (id: string, expenseId: string) => void;
}

export function BudgetTableRow({
  item, formatAmount, onChangeBudgeted, onAddExpense, onDeleteExpense,
}: BudgetTableRowProps) {
  const [expanded, setExpanded] = useState(false);
  const Icon = iconFor(item.category);
  const remaining = item.budgeted - item.actual;
  const pct = item.budgeted > 0 ? (item.actual / item.budgeted) * 100 : 0;
  const health = computeHealth(pct);

  const remainingClass =
    health === 'over' ? 'text-red-700 dark:text-red-400 font-semibold'
    : health === 'warn' ? 'text-amber-700 dark:text-amber-400 font-semibold'
    : 'text-emerald-700 dark:text-emerald-400';

  const barColor =
    health === 'over' ? '#dc2626'
    : health === 'warn' ? '#d97706'
    : 'var(--trip-base)';

  return (
    <>
      <tr className="border-b border-[#f5f3ee] dark:border-white/[0.04] group">
        <td className="py-2.5 pr-2">
          <div
            className="w-7 h-7 rounded-md flex items-center justify-center"
            style={{ backgroundColor: 'rgb(var(--trip-base-rgb) / 0.08)', color: 'var(--trip-base)' }}
          >
            <Icon size={14} />
          </div>
        </td>
        <td className="py-2.5 pr-2">
          <button
            onClick={() => setExpanded((v) => !v)}
            aria-expanded={expanded}
            aria-controls={`expenses-${item.id}`}
            className="flex items-center gap-1.5 text-sm font-medium text-gray-900 dark:text-white hover:text-[var(--trip-base)] transition-colors"
          >
            <ChevronRight
              size={12}
              className={`text-gray-400 transition-transform ${expanded ? 'rotate-90' : ''}`}
            />
            {item.category}
          </button>
        </td>
        <td className="py-2.5 px-2 text-right">
          <EditableCell
            value={item.budgeted}
            onCommit={(n) => onChangeBudgeted(item.id, n)}
            format={formatAmount}
            ariaLabel={`Budget for ${item.category}`}
          />
        </td>
        <td className="py-2.5 px-2 text-right tabular-nums text-gray-600 dark:text-gray-300">
          {formatAmount(item.actual)}
        </td>
        <td className={`py-2.5 px-2 text-right tabular-nums ${remainingClass}`}>
          {remaining < 0 ? `−${formatAmount(Math.abs(remaining))}` : formatAmount(remaining)}
        </td>
        <td className="py-2.5 pl-2 pr-1">
          <div
            role="progressbar"
            aria-valuenow={item.actual}
            aria-valuemin={0}
            aria-valuemax={item.budgeted}
            className="h-1 rounded-full bg-[#f0eee9] dark:bg-white/[0.06] overflow-hidden"
          >
            <div
              className="h-full rounded-full transition-all duration-200"
              style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: barColor }}
            />
          </div>
        </td>
      </tr>
      {expanded && (
        <tr id={`expenses-${item.id}`}>
          <td colSpan={6} className="px-1">
            <ExpensesDrawer
              expenses={item.expenses ?? []}
              formatAmount={formatAmount}
              onAddExpense={(d, a, dt) => onAddExpense(item.id, d, a, dt)}
              onDeleteExpense={(eid) => onDeleteExpense(item.id, eid)}
            />
          </td>
        </tr>
      )}
    </>
  );
}
