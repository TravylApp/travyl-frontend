import type { BudgetItem, HealthState } from './types';

export function computeActual(item: BudgetItem): number {
  if (!item.expenses || item.expenses.length === 0) return 0;
  return item.expenses.reduce((sum, e) => sum + (e.amount ?? 0), 0);
}

export function computeRemaining(item: { budgeted: number; actual: number }): number {
  return item.budgeted - item.actual;
}

export function computeHealth(percentUsed: number): HealthState {
  if (Number.isNaN(percentUsed) || percentUsed < 80) return 'under';
  if (percentUsed <= 100) return 'warn';
  return 'over';
}

export function scaleBudgetsProportionally(items: BudgetItem[], newTotal: number): BudgetItem[] {
  if (items.length === 0) return items;
  const oldTotal = items.reduce((s, i) => s + i.budgeted, 0);
  if (oldTotal === 0) {
    const each = Math.round(newTotal / items.length);
    return items.map((i) => ({ ...i, budgeted: each }));
  }
  const ratio = newTotal / oldTotal;
  return items.map((i) => ({ ...i, budgeted: Math.round(i.budgeted * ratio) }));
}

export function computeTotals(items: BudgetItem[]): { totalBudgeted: number; totalActual: number } {
  return items.reduce(
    (acc, i) => ({
      totalBudgeted: acc.totalBudgeted + i.budgeted,
      totalActual: acc.totalActual + i.actual,
    }),
    { totalBudgeted: 0, totalActual: 0 },
  );
}
