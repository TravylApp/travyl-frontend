import { describe, it, expect } from 'vitest';
import {
  computeActual,
  computeRemaining,
  computeHealth,
  scaleBudgetsProportionally,
  computeTotals,
} from '../budgetMath';
import type { BudgetItem } from '../types';

describe('computeActual', () => {
  it('sums expense amounts', () => {
    expect(computeActual({ id: 'x', category: 'X', budgeted: 0, actual: 0, fixed: false, expenses: [
      { id: '1', description: 'a', amount: 10 },
      { id: '2', description: 'b', amount: 25.5 },
    ] })).toBe(35.5);
  });
  it('returns 0 when expenses is empty or missing', () => {
    expect(computeActual({ id: 'x', category: 'X', budgeted: 0, actual: 0, fixed: false })).toBe(0);
    expect(computeActual({ id: 'x', category: 'X', budgeted: 0, actual: 0, fixed: false, expenses: [] })).toBe(0);
  });
});

describe('computeRemaining', () => {
  it('returns budgeted minus actual', () => {
    expect(computeRemaining({ budgeted: 100, actual: 30 })).toBe(70);
    expect(computeRemaining({ budgeted: 100, actual: 100 })).toBe(0);
    expect(computeRemaining({ budgeted: 100, actual: 150 })).toBe(-50);
  });
});

describe('computeHealth', () => {
  it('returns under for 0–80%', () => {
    expect(computeHealth(0)).toBe('under');
    expect(computeHealth(50)).toBe('under');
    expect(computeHealth(79.99)).toBe('under');
  });
  it('returns warn for 80–100%', () => {
    expect(computeHealth(80)).toBe('warn');
    expect(computeHealth(95)).toBe('warn');
    expect(computeHealth(100)).toBe('warn');
  });
  it('returns over for >100%', () => {
    expect(computeHealth(100.01)).toBe('over');
    expect(computeHealth(150)).toBe('over');
  });
  it('handles 0 budgeted (NaN guard)', () => {
    expect(computeHealth(NaN)).toBe('under');
  });
});

describe('scaleBudgetsProportionally', () => {
  const sample: BudgetItem[] = [
    { id: 'a', category: 'A', budgeted: 100, actual: 0, fixed: false },
    { id: 'b', category: 'B', budgeted: 200, actual: 0, fixed: false },
    { id: 'c', category: 'C', budgeted: 100, actual: 0, fixed: false },
  ];

  it('scales each category by the ratio of new total to old total', () => {
    const scaled = scaleBudgetsProportionally(sample, 800);
    expect(scaled.map((i) => i.budgeted)).toEqual([200, 400, 200]);
  });

  it('handles zero current total without dividing by zero (assigns equal share)', () => {
    const empty: BudgetItem[] = [
      { id: 'a', category: 'A', budgeted: 0, actual: 0, fixed: false },
      { id: 'b', category: 'B', budgeted: 0, actual: 0, fixed: false },
    ];
    const scaled = scaleBudgetsProportionally(empty, 100);
    expect(scaled.map((i) => i.budgeted)).toEqual([50, 50]);
  });

  it('rounds to whole dollars', () => {
    const scaled = scaleBudgetsProportionally(sample, 333);
    expect(scaled.map((i) => i.budgeted).every((n) => Number.isInteger(n))).toBe(true);
  });
});

describe('computeTotals', () => {
  it('returns total budget and total actual', () => {
    const items: BudgetItem[] = [
      { id: 'a', category: 'A', budgeted: 100, actual: 30, fixed: false },
      { id: 'b', category: 'B', budgeted: 200, actual: 50, fixed: false },
    ];
    expect(computeTotals(items)).toEqual({ totalBudgeted: 300, totalActual: 80 });
  });
});
