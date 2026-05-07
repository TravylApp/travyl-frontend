'use client';

import { use, useState, useEffect, useMemo, useRef } from 'react';
import { Plus } from 'lucide-react';
import { useItineraryScreen, useHomeCurrency } from '@travyl/shared';
import { supabase } from '@travyl/shared';
import { Module } from '@/components/trip/Module';
import { BudgetMetricStrip } from '@/components/trip/budget/BudgetMetricStrip';
import { BudgetPieChart } from '@/components/trip/budget/BudgetPieChart';
import { BudgetTable } from '@/components/trip/budget/BudgetTable';
import { BudgetMobileList } from '@/components/trip/budget/BudgetMobileList';
import { computeTotals, scaleBudgetsProportionally } from '@/components/trip/budget/budgetMath';
import type { BudgetItem, BudgetExpense } from '@/components/trip/budget/types';

const CATEGORY_ORDER: { id: string; label: string; fixed: boolean }[] = [
  { id: 'flights', label: 'Flights', fixed: true },
  { id: 'hotels', label: 'Hotels', fixed: true },
  { id: 'food', label: 'Food & Dining', fixed: false },
  { id: 'activities', label: 'Activities', fixed: false },
  { id: 'transportation', label: 'Transportation', fixed: false },
  { id: 'shopping', label: 'Shopping', fixed: false },
  { id: 'other', label: 'Other', fixed: false },
];

const EMPTY_BUDGET: BudgetItem[] = CATEGORY_ORDER.map(({ id, label, fixed }) => ({
  id,
  category: label,
  budgeted: 0,
  actual: 0,
  fixed,
  expenses: [],
}));

function categorizeActivity(category: string | null | undefined): string {
  const c = (category ?? '').toLowerCase();
  if (/dining|restaurant|food|cafe|café|bar|coffee|brunch|brewery|bakery/.test(c)) return 'food';
  if (/transport|transit|taxi|uber|subway|bus|train|rental|car/.test(c)) return 'transportation';
  if (/shopping|store|market|mall|boutique|souvenir/.test(c)) return 'shopping';
  return 'activities';
}

type ItineraryDays = ReturnType<typeof useItineraryScreen>['days'];
type Flights = ReturnType<typeof useItineraryScreen>['flights'];
type Hotels = ReturnType<typeof useItineraryScreen>['hotels'];

function buildAutoExpenses(
  days: ItineraryDays,
  flights: Flights,
  hotels: Hotels,
  convert: (amount: number, sourceCurrency: string) => number,
  homeCurrency: string,
): Record<string, BudgetExpense[]> {
  const buckets: Record<string, BudgetExpense[]> = {
    flights: [],
    hotels: [],
    food: [],
    activities: [],
    transportation: [],
    shopping: [],
    other: [],
  };

  for (const f of flights) {
    if (f.price == null) continue;
    const amt = convert(f.price, f.priceCurrency ?? homeCurrency);
    const desc = `${f.airline}${f.flightNumber ? ` ${f.flightNumber}` : ''} · ${f.route}`;
    buckets.flights.push({
      id: `auto-flight-${f.id}`,
      description: desc,
      amount: Math.round(amt),
      date: f.departureDisplay ?? undefined,
      source: 'auto-flight',
    });
  }

  for (const h of hotels) {
    if (h.price == null) continue;
    const isPerNight = (h.priceDisplay ?? '').includes('/night');
    const totalNative = isPerNight ? h.price * h.nights : h.price;
    const amt = convert(totalNative, h.priceCurrency ?? homeCurrency);
    buckets.hotels.push({
      id: `auto-hotel-${h.id}`,
      description: `${h.name} · ${h.nightsLabel}`,
      amount: Math.round(amt),
      date: h.checkInDisplay,
      source: 'auto-hotel',
    });
  }

  for (const day of days) {
    for (const group of day.timeGroups) {
      for (const a of group.activities) {
        if (a.cost == null || a.cost === 0) continue;
        const amt = convert(a.cost, a.costCurrency ?? homeCurrency);
        const bucket = categorizeActivity(a.category);
        buckets[bucket].push({
          id: `auto-activity-${a.id}`,
          description: a.name,
          amount: Math.round(amt),
          date: day.dateLabel || undefined,
          source: 'auto-activity',
        });
      }
    }
  }

  return buckets;
}

