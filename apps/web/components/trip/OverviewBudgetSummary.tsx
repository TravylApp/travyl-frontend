'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowUpRight, Wallet } from 'lucide-react';
import { useHomeCurrency } from '@travyl/shared';

interface BudgetCategory {
  label: string;
  amount: number;
  color: string;
}

// Travyl-brand palette: brand blue + navy as anchors, gold for warmth, mid /
// light blues to fill out the spectrum without going rainbow. Matches the
// BudgetPieChart palette so all budget visualizations read as one family.
const COLORS = ['#003594', '#d4b57a', '#1e3a5f', '#1A5CC8', '#4D7FD7'];

export default function OverviewBudgetSummary({
  trip,
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  trip: any;
}) {
  const { format } = useHomeCurrency();
  const params = useParams();
  const tripId = (params?.id as string | undefined) ?? trip?.id;

  const rawCur: string =
    trip?.currency ?? trip?.trip_context?.quick_facts?.currency ?? 'USD';
  const tripCurrency = rawCur.match(/^[A-Z]{3}/)?.[0] ?? 'USD';

  const { categories, totalEstimated, totalBudget, perDay, duration } = useMemo(() => {
    if (!trip?.trip_context)
      return { categories: [], totalEstimated: 0, totalBudget: 0, perDay: 0, duration: 0 };

    const ctx = trip.trip_context;
    const cost = ctx.cost_of_living;

    const days =
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
      (hotel?.price ?? hotel?.price_per_night ?? 0) * days,
    );

    const mealCheap = cost?.meal_cheap
      ? parseFloat(String(cost.meal_cheap).replace(/[^0-9.]/g, ''))
      : 0;
    const mealMid = cost?.meal_mid
      ? parseFloat(String(cost.meal_mid).replace(/[^0-9.]/g, ''))
      : 0;
    const dailyFood = mealCheap + mealMid || 40;
    const foodTotal = Math.round(dailyFood * days * travelers);

    const transport = cost?.public_transport
      ? parseFloat(String(cost.public_transport).replace(/[^0-9.]/g, ''))
      : 5;
    const transportTotal = Math.round(transport * days * travelers);

    const activitiesTotal = Math.round(days * 25 * travelers);

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
      perDay: Math.round(totalEstimated / days),
      duration: days,
    };
  }, [trip]);

  if (!trip) return null;

  const hasBudget = totalBudget > 0;
  const hasEstimates = totalEstimated > 0;
  const positive = categories.filter((c) => c.amount > 0);
  const total = totalEstimated || 1;
  const usedPct = hasBudget ? Math.min(100, (totalEstimated / totalBudget) * 100) : 0;

  return (
    <section className="rounded-2xl border border-gray-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.03] shadow-sm overflow-hidden">
      <header className="flex items-start justify-between gap-4 px-5 lg:px-6 pt-5 pb-4 border-b border-gray-100 dark:border-white/[0.06]">
        <div>
          <p className="text-[10px] tracking-[0.3em] uppercase font-semibold mb-1 text-gray-500 dark:text-white/70">
            Trip Budget
          </p>
          <h2 className="text-xl font-normal tracking-wide text-gray-900 dark:text-white font-serif">
            Budget Overview
          </h2>
        </div>
        {tripId && (
          <Link
            href={`/trip/${tripId}/budget`}
            className="inline-flex items-center gap-1 text-[11px] font-semibold text-[color:var(--trip-base)] hover:opacity-80 transition-opacity shrink-0"
          >
            Manage
            <ArrowUpRight size={12} />
          </Link>
        )}
      </header>

      <div className="px-5 lg:px-6 py-5 space-y-5">
        {/* Hero summary — total, per day, optional budget vs estimate */}
        <div className="flex flex-wrap items-end gap-x-8 gap-y-3">
          <div>
            <p className="text-[10px] uppercase tracking-[0.18em] font-semibold text-gray-400 dark:text-white/40 mb-1">
              Estimated total
            </p>
            <div className="flex items-baseline gap-2">
              <span className="text-[32px] font-bold tracking-tight text-gray-900 dark:text-white tabular-nums">
                {hasEstimates ? format(totalEstimated, tripCurrency) : '—'}
              </span>
              {duration > 0 && hasEstimates && (
                <span className="text-[12px] text-gray-500 dark:text-gray-400">
                  · {format(perDay, tripCurrency)}/day
                </span>
              )}
            </div>
          </div>
          {hasBudget && (
            <div>
              <p className="text-[10px] uppercase tracking-[0.18em] font-semibold text-gray-400 dark:text-white/40 mb-1">
                Budget
              </p>
              <span className="text-[20px] font-semibold text-gray-700 dark:text-gray-200 tabular-nums">
                {format(totalBudget, tripCurrency)}
              </span>
            </div>
          )}
          {!hasBudget && (
            <Link
              href={tripId ? `/trip/${tripId}/budget` : '#'}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold border border-gray-200 dark:border-white/[0.12] text-gray-600 dark:text-gray-300 hover:border-[color:var(--trip-base)] hover:text-[color:var(--trip-base)] transition-colors"
            >
              <Wallet size={12} />
              Set a budget
            </Link>
          )}
        </div>

        {hasBudget && hasEstimates && (
          <div>
            <div className="h-2 rounded-full bg-gray-100 dark:bg-white/[0.06] overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${usedPct}%`,
                  background: usedPct > 100 ? '#ef4444' : 'var(--trip-base)',
                }}
              />
            </div>
            <p className="mt-1.5 text-[11px] text-gray-500 dark:text-gray-400">
              {usedPct.toFixed(0)}% of budget allocated
            </p>
          </div>
        )}

        {hasEstimates && (
          <div className="space-y-2.5">
            {/* Stacked progress bar — proportional segments */}
            <div className="h-2.5 rounded-full bg-gray-100 dark:bg-white/[0.06] overflow-hidden flex">
              {positive.map((cat) => (
                <div
                  key={cat.label}
                  style={{
                    width: `${(cat.amount / total) * 100}%`,
                    backgroundColor: cat.color,
                  }}
                  title={`${cat.label}: ${format(cat.amount, tripCurrency)}`}
                />
              ))}
            </div>

            {/* Legend grid — 2 cols on small, 4 on large for at-a-glance scanning */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-2 pt-1">
              {positive.map((cat) => (
                <div key={cat.label} className="flex items-center gap-2 min-w-0">
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: cat.color }}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate">
                      {cat.label}
                    </p>
                    <p className="text-[13px] font-semibold text-gray-900 dark:text-white tabular-nums">
                      {format(cat.amount, tripCurrency)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {!hasEstimates && (
          <p className="text-[12px] text-gray-500 dark:text-gray-400">
            We&apos;ll estimate costs once trip details are filled in.
          </p>
        )}
      </div>
    </section>
  );
}
