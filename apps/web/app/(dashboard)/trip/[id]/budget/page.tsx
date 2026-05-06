'use client';

import { use, useState, useEffect, useRef } from 'react';
import { Plus } from 'lucide-react';
import { useItineraryScreen, useHomeCurrency } from '@travyl/shared';
import { supabase } from '@travyl/shared';
import { Module } from '@/components/trip/Module';
import { BudgetMetricStrip } from '@/components/trip/budget/BudgetMetricStrip';
import { BudgetTable } from '@/components/trip/budget/BudgetTable';
import { BudgetMobileList } from '@/components/trip/budget/BudgetMobileList';
import { computeTotals, scaleBudgetsProportionally } from '@/components/trip/budget/budgetMath';
import type { BudgetItem, BudgetExpense } from '@/components/trip/budget/types';

const EMPTY_BUDGET: BudgetItem[] = [
  { id: 'flights', category: 'Flights', budgeted: 0, actual: 0, fixed: true, expenses: [] },
  { id: 'hotels', category: 'Hotels', budgeted: 0, actual: 0, fixed: true, expenses: [] },
  { id: 'food', category: 'Food & Dining', budgeted: 0, actual: 0, fixed: false, expenses: [] },
  { id: 'activities', category: 'Activities', budgeted: 0, actual: 0, fixed: false, expenses: [] },
  { id: 'transportation', category: 'Transportation', budgeted: 0, actual: 0, fixed: false, expenses: [] },
  { id: 'shopping', category: 'Shopping', budgeted: 0, actual: 0, fixed: false, expenses: [] },
  { id: 'other', category: 'Other', budgeted: 0, actual: 0, fixed: false, expenses: [] },
];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function generateBudgetFromTrip(trip: any, formatAmount: (n: number, cur?: string) => string = (n) => `$${n}`): BudgetItem[] {
  if (!trip) return EMPTY_BUDGET;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ctx = trip.trip_context as any;
  const cost = ctx?.cost_of_living;
  const hotel = ctx?.hotels?.[0] || ctx?.all_hotels?.[0];
  const rawCur: string = trip.currency ?? ctx?.quick_facts?.currency ?? 'USD';
  const tripCurrency = rawCur.match(/^[A-Z]{3}/)?.[0] ?? 'USD';
  const duration = trip.start_date && trip.end_date
    ? Math.max(1, Math.ceil((new Date(trip.end_date).getTime() - new Date(trip.start_date).getTime()) / 86400000))
    : ctx?.weather?.forecast?.length ?? 5;
  const travelers = trip.travelers ?? 1;

  const hotelPrice = (hotel?.price ?? hotel?.price_per_night ?? 0) * duration;
  const mealBudget = cost?.budget_meal ? parseFloat(String(cost.budget_meal).replace(/[^0-9.]/g, '')) : 0;
  const midMeal = cost?.mid_range_meal ? parseFloat(String(cost.mid_range_meal).replace(/[^0-9.]/g, '')) : 0;
  const dailyFood = (mealBudget + midMeal) || 40;
  const transport = cost?.public_transport ? parseFloat(String(cost.public_transport).replace(/[^0-9.]/g, '')) : 5;
  const totalBudget = trip.budget ?? (hotelPrice + dailyFood * duration + transport * duration + 200);

  return [
    { id: 'flights', category: 'Flights', budgeted: Math.round(totalBudget * 0.25), actual: 0, fixed: true, expenses: [] },
    { id: 'hotels', category: 'Hotels', budgeted: hotelPrice || Math.round(totalBudget * 0.30), actual: 0, fixed: true, expenses: hotelPrice ? [
      { id: 'h1', description: `${hotel?.name || 'Hotel'} (${duration} nights × ${formatAmount(hotel?.price ?? hotel?.price_per_night ?? 0, tripCurrency)})`, amount: hotelPrice },
    ] : [] },
    { id: 'food', category: 'Food & Dining', budgeted: Math.round(dailyFood * duration * travelers), actual: 0, fixed: false, expenses: [
      { id: 'fd1', description: `~${formatAmount(Math.round(dailyFood), tripCurrency)}/day × ${duration} days`, amount: 0 },
    ] },
    { id: 'activities', category: 'Activities', budgeted: Math.round(duration * 25 * travelers), actual: 0, fixed: false, expenses: [] },
    { id: 'transportation', category: 'Transportation', budgeted: Math.round(transport * duration * travelers), actual: 0, fixed: false, expenses: [
      { id: 't1', description: `~${formatAmount(Math.round(transport), tripCurrency)}/day × ${duration} days`, amount: 0 },
    ] },
    { id: 'shopping', category: 'Shopping', budgeted: Math.round(duration * 15), actual: 0, fixed: false, expenses: [] },
    { id: 'other', category: 'Other', budgeted: 50, actual: 0, fixed: false, expenses: [] },
  ];
}

function recomputeActuals(items: BudgetItem[]): BudgetItem[] {
  return items.map((i) => ({
    ...i,
    actual: (i.expenses ?? []).reduce((sum, e) => sum + (e.amount ?? 0), 0),
  }));
}