function recomputeActuals(items: BudgetItem[]): BudgetItem[] {
  return items.map((i) => ({
    ...i,
    actual: (i.expenses ?? []).reduce((sum, e) => sum + (e.amount ?? 0), 0),
  }));
}

function mergeAutoWithSaved(
  auto: Record<string, BudgetExpense[]>,
  saved: BudgetItem[] | undefined,
): BudgetItem[] {
  const savedById = new Map((saved ?? []).map((i) => [i.id, i]));
  return CATEGORY_ORDER.map(({ id, label, fixed }) => {
    const savedItem = savedById.get(id);
    const autoExpenses = auto[id] ?? [];
    const manualExpenses = (savedItem?.expenses ?? []).filter((e) => e.source === 'manual');
    // Preserve manually-edited amounts on auto entries when an itinerary item
    // is unchanged but the user typed a real receipt amount (rare, but cheap).
    const savedAutoById = new Map(
      (savedItem?.expenses ?? [])
        .filter((e) => e.source && e.source !== 'manual')
        .map((e) => [e.id, e]),
    );
    const merged = autoExpenses.map((e) => {
      const prior = savedAutoById.get(e.id);
      if (prior && prior.amount !== e.amount) {
        return { ...e, amount: prior.amount };
      }
      return e;
    });
    const expenses = [...merged, ...manualExpenses];
    const actual = expenses.reduce((s, e) => s + (e.amount ?? 0), 0);
    const budgeted = savedItem?.budgeted ?? actual;
    return { id, category: label, budgeted, actual, fixed, expenses };
  });
}

export default function Budget({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { isLoading, trip, days, flights, hotels } = useItineraryScreen(id);
  const { format: formatHome, convert, currency: homeCurrency } = useHomeCurrency();
  const formatAmount = (n: number) => formatHome(n, homeCurrency);

  const [budgetData, setBudgetData] = useState<BudgetItem[]>(EMPTY_BUDGET);
  const flushTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const lastSyncedRef = useRef<string>('');

  const autoExpenses = useMemo(
    () => buildAutoExpenses(days, flights, hotels, convert, homeCurrency),
    [days, flights, hotels, convert, homeCurrency],
  );

  // Resync from itinerary whenever auto-expenses change. Manual entries and
  // budgeted overrides survive via mergeAutoWithSaved.
  useEffect(() => {
    if (!trip) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const saved = (trip.trip_context as any)?.budget_data as BudgetItem[] | undefined;
    const next = mergeAutoWithSaved(autoExpenses, saved);
    const signature = JSON.stringify(next.map((i) => [i.id, i.budgeted, i.expenses?.map((e) => [e.id, e.amount])]));
    if (signature === lastSyncedRef.current) return;
    lastSyncedRef.current = signature;
    setBudgetData(next);
  }, [trip, autoExpenses]);

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
    const expense: BudgetExpense = {
      id: `manual-${Date.now()}`,
      description,
      amount,
      date,
      source: 'manual',
    };
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
        description="Auto-pulled from your itinerary · click a category to add or edit expenses"
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
        <div className="flex flex-col md:flex-row gap-6 md:gap-10 items-start pb-6 mb-5 border-b border-gray-100 dark:border-white/[0.06]">
          <BudgetPieChart items={budgetData} formatAmount={formatAmount} />
          <BudgetMetricStrip
            totalBudgeted={totalBudgeted}
            totalActual={totalActual}
            daysInTrip={daysInTrip}
            daysElapsed={daysElapsed}
            formatAmount={formatAmount}
            onChangeTotalBudget={handleChangeTotalBudget}
            compact
          />
        </div>
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
