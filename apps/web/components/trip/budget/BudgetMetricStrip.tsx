'use client';

import { EditableCell } from './EditableCell';

export interface BudgetMetricStripProps {
  totalBudgeted: number;
  totalActual: number;
  daysInTrip: number;
  daysElapsed: number;
  formatAmount: (n: number) => string;
  onChangeTotalBudget: (next: number) => void;
}

export function BudgetMetricStrip({
  totalBudgeted, totalActual, daysInTrip, daysElapsed, formatAmount, onChangeTotalBudget,
}: BudgetMetricStripProps) {
  const remaining = totalBudgeted - totalActual;
  const pct = totalBudgeted > 0 ? (totalActual / totalBudgeted) * 100 : 0;
  const dailyAvg = daysElapsed > 0 ? totalActual / daysElapsed : 0;
  const dailyTarget = daysInTrip > 0 ? totalBudgeted / daysInTrip : 0;
  const remainingPerDay =
    daysInTrip - daysElapsed > 0 && remaining > 0
      ? remaining / (daysInTrip - daysElapsed)
      : 0;

  const remainingColor =
    pct >= 100 ? 'text-red-700 dark:text-red-400'
    : pct >= 80 ? 'text-amber-700 dark:text-amber-400'
    : 'text-emerald-700 dark:text-emerald-400';

  const pace =
    dailyTarget === 0 ? '—'
    : dailyAvg > dailyTarget * 1.05 ? 'over pace'
    : dailyAvg < dailyTarget * 0.95 ? 'under pace'
    : 'on track';

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 px-2 pb-5 mb-5 border-b border-gray-100 dark:border-white/[0.06]">
      <div>
        <div className="text-[9px] uppercase tracking-[0.1em] font-semibold text-gray-400 mb-1">Total budget</div>
        <EditableCell
          value={totalBudgeted}
          onCommit={onChangeTotalBudget}
          format={formatAmount}
          ariaLabel="Total budget"
          className="font-serif text-[26px] font-normal text-gray-900 dark:text-white !text-left !justify-start !w-auto"
        />
        <div className="text-[10px] text-gray-400 mt-1">{formatAmount(Math.round(dailyTarget))}/day · {daysInTrip} days</div>
      </div>

      <div>
        <div className="text-[9px] uppercase tracking-[0.1em] font-semibold text-gray-400 mb-1">Spent</div>
        <div className="font-serif text-[26px] font-normal text-gray-900 dark:text-white tabular-nums">{formatAmount(totalActual)}</div>
        <div className="text-[10px] text-gray-400 mt-1">{pct.toFixed(0)}% of budget</div>
      </div>

      <div>
        <div className="text-[9px] uppercase tracking-[0.1em] font-semibold text-gray-400 mb-1">Remaining</div>
        <div className={`font-serif text-[26px] font-normal tabular-nums ${remainingColor}`}>{formatAmount(Math.abs(remaining))}{remaining < 0 ? ' over' : ''}</div>
        <div className="text-[10px] text-gray-400 mt-1">{remainingPerDay > 0 ? `${formatAmount(Math.round(remainingPerDay))}/day left` : '—'}</div>
      </div>

      <div>
        <div className="text-[9px] uppercase tracking-[0.1em] font-semibold text-gray-400 mb-1">Daily avg spent</div>
        <div className="font-serif text-[26px] font-normal text-gray-900 dark:text-white tabular-nums">{formatAmount(Math.round(dailyAvg))}</div>
        <div className="text-[10px] text-gray-400 mt-1">{pace}</div>
      </div>
    </div>
  );
}
