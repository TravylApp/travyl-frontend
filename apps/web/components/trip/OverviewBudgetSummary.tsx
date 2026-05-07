'use client';

import { useMemo } from 'react';
import { useHomeCurrency } from '@travyl/shared';
import { Module } from './Module';

interface BudgetCategory {
  label: string;
  amount: number;
  color: string;
}

const COLORS = ['#003594', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899'];

function DonutChart({
  categories,
  total,
  size,
}: {
  categories: BudgetCategory[];
  total: number;
  size: number;
}) {
  const r = size * 0.38;
  const strokeWidth = size * 0.085;
  const cx = size / 2;
  const cy = size / 2;
  const circ = 2 * Math.PI * r;

  let cumulative = 0;
  const positive = categories.filter((c) => c.amount > 0);
  const segments = positive.map((cat) => {
    const proportion = cat.amount / total;
    const len = proportion * circ;
    const seg = {
      ...cat,
      dashArray: `${Math.max(len, 1)} ${circ - Math.max(len, 1)}` as const,
      dashOffset: -cumulative,
    };
    cumulative += len;
    return seg;
  });

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <g transform={`rotate(-90, ${cx}, ${cy})`}>
        <circle
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke="currentColor"
          className="text-gray-200 dark:text-white/[0.08]"
          strokeWidth={strokeWidth}
        />
        {segments.map((seg, i) => (
          <circle
            key={i}
            cx={cx}
            cy={cy}
            r={r}
            fill="none"
            stroke={seg.color}
            strokeWidth={strokeWidth}
            strokeDasharray={seg.dashArray}
            strokeDashoffset={seg.dashOffset}
            strokeLinecap="butt"
          />
        ))}
      </g>
      <text
        x={cx}
        y={cy}
        textAnchor="middle"
        dominantBaseline="central"
        className="fill-gray-900 dark:fill-white"
        fontSize={size * 0.11}
        fontWeight={700}
      >
        {total.toLocaleString()}
      </text>
    </svg>
  );
}

export default function OverviewBudgetSummary({
  trip,
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  trip: any;
}) {
  const { format } = useHomeCurrency();

  const rawCur: string =
    trip?.currency ?? trip?.trip_context?.quick_facts?.currency ?? 'USD';
  const tripCurrency = rawCur.match(/^[A-Z]{3}/)?.[0] ?? 'USD';

  const { categories, totalEstimated, totalBudget } = useMemo(() => {
    if (!trip?.trip_context)
      return { categories: [], totalEstimated: 0, totalBudget: 0 };

    const ctx = trip.trip_context;
    const cost = ctx.cost_of_living;

    const duration =
      trip.start_date && trip.end_date
        ? Math.max(
            1,
            Math.ceil(
              (new Date(trip.end_date).getTime() -
                new Date(trip.start_date).getTime()) /
                86400000,
            ),
          )
        : 5;
    const travelers = trip.travelers ?? 1;

    const hotel = ctx.hotels?.[0] || ctx.all_hotels?.[0];
    const hotelTotal = Math.round(
      (hotel?.price ?? hotel?.price_per_night ?? 0) * duration,
    );

    const mealCheap = cost?.meal_cheap
      ? parseFloat(String(cost.meal_cheap).replace(/[^0-9.]/g, ''))
      : 0;
    const mealMid = cost?.meal_mid
      ? parseFloat(String(cost.meal_mid).replace(/[^0-9.]/g, ''))
      : 0;
    const dailyFood = mealCheap + mealMid || 40;
    const foodTotal = Math.round(dailyFood * duration * travelers);

    const transport = cost?.public_transport
      ? parseFloat(String(cost.public_transport).replace(/[^0-9.]/g, ''))
      : 5;
    const transportTotal = Math.round(transport * duration * travelers);

    const activitiesTotal = Math.round(duration * 25 * travelers);

    const cats: BudgetCategory[] = [
      { label: 'Hotels', amount: hotelTotal, color: COLORS[0] },
      { label: 'Food & Dining', amount: foodTotal, color: COLORS[1] },
      { label: 'Transport', amount: transportTotal, color: COLORS[2] },
      { label: 'Activities', amount: activitiesTotal, color: COLORS[3] },
    ];

    const totalEstimated = cats.reduce((s, c) => s + c.amount, 0);

    return {
      categories: cats,
      totalEstimated,
      totalBudget: trip.budget ?? 0,
    };
  }, [trip]);

  if (!trip) return null;

  const hasBudget = totalBudget > 0;
  const hasEstimates = totalEstimated > 0;

  return (
    <Module title="Budget Overview" titleSize="sm">
      <div className="flex items-start gap-6">
        {/* Donut chart */}
        <div className="shrink-0">
          {hasEstimates ? (
            <DonutChart
              categories={categories}
              total={totalEstimated}
              size={120}
            />
          ) : (
            <div className="w-[120px] h-[120px] rounded-full bg-gray-100 dark:bg-white/[0.04] flex items-center justify-center">
              <span className="text-[11px] text-gray-400">No data</span>
            </div>
          )}
        </div>

        {/* Summary and legend */}
        <div className="flex-1 min-w-0">
          {hasBudget ? (
            <div className="flex items-baseline gap-2 mb-3">
              <span className="text-[22px] font-bold text-gray-900 dark:text-white">
                {format(totalBudget, tripCurrency)}
              </span>
              <span className="text-[13px] text-gray-500">budgeted</span>
            </div>
          ) : (
            <p className="text-[13px] text-gray-500 mb-3">
              Set a budget to track spending
            </p>
          )}

          <div className="space-y-1.5">
            {categories
              .filter((c) => c.amount > 0)
              .map((cat) => (
                <div
                  key={cat.label}
                  className="flex items-center justify-between text-[12px]"
                >
                  <div className="flex items-center gap-1.5">
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: cat.color }}
                    />
                    <span className="text-gray-600 dark:text-gray-400">
                      {cat.label}
                    </span>
                  </div>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {format(cat.amount, tripCurrency)}
                  </span>
                </div>
              ))}
            {hasEstimates && (
              <div className="flex items-center justify-between text-[12px] pt-1.5 mt-1.5 border-t border-gray-100 dark:border-white/[0.06]">
                <span className="text-gray-500">Estimated total</span>
                <span className="font-semibold text-gray-900 dark:text-white">
                  {format(totalEstimated, tripCurrency)}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </Module>
  );
}
