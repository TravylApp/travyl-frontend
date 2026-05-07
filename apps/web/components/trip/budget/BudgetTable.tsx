'use client';

import { BudgetTableRow } from './BudgetTableRow';
import { computeTotals, computeHealth } from './budgetMath';
import type { BudgetItem } from './types';

export interface BudgetTableProps {
  items: BudgetItem[];
  formatAmount: (n: number) => string;
  onChangeBudgeted: (id: string, next: number) => void;
  onAddExpense: (id: string, description: string, amount: number, date?: string) => void;
  onDeleteExpense: (id: string, expenseId: string) => void;
}

export function BudgetTable({
  items, formatAmount, onChangeBudgeted, onAddExpense, onDeleteExpense,
}: BudgetTableProps) {
  const { totalBudgeted, totalActual } = computeTotals(items);
  const totalRemaining = totalBudgeted - totalActual;
  const totalPct = totalBudgeted > 0 ? (totalActual / totalBudgeted) * 100 : 0;
  const totalHealth = computeHealth(totalPct);
  const totalRemainingClass =
    totalHealth === 'over' ? 'text-red-700 dark:text-red-400'
    : totalHealth === 'warn' ? 'text-amber-700 dark:text-amber-400'
    : 'text-emerald-700 dark:text-emerald-400';
  const totalBarColor =
    totalHealth === 'over' ? '#dc2626'
    : totalHealth === 'warn' ? '#d97706'
    : 'var(--trip-base)';

  return (
    <table className="w-full hidden md:table">
      <colgroup>
        <col style={{ width: 36 }} />
        <col />
        <col style={{ width: 120 }} />
        <col style={{ width: 120 }} />
        <col style={{ width: 120 }} />
        <col style={{ width: 160 }} />
      </colgroup>
      <thead>
        <tr className="text-[9px] uppercase tracking-[0.08em] font-bold text-gray-400 bg-[#fafaf7] dark:bg-white/[0.02]">
          <th></th>
          <th className="text-left py-2 px-2">Category</th>
          <th className="text-right py-2 px-2">Budgeted</th>
          <th className="text-right py-2 px-2">Spent</th>
          <th className="text-right py-2 px-2">Remaining</th>
          <th className="text-left py-2 pl-2 pr-1">Progress</th>
        </tr>
      </thead>
      <tbody>
        {items.map((item) => (
          <BudgetTableRow
            key={item.id}
            item={item}
            formatAmount={formatAmount}
            onChangeBudgeted={onChangeBudgeted}
            onAddExpense={onAddExpense}
            onDeleteExpense={onDeleteExpense}
          />
        ))}
      </tbody>
      <tfoot>
        <tr className="bg-[#fafaf7] dark:bg-white/[0.02] font-semibold">
          <td></td>
          <td className="py-3 px-2 text-[13px] text-gray-900 dark:text-white">Total</td>
          <td className="py-3 px-2 text-right tabular-nums text-gray-900 dark:text-white">{formatAmount(totalBudgeted)}</td>
          <td className="py-3 px-2 text-right tabular-nums text-gray-900 dark:text-white">{formatAmount(totalActual)}</td>
          <td className={`py-3 px-2 text-right tabular-nums ${totalRemainingClass}`}>
            {totalRemaining < 0 ? `−${formatAmount(Math.abs(totalRemaining))}` : formatAmount(totalRemaining)}
          </td>
          <td className="py-3 pl-2 pr-1">
            <div className="h-1 rounded-full bg-[#f0eee9] dark:bg-white/[0.06] overflow-hidden">
              <div className="h-full rounded-full" style={{ width: `${Math.min(totalPct, 100)}%`, backgroundColor: totalBarColor }} />
            </div>
          </td>
        </tr>
      </tfoot>
    </table>
  );
}