export default function Budget({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { isLoading, trip } = useItineraryScreen(id);
  const { format: formatHome } = useHomeCurrency();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rawCur: string = (trip as any)?.currency ?? (trip as any)?.trip_context?.quick_facts?.currency ?? 'USD';
  const tripCurrency = rawCur.match(/^[A-Z]{3}/)?.[0] ?? 'USD';
  const formatAmount = (n: number) => formatHome(n, tripCurrency);

  const [budgetData, setBudgetData] = useState<BudgetItem[]>(EMPTY_BUDGET);
  const seeded = useRef(false);
  const flushTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    if (trip && !seeded.current) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const saved = (trip.trip_context as any)?.budget_data as BudgetItem[] | undefined;
      const next = saved?.length ? saved : generateBudgetFromTrip(trip, formatHome);
      setBudgetData(recomputeActuals(next));
      seeded.current = true;
    }
  }, [trip, formatHome]);

  const persist = (next: BudgetItem[]) => {
    if (flushTimer.current) clearTimeout(flushTimer.current);
    flushTimer.current = setTimeout(async () => {
      try {
        const { data: current } = await supabase
          .from('trips')
          .select('trip_context')
          .eq('id', id)
          .single();
        const existingContext = (current?.trip_context as Record<string, unknown>) ?? {};
        await supabase
          .from('trips')
          .update({ trip_context: { ...existingContext, budget_data: next } })
          .eq('id', id);
      } catch (err) {
        console.error('Failed to flush budget to Supabase', err);
      }
    }, 1500);
  };

  useEffect(() => {
    return () => { if (flushTimer.current) clearTimeout(flushTimer.current); };
  }, []);

  const daysInTrip = trip?.start_date && trip?.end_date
    ? Math.max(1, Math.ceil((new Date(trip.end_date).getTime() - new Date(trip.start_date).getTime()) / 86400000))
    : 1;
  const today = new Date();
  const start = trip?.start_date ? new Date(trip.start_date) : today;
  const daysElapsed = Math.max(0, Math.min(
    daysInTrip,
    Math.ceil((today.getTime() - start.getTime()) / 86400000),
  ));

  const handleChangeBudgeted = (itemId: string, next: number) => {
    const updated = budgetData.map((i) => i.id === itemId ? { ...i, budgeted: next } : i);
    setBudgetData(updated);
    persist(updated);
  };

  const handleChangeTotalBudget = (next: number) => {
    const updated = recomputeActuals(scaleBudgetsProportionally(budgetData, next));
    setBudgetData(updated);
    persist(updated);
  };

  const handleAddExpense = (itemId: string, description: string, amount: number, date?: string) => {
    const expense: BudgetExpense = { id: `exp-${Date.now()}`, description, amount, date };
    const updated = recomputeActuals(budgetData.map((i) =>
      i.id === itemId ? { ...i, expenses: [...(i.expenses ?? []), expense] } : i
    ));
    setBudgetData(updated);
    persist(updated);
  };

  const handleDeleteExpense = (itemId: string, expenseId: string) => {
    const updated = recomputeActuals(budgetData.map((i) =>
      i.id === itemId ? { ...i, expenses: (i.expenses ?? []).filter((e) => e.id !== expenseId) } : i
    ));
    setBudgetData(updated);
    persist(updated);
  };

  if (isLoading) {
    return (
      <div className="px-4 sm:px-6 lg:px-10 py-8">
        <Module title="Budget" description="Loading…">
          <div className="h-40 animate-pulse bg-gray-100 dark:bg-white/[0.04] rounded-xl" />
        </Module>
      </div>
    );
  }

  const { totalBudgeted, totalActual } = computeTotals(budgetData);

  return (
    <div className="w-full px-4 sm:px-6 lg:px-10 py-8 lg:py-12">
      <Module
        title="Budget"
        description="Edit any cell · click a category to expand expenses"
        action={
          <button
            className="flex items-center gap-1.5 px-3 h-9 rounded-xl text-[12px] font-semibold text-white shadow-sm hover:shadow-md transition-shadow"
            style={{ backgroundColor: 'var(--trip-base)' }}
            onClick={() => {
              // Defer category picker to follow-up; for now, no-op so the affordance is still visible.
            }}
          >
            <Plus size={13} /> Expense
          </button>
        }
      >
        <BudgetMetricStrip
          totalBudgeted={totalBudgeted}
          totalActual={totalActual}
          daysInTrip={daysInTrip}
          daysElapsed={daysElapsed}
          formatAmount={formatAmount}
          onChangeTotalBudget={handleChangeTotalBudget}
        />
        <BudgetTable
          items={budgetData}
          formatAmount={formatAmount}
          onChangeBudgeted={handleChangeBudgeted}
          onAddExpense={handleAddExpense}
          onDeleteExpense={handleDeleteExpense}
        />
        <BudgetMobileList
          items={budgetData}
          formatAmount={formatAmount}
          onChangeBudgeted={handleChangeBudgeted}
          onAddExpense={handleAddExpense}
          onDeleteExpense={handleDeleteExpense}
        />
      </Module>
    </div>
  );
}
