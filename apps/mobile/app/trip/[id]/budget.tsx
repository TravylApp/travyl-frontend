import { useState, useMemo, useEffect, useRef, useCallback, useContext } from 'react';
import { View, Text, ScrollView, Pressable, TextInput, Dimensions } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useItineraryScreen, TextStyles, FontSize, supabase, Navy } from '@travyl/shared';
import type { BudgetItem, BudgetExpense } from '@travyl/shared';
import { useQuery } from '@tanstack/react-query';
import { PageTransition, TabCtx, useTabAccent } from './_layout';
import { useThemeColors } from '@/hooks/useThemeColors';
import { SkeletonBlock } from '@/components/ui/SkeletonBlock';

/* ================================================================
   Currency conversion
   ================================================================ */

// Popular currencies shown first, then all others from the API
const POPULAR_CURRENCIES = ['USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD', 'MXN', 'BRL', 'KRW', 'INR', 'CHF', 'CNY'];
const ZERO_DECIMAL = new Set(['JPY', 'KRW', 'VND', 'CLP', 'ISK', 'HUF']);

function fmtCurrency(amount: number, code: string): string {
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: code, maximumFractionDigits: ZERO_DECIMAL.has(code) ? 0 : 2 }).format(amount);
  } catch {
    return `${code} ${amount.toFixed(2)}`;
  }
}

/* ================================================================
   Icon + colour mapping (matches web CATEGORY_COLORS / CATEGORY_ICONS)
   ================================================================ */

const CATEGORY_CONFIG: Record<string, { icon: string; bg: string; color: string; bar: string }> = {
  'Flights':            { icon: 'plane',        bg: '#dbeafe', color: '#2563eb', bar: '#3b82f6' },
  'Hotels':             { icon: 'building',     bg: '#ffedd5', color: '#ea580c', bar: '#f97316' },
  'Food & Dining':      { icon: 'cutlery',      bg: '#e0f2fe', color: Navy.DEFAULT, bar: Navy.DEFAULT },
  'Activities & Tours': { icon: 'camera',        bg: '#ccfbf1', color: '#0d9488', bar: '#14b8a6' },
  'Transportation':     { icon: 'bus',           bg: '#ede9fe', color: '#7c3aed', bar: '#8b5cf6' },
  'Shopping':           { icon: 'shopping-bag',  bg: '#dcfce7', color: '#16a34a', bar: '#22c55e' },
};

const defaultCfg = { icon: 'money', bg: '#f3f4f6', color: '#6b7280', bar: '#9ca3af' };

const DAY_ABBREVS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/* ================================================================
   Helpers — health-based backgrounds (matches web healthBg / categoryHealthBg)
   ================================================================ */

function healthColors(pct: number, c: any): { bg: string; border: string } {
  if (pct >= 100) return { bg: c.errorBg, border: c.error };
  if (pct >= 90)  return { bg: c.warningBg, border: c.warning };
  if (pct >= 75)  return { bg: c.infoBg, border: c.info };
  return { bg: c.cardBackground, border: c.border };
}

function categoryHealthColors(pct: number, c: any): { bg: string; border: string } {
  if (pct >= 100) return { bg: c.errorBg, border: c.error };
  if (pct >= 90)  return { bg: c.warningBg, border: c.warning };
  if (pct >= 75)  return { bg: c.infoBg, border: c.info };
  return { bg: c.successBg, border: c.success };
}

/* ================================================================
   Skeleton (loading state)
   ================================================================ */

function BudgetSkeleton() {
  const colors = useThemeColors();
  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
        {['Total Budget', 'Total Spent', 'Remaining'].map((label) => (
          <View key={label} style={{ flex: 1, backgroundColor: colors.cardBackground, borderRadius: 10, padding: 12, borderWidth: 1, borderColor: colors.border }}>
            <Text style={{ ...TextStyles.sm, color: colors.textSecondary, textTransform: 'uppercase' }}>{label}</Text>
            <SkeletonBlock width="80%" height={22} style={{ marginTop: 4 }} />
          </View>
        ))}
      </View>
      <View style={{ backgroundColor: colors.borderLight, borderRadius: 6, height: 10, marginBottom: 20, overflow: 'hidden' }}>
        <View style={{ width: '65%', height: '100%', backgroundColor: colors.success, borderRadius: 6 }} />
      </View>
      <View style={{ gap: 10 }}>
        {[1, 2, 3, 4].map((i) => (
          <View key={i} style={{ backgroundColor: colors.cardBackground, borderRadius: 10, padding: 14, borderWidth: 1, borderColor: colors.border }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <SkeletonBlock width={36} height={36} radius={10} />
                <View>
                  <SkeletonBlock width={80} height={14} />
                  <SkeletonBlock width={60} height={10} style={{ marginTop: 4 }} />
                </View>
              </View>
              <SkeletonBlock width={70} height={18} />
            </View>
            <SkeletonBlock width="100%" height={6} radius={4} />
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

/* ================================================================
   Main Component
   ================================================================ */

export default function BudgetScreen() {
  const ACCENT = useTabAccent('budget');
  const colors = useThemeColors();
  const { id: _id } = useLocalSearchParams<{ id: string }>();
  const { tripId: ctxId } = useContext(TabCtx);
  const id = _id || ctxId;
  const { trip, isLoading } = useItineraryScreen(id);

  // Currency conversion
  const [displayCurrency, setDisplayCurrency] = useState('USD');
  const { data: rates } = useQuery({
    queryKey: ['exchange-rates'],
    queryFn: async () => {
      const res = await fetch('https://open.er-api.com/v6/latest/USD');
      if (!res.ok) return null;
      const data = await res.json();
      return data.rates as Record<string, number>;
    },
    staleTime: 60 * 60 * 1000,
  });
  const cx = useCallback((usd: number) => {
    if (displayCurrency === 'USD' || !rates) return usd;
    return usd * (rates[displayCurrency] || 1);
  }, [displayCurrency, rates]);
  const fx = useCallback((usd: number) => fmtCurrency(cx(usd), displayCurrency), [cx, displayCurrency]);

  // Build budget items from trip_context (cost_of_living + hotels + trip.budget)
  const initialBudget = useMemo((): BudgetItem[] => {
    const ctx = trip?.trip_context as any;
    const cost = ctx?.cost_of_living;
    const hotel = (ctx?.hotels?.[0] || ctx?.all_hotels?.[0]) as any;
    const days = trip?.start_date && trip?.end_date
      ? Math.max(1, Math.ceil((new Date(trip.end_date).getTime() - new Date(trip.start_date).getTime()) / 86400000))
      : 5;

    const items: BudgetItem[] = [];

    // Accommodation
    const hotelPrice = hotel?.price ?? hotel?.price_per_night ?? 0;
    items.push({
      id: 'accommodation',
      category: 'Accommodation',
      budgeted: hotelPrice * days,
      actual: 0,
      fixed: true,
      expenses: hotelPrice ? [{ id: 'hotel-1', description: `${hotel?.name || 'Hotel'} (${days} nights × $${hotelPrice})`, amount: hotelPrice * days }] : [],
    });

    // Food & Dining
    const mealBudget = cost?.budget_meal ? parseFloat(String(cost.budget_meal).replace(/[^0-9.]/g, '')) : 0;
    const midMeal = cost?.mid_range_meal ? parseFloat(String(cost.mid_range_meal).replace(/[^0-9.]/g, '')) : 0;
    const dailyFood = (mealBudget + midMeal) || 40;
    items.push({ id: 'food', category: 'Food & Dining', budgeted: dailyFood * days, actual: 0, fixed: false, expenses: [] });

    // Transport
    const transport = cost?.public_transport ? parseFloat(String(cost.public_transport).replace(/[^0-9.]/g, '')) : 0;
    items.push({ id: 'transport', category: 'Transportation', budgeted: (transport || 5) * days, actual: 0, fixed: false, expenses: [] });

    // Activities
    items.push({ id: 'activities', category: 'Activities', budgeted: Math.round(days * 25), actual: 0, fixed: false, expenses: [] });

    // Shopping
    items.push({ id: 'shopping', category: 'Shopping', budgeted: Math.round(days * 15), actual: 0, fixed: false, expenses: [] });

    return items;
  }, [trip]);

  /* ── State ── */
  const [budgetData, setBudgetData] = useState<BudgetItem[]>(initialBudget);
  const seeded = useRef(false);

  // Load saved budget from trip_context if available
  useEffect(() => {
    if (trip && !seeded.current) {
      const saved = (trip.trip_context as any)?.budget_data;
      if (saved && Array.isArray(saved) && saved.length > 0) {
        setBudgetData(saved);
      } else {
        setBudgetData(initialBudget);
      }
      seeded.current = true;
    }
  }, [trip, initialBudget]);

  // Debounce-save budget to trip_context
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const persistBudget = useCallback((data: BudgetItem[]) => {
    if (!seeded.current || !id) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      supabase.from('trips').select('trip_context').eq('id', id).single().then(({ data: row }) => {
        if (row) {
          const ctx = (row.trip_context || {}) as Record<string, unknown>;
          ctx.budget_data = data;
          supabase.from('trips').update({ trip_context: ctx }).eq('id', id).then(() => {});
        }
      });
    }, 1500);
  }, [id]);

  const updateBudget = useCallback((updater: BudgetItem[] | ((prev: BudgetItem[]) => BudgetItem[])) => {
    setBudgetData((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      persistBudget(next);
      return next;
    });
  }, [persistBudget]);

  /* Editing total budget */
  const [isEditingTotal, setIsEditingTotal] = useState(false);
  const [tempTotal, setTempTotal] = useState('');

  /* Editing individual category budget */
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [tempBudgeted, setTempBudgeted] = useState('');

  /* Expand / collapse */
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [expandedExpenses, setExpandedExpenses] = useState<Set<string>>(new Set());

  /* Add expense inline form */
  const [addingExpenseFor, setAddingExpenseFor] = useState<string | null>(null);
  const [newExpenseDesc, setNewExpenseDesc] = useState('');
  const [newExpenseAmount, setNewExpenseAmount] = useState('');

  /* Add category form */
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [newCategory, setNewCategory] = useState('');
  const [newBudgeted, setNewBudgeted] = useState('');
  const [newActual, setNewActual] = useState('');

  /* ── Derived values ── */
  const totalBudgeted = budgetData.reduce((s, i) => s + i.budgeted, 0);
  const totalActual   = budgetData.reduce((s, i) => s + i.actual, 0);
  const remaining     = totalBudgeted - totalActual;
  const pctUsed       = totalBudgeted > 0 ? (totalActual / totalBudgeted) * 100 : 0;

  const progressColor =
    pctUsed >= 100 ? colors.error : pctUsed >= 80 ? colors.warning : colors.success;

  const overallHealth = healthColors(pctUsed, colors);

  /* Daily budget chart — derived from real trip dates and total budget */
  const tripDays = trip?.start_date && trip?.end_date
    ? Math.max(1, Math.ceil((new Date(trip.end_date).getTime() - new Date(trip.start_date).getTime()) / 86400000))
    : 7;
  const dailyBudget = tripDays > 0 ? Math.round(totalBudgeted / tripDays) : 0;
  const dailyActual = tripDays > 0 ? Math.round(totalActual / tripDays) : 0;
  const DAILY_SPENDING = Array.from({ length: Math.min(tripDays, 7) }, (_, i) => {
    const date = trip?.start_date ? new Date(new Date(trip.start_date).getTime() + i * 86400000) : null;
    return {
      day: date ? DAY_ABBREVS[date.getDay()] : `D${i + 1}`,
      amount: dailyBudget,
      label: date ? date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : `Day ${i + 1}`,
    };
  });
  const maxDailySpend = Math.max(...DAILY_SPENDING.map((d) => d.amount), 1);
  const avgDailySpend = dailyBudget;
  const chartBarMaxHeight = 100;

  /* Budget alerts */
  const alerts: { type: 'danger' | 'warning' | 'info'; icon: string; message: string }[] = [];
  budgetData.forEach((item) => {
    const itemPct = item.budgeted > 0 ? (item.actual / item.budgeted) * 100 : 0;
    if (itemPct >= 100) {
      alerts.push({
        type: 'danger',
        icon: 'exclamation-circle',
        message: `${item.category} is over budget by $${Math.abs(item.budgeted - item.actual).toLocaleString()}`,
      });
    } else if (itemPct >= 90) {
      alerts.push({
        type: 'warning',
        icon: 'warning',
        message: `${item.category} is at ${itemPct.toFixed(0)}% — only $${(item.budgeted - item.actual).toLocaleString()} left`,
      });
    }
  });
  if (pctUsed >= 90 && pctUsed < 100) {
    alerts.unshift({
      type: 'warning',
      icon: 'warning',
      message: `Overall budget is at ${pctUsed.toFixed(0)}% — $${remaining.toLocaleString()} remaining`,
    });
  } else if (pctUsed >= 100) {
    alerts.unshift({
      type: 'danger',
      icon: 'exclamation-circle',
      message: `Over budget by $${Math.abs(remaining).toLocaleString()}!`,
    });
  }

  const alertStyles = {
    danger:  { bg: colors.errorBg, border: colors.error, icon: colors.error, text: colors.error },
    warning: { bg: colors.warningBg, border: colors.warning, icon: colors.warning, text: colors.warning },
    info:    { bg: colors.infoBg, border: colors.info, icon: colors.info, text: colors.info },
  };

  /* ── Handlers (mirror web logic) ── */

  const toggleCategory = (catId: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      next.has(catId) ? next.delete(catId) : next.add(catId);
      return next;
    });
  };

  const toggleExpenses = (catId: string) => {
    setExpandedExpenses((prev) => {
      const next = new Set(prev);
      next.has(catId) ? next.delete(catId) : next.add(catId);
      return next;
    });
  };

  const handleSaveTotalBudget = () => {
    const newTotal = parseFloat(tempTotal) || 0;
    if (newTotal > 0 && totalBudgeted > 0) {
      const ratio = newTotal / totalBudgeted;
      updateBudget((prev) =>
        prev.map((item) => ({ ...item, budgeted: Math.round(item.budgeted * ratio * 100) / 100 })),
      );
    }
    setIsEditingTotal(false);
  };

  const handleStartEdit = (item: BudgetItem) => {
    setEditingItemId(item.id);
    setTempBudgeted(item.budgeted.toString());
    setExpandedCategories((prev) => new Set(prev).add(item.id));
  };

  const handleSaveEdit = () => {
    if (editingItemId) {
      updateBudget((prev) =>
        prev.map((item) =>
          item.id === editingItemId ? { ...item, budgeted: parseFloat(tempBudgeted) || 0 } : item,
        ),
      );
      setEditingItemId(null);
    }
  };

  const handleCancelEdit = () => {
    setEditingItemId(null);
    setTempBudgeted('');
  };

  const handleDeleteCategory = (catId: string) => {
    updateBudget((prev) => prev.filter((item) => item.id !== catId));
  };

  const handleAddExpense = (categoryId: string) => {
    if (newExpenseDesc.trim() && newExpenseAmount) {
      const expense: BudgetExpense = {
        id: `expense-${Date.now()}`,
        description: newExpenseDesc,
        amount: parseFloat(newExpenseAmount) || 0,
      };
      updateBudget((prev) =>
        prev.map((item) => {
          if (item.id === categoryId) {
            const expenses = [...(item.expenses || []), expense];
            const updatedActual = expenses.reduce((sum, exp) => sum + exp.amount, 0);
            return { ...item, expenses, actual: updatedActual, budgeted: Math.max(item.budgeted, updatedActual) };
          }
          return item;
        }),
      );
      setNewExpenseDesc('');
      setNewExpenseAmount('');
      setAddingExpenseFor(null);
    }
  };

  const handleDeleteExpense = (categoryId: string, expenseId: string) => {
    updateBudget((prev) =>
      prev.map((item) => {
        if (item.id === categoryId) {
          const expenses = (item.expenses || []).filter((exp) => exp.id !== expenseId);
          const updatedActual = expenses.reduce((sum, exp) => sum + exp.amount, 0);
          return { ...item, expenses, actual: updatedActual };
        }
        return item;
      }),
    );
  };

  const handleAddCategory = () => {
    if (newCategory.trim()) {
      updateBudget((prev) => [
        ...prev,
        {
          id: `custom-${Date.now()}`,
          category: newCategory,
          budgeted: parseFloat(newBudgeted) || 0,
          actual: parseFloat(newActual) || 0,
          fixed: false,
          expenses: [],
        },
      ]);
      setNewCategory('');
      setNewBudgeted('');
      setNewActual('');
      setShowAddCategory(false);
    }
  };

  /* ── Loading state ── */
  if (isLoading) return <PageTransition><BudgetSkeleton /></PageTransition>;

  /* ── Empty state ── */
  if (budgetData.length === 0) {
    return (
      <PageTransition>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 48, paddingHorizontal: 24, backgroundColor: colors.background }}>
        <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: ACCENT + '15', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
          <FontAwesome name="pie-chart" size={24} color={ACCENT} />
        </View>
        <Text style={{ ...TextStyles.subhead, color: colors.text, marginBottom: 6 }}>No expenses yet</Text>
        <Text style={{ ...TextStyles.bodyLg, color: colors.textSecondary, textAlign: 'center', lineHeight: 20, marginBottom: 20 }}>
          Your budget breakdown will appear as you add flights, hotels, and activities to your trip.
        </Text>
        <Pressable
          onPress={() => setShowAddCategory(true)}
          style={{ backgroundColor: ACCENT, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12, flexDirection: 'row', alignItems: 'center', gap: 8 }}
        >
          <FontAwesome name="plus" size={12} color="#fff" />
          <Text style={{ ...TextStyles.bodyXlEm, color: '#fff' }}>Set Budget</Text>
        </Pressable>
      </View>
      </PageTransition>
    );
  }

  /* ── Main render ── */
  return (
    <PageTransition>
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>

      {/* ===== Budget Alerts ===== */}
      {alerts.length > 0 && (
        <View style={{ gap: 8, marginBottom: 16 }}>
          {alerts.map((alert, idx) => {
            const s = alertStyles[alert.type];
            return (
              <View
                key={idx}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 10,
                  backgroundColor: s.bg,
                  borderWidth: 1,
                  borderColor: s.border,
                  borderRadius: 10,
                  paddingHorizontal: 14,
                  paddingVertical: 10,
                }}
              >
                <FontAwesome name={alert.icon as any} size={16} color={s.icon} />
                <Text style={{ ...TextStyles.body, fontWeight: '500', color: s.text, flex: 1 }}>
                  {alert.message}
                </Text>
              </View>
            );
          })}
        </View>
      )}

      {/* ===== Currency Selector ===== */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, marginBottom: 12 }}>
        {(() => {
          // Show popular currencies first, then all others from the API response
          const allCodes = rates ? Object.keys(rates) : POPULAR_CURRENCIES;
          const ordered = [...POPULAR_CURRENCIES.filter(c => allCodes.includes(c)), ...allCodes.filter(c => !POPULAR_CURRENCIES.includes(c)).sort()];
          return ordered.map(c => (
            <Pressable
              key={c}
              onPress={() => setDisplayCurrency(c)}
              style={{
                paddingHorizontal: 14, paddingVertical: 6, borderRadius: 16,
                backgroundColor: displayCurrency === c ? ACCENT : colors.surface,
                borderWidth: 1, borderColor: displayCurrency === c ? ACCENT : colors.border,
              }}
            >
              <Text style={{ ...TextStyles.captionEm, color: displayCurrency === c ? '#fff' : colors.textSecondary }}>
                {c}
              </Text>
            </Pressable>
          ));
        })()}
      </ScrollView>

      {/* ===== Summary Cards (3 columns) ===== */}
      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>

        {/* Total Budget (editable) */}
        <View style={{ flex: 1, backgroundColor: overallHealth.bg, borderRadius: 10, padding: 12, borderWidth: 1, borderColor: overallHealth.border }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
            <Text style={{ ...TextStyles.sm, color: colors.textSecondary, textTransform: 'uppercase' }}>Total Budget</Text>
            {!isEditingTotal ? (
              <Pressable
                onPress={() => { setIsEditingTotal(true); setTempTotal(totalBudgeted.toString()); }}
                hitSlop={8}
              >
                <FontAwesome name="pencil" size={10} color={colors.textTertiary} />
              </Pressable>
            ) : (
              <View style={{ flexDirection: 'row', gap: 6 }}>
                <Pressable onPress={handleSaveTotalBudget} hitSlop={8}>
                  <FontAwesome name="check" size={10} color="#10b981" />
                </Pressable>
                <Pressable onPress={() => setIsEditingTotal(false)} hitSlop={8}>
                  <FontAwesome name="times" size={10} color={colors.textTertiary} />
                </Pressable>
              </View>
            )}
          </View>
          {!isEditingTotal ? (
            <Text style={{ ...TextStyles.subhead, color: colors.text, marginTop: 2 }}>
              {fx(totalBudgeted)}
            </Text>
          ) : (
            <TextInput
              value={tempTotal}
              onChangeText={setTempTotal}
              keyboardType="numeric"
              autoFocus
              style={{
                fontSize: FontSize.subhead, fontWeight: '700', color: colors.text,
                borderWidth: 1, borderColor: colors.border, borderRadius: 6,
                paddingHorizontal: 8, paddingVertical: 4, marginTop: 2,
              }}
            />
          )}
        </View>

        {/* Total Spent */}
        <View style={{ flex: 1, backgroundColor: overallHealth.bg, borderRadius: 10, padding: 12, borderWidth: 1, borderColor: overallHealth.border }}>
          <Text style={{ ...TextStyles.sm, color: colors.textSecondary, textTransform: 'uppercase', marginBottom: 2 }}>Total Spent</Text>
          <Text style={{ ...TextStyles.subhead, color: colors.text, marginTop: 2 }}>
            {fx(totalActual)}
          </Text>
        </View>

        {/* Remaining */}
        <View style={{ flex: 1, backgroundColor: overallHealth.bg, borderRadius: 10, padding: 12, borderWidth: 1, borderColor: remaining >= 0 ? colors.success + '30' : colors.error + '30' }}>
          <Text style={{ ...TextStyles.sm, color: colors.textSecondary, textTransform: 'uppercase', marginBottom: 2 }}>Remaining</Text>
          <Text style={{ ...TextStyles.subhead, color: remaining >= 0 ? colors.success : colors.error, marginTop: 2 }}>
            {fx(Math.abs(remaining))}
          </Text>
        </View>
      </View>

      {/* ===== Overall Progress Bar ===== */}
      <View style={{ backgroundColor: overallHealth.bg, borderRadius: 10, padding: 12, borderWidth: 1, borderColor: overallHealth.border, marginBottom: 16 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
          <Text style={{ ...TextStyles.bodyLg, fontWeight: '500', color: colors.text }}>Budget Progress</Text>
          <Text style={{ ...TextStyles.bodyLgEm, color: colors.text }}>{pctUsed.toFixed(1)}%</Text>
        </View>
        <View style={{ backgroundColor: colors.borderLight, borderRadius: 6, height: 10, overflow: 'hidden' }}>
          <View
            style={{
              width: `${Math.min(pctUsed, 100)}%`,
              height: '100%',
              backgroundColor: progressColor,
              borderRadius: 6,
            }}
          />
        </View>
      </View>

      {/* ===== Daily Spending Chart ===== */}
      <View style={{ backgroundColor: colors.cardBackground, borderRadius: 10, padding: 14, borderWidth: 1, borderColor: colors.border, marginBottom: 16 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <Text style={{ ...TextStyles.bodyXlEm, color: colors.text }}>Daily Budget</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Text style={{ ...TextStyles.caption, color: colors.textSecondary }}>Avg:</Text>
            <Text style={{ ...TextStyles.captionEm, color: colors.text }}>${avgDailySpend}</Text>
          </View>
        </View>

        {/* Bar chart */}
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', height: chartBarMaxHeight + 20, paddingBottom: 20 }}>
          {DAILY_SPENDING.map((d, idx) => {
            const barHeight = maxDailySpend > 0 ? (d.amount / maxDailySpend) * chartBarMaxHeight : 0;
            const isHighest = d.amount === maxDailySpend;
            return (
              <View key={idx} style={{ alignItems: 'center', flex: 1, gap: 4 }}>
                {/* Amount label */}
                <Text style={{ ...TextStyles.xs, fontWeight: '500', color: isHighest ? colors.error : colors.textSecondary }}>
                  ${d.amount}
                </Text>
                {/* Bar */}
                <View
                  style={{
                    width: 20,
                    height: Math.max(barHeight, 4),
                    backgroundColor: isHighest ? colors.error : ACCENT,
                    borderRadius: 4,
                    opacity: isHighest ? 1 : 0.7,
                  }}
                />
                {/* Day label */}
                <Text style={{ ...TextStyles.sm, color: colors.textSecondary, position: 'absolute', bottom: -18 }}>
                  {d.day}
                </Text>
              </View>
            );
          })}
        </View>

        {/* Average line indicator */}
        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8, paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.borderLight }}>
          <View style={{ width: 12, height: 2, backgroundColor: colors.warning, borderRadius: 1, marginRight: 6 }} />
          <Text style={{ ...TextStyles.sm, color: colors.textSecondary }}>
            Daily budget: ${avgDailySpend}/day
          </Text>
          <View style={{ flex: 1 }} />
          <Text style={{ ...TextStyles.sm, color: colors.textSecondary }}>
            Budget: ${totalBudgeted.toLocaleString()}
          </Text>
        </View>
      </View>

      {/* ===== Category Breakdown ===== */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <Text style={{ ...TextStyles.bodyXlEm, color: colors.text }}>Category Breakdown</Text>
        <Text style={{ ...TextStyles.caption, color: colors.textSecondary }}>{budgetData.length} categories</Text>
      </View>

      <View style={{ gap: 10 }}>
        {budgetData.map((item) => {
          const cfg = CATEGORY_CONFIG[item.category] || defaultCfg;
          const isEditing = editingItemId === item.id;
          const isExpanded = expandedCategories.has(item.id);
          const itemPct = item.budgeted > 0 ? (item.actual / item.budgeted) * 100 : 0;
          const itemDiff = item.budgeted - item.actual;
          const itemBarColor =
            itemPct > 100 ? colors.error : itemPct > 80 ? colors.warning : cfg.bar;
          const catHealth = categoryHealthColors(itemPct, colors);

          return (
            <View
              key={item.id}
              style={{
                backgroundColor: catHealth.bg,
                borderRadius: 10,
                borderWidth: 1,
                borderColor: catHealth.border,
                overflow: 'hidden',
              }}
            >
              {/* ── Collapsed header row ── */}
              <Pressable
                onPress={() => !isEditing && toggleCategory(item.id)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: isExpanded ? 14 : 14,
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: cfg.bg, alignItems: 'center', justifyContent: 'center' }}>
                    <FontAwesome name={cfg.icon as any} size={16} color={cfg.color} />
                  </View>
                  <View>
                    <Text style={{ ...TextStyles.bodyXlEm, color: colors.text }}>{item.category}</Text>
                    {!isExpanded && (
                      <Text style={{ ...TextStyles.body, color: colors.textSecondary }}>${item.actual.toLocaleString()}</Text>
                    )}
                  </View>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  {!isExpanded && (
                    <View style={{ backgroundColor: itemPct >= 100 ? colors.errorBg : itemPct >= 80 ? colors.warningBg : colors.successBg, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 }}>
                      <Text style={{ ...TextStyles.smEm, color: itemPct >= 100 ? colors.error : itemPct >= 80 ? colors.warning : colors.success }}>
                        {itemPct.toFixed(0)}%
                      </Text>
                    </View>
                  )}
                  {!isExpanded && !isEditing && (
                    <Pressable
                      onPress={() => handleStartEdit(item)}
                      hitSlop={8}
                      style={{ padding: 4 }}
                    >
                      <FontAwesome name="pencil" size={12} color={colors.textTertiary} />
                    </Pressable>
                  )}
                  {!isEditing && (
                    <FontAwesome
                      name={isExpanded ? 'chevron-up' : 'chevron-down'}
                      size={12}
                      color={colors.textTertiary}
                    />
                  )}
                </View>
              </Pressable>

              {/* ── Expanded content ── */}
              {isExpanded && (
                <View style={{ paddingHorizontal: 14, paddingBottom: 14 }}>
                  {!isEditing ? (
                    <>
                      {/* Budgeted / Actual row */}
                      <View style={{ flexDirection: 'row', gap: 12, marginBottom: 10 }}>
                        <View style={{ flex: 1 }}>
                          <Text style={{ ...TextStyles.caption, color: colors.textSecondary, marginBottom: 4 }}>Budgeted</Text>
                          <Text style={{ ...TextStyles.subhead, color: colors.text }}>
                            ${item.budgeted.toLocaleString()}
                          </Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                            <Text style={{ ...TextStyles.caption, color: colors.textSecondary }}>Actual</Text>
                            <View style={{ flexDirection: 'row', gap: 8 }}>
                              <Pressable onPress={() => handleStartEdit(item)} hitSlop={8}>
                                <FontAwesome name="pencil" size={12} color={colors.textTertiary} />
                              </Pressable>
                              {!item.fixed && (
                                <Pressable onPress={() => handleDeleteCategory(item.id)} hitSlop={8}>
                                  <FontAwesome name="trash" size={12} color={colors.textTertiary} />
                                </Pressable>
                              )}
                            </View>
                          </View>
                          <Text style={{ ...TextStyles.subhead, color: colors.text }}>
                            ${item.actual.toLocaleString()}
                          </Text>
                        </View>
                      </View>

                      {/* Category progress bar */}
                      <View style={{ backgroundColor: colors.cardBackground, borderRadius: 4, height: 6, overflow: 'hidden', marginBottom: 8 }}>
                        <View
                          style={{
                            width: `${Math.min(itemPct, 100)}%`,
                            height: '100%',
                            backgroundColor: itemBarColor,
                            borderRadius: 4,
                          }}
                        />
                      </View>

                      {/* % used + under/over label */}
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
                        <Text style={{ ...TextStyles.caption, color: colors.textSecondary }}>{itemPct.toFixed(0)}% used</Text>
                        {itemDiff > 0 ? (
                          <Text style={{ ...TextStyles.caption, fontWeight: '500', color: colors.success }}>
                            ${itemDiff.toLocaleString()} under
                          </Text>
                        ) : itemDiff < 0 ? (
                          <Text style={{ ...TextStyles.caption, fontWeight: '500', color: colors.error }}>
                            ${Math.abs(itemDiff).toLocaleString()} over
                          </Text>
                        ) : (
                          <Text style={{ ...TextStyles.caption, color: colors.textSecondary }}>On track</Text>
                        )}
                      </View>

                      {/* ── Expenses section ── */}
                      <View style={{ borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 12 }}>

                        {/* Collapsible expense list */}
                        {item.expenses && item.expenses.length > 0 && (
                          <View style={{ marginBottom: 12 }}>
                            <Pressable
                              onPress={() => toggleExpenses(item.id)}
                              style={{
                                flexDirection: 'row',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                paddingVertical: 4,
                                marginBottom: 6,
                              }}
                            >
                              <Text style={{ ...TextStyles.captionEm, color: colors.text, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                                {item.expenses.length} {item.expenses.length === 1 ? 'Expense' : 'Expenses'}
                              </Text>
                              <FontAwesome
                                name={expandedExpenses.has(item.id) ? 'chevron-up' : 'chevron-down'}
                                size={10}
                                color={colors.textSecondary}
                              />
                            </Pressable>

                            {expandedExpenses.has(item.id) && (
                              <View style={{ gap: 6, marginBottom: 8 }}>
                                {item.expenses.map((expense) => (
                                  <View
                                    key={expense.id}
                                    style={{
                                      flexDirection: 'row',
                                      justifyContent: 'space-between',
                                      alignItems: 'center',
                                      backgroundColor: colors.cardBackground,
                                      paddingHorizontal: 12,
                                      paddingVertical: 8,
                                      borderRadius: 8,
                                      borderWidth: 1,
                                      borderColor: colors.border,
                                    }}
                                  >
                                    <Text style={{ ...TextStyles.body, color: colors.text, flex: 1, marginRight: 8 }} numberOfLines={1}>
                                      {expense.description}
                                    </Text>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                      <Text style={{ ...TextStyles.bodyLgEm, color: colors.text }}>
                                        ${expense.amount.toLocaleString()}
                                      </Text>
                                      <Pressable
                                        onPress={() => handleDeleteExpense(item.id, expense.id)}
                                        hitSlop={8}
                                        style={{ padding: 4 }}
                                      >
                                        <FontAwesome name="trash" size={11} color={colors.textTertiary} />
                                      </Pressable>
                                    </View>
                                  </View>
                                ))}
                              </View>
                            )}
                          </View>
                        )}

                        {/* Add Expense button / inline form */}
                        {addingExpenseFor === item.id ? (
                          <View style={{ backgroundColor: colors.cardBackground, borderRadius: 10, padding: 12, borderWidth: 1, borderColor: colors.border }}>
                            <Text style={{ ...TextStyles.caption, fontWeight: '500', color: colors.text, marginBottom: 6 }}>Description</Text>
                            <TextInput
                              value={newExpenseDesc}
                              onChangeText={setNewExpenseDesc}
                              placeholder="e.g., Round trip tickets"
                              placeholderTextColor={colors.textTertiary}
                              autoFocus
                              style={{
                                borderWidth: 1, borderColor: colors.border, borderRadius: 8,
                                paddingHorizontal: 12, paddingVertical: 8,
                                fontSize: FontSize.bodyLg, color: colors.text, backgroundColor: colors.inputBackground,
                                marginBottom: 10,
                              }}
                            />
                            <Text style={{ ...TextStyles.caption, fontWeight: '500', color: colors.text, marginBottom: 6 }}>Amount</Text>
                            <TextInput
                              value={newExpenseAmount}
                              onChangeText={setNewExpenseAmount}
                              placeholder="0.00"
                              placeholderTextColor={colors.textTertiary}
                              keyboardType="numeric"
                              style={{
                                borderWidth: 1, borderColor: colors.border, borderRadius: 8,
                                paddingHorizontal: 12, paddingVertical: 8,
                                fontSize: FontSize.bodyLg, color: colors.text, backgroundColor: colors.inputBackground,
                                marginBottom: 12,
                              }}
                            />
                            <View style={{ flexDirection: 'row', gap: 8 }}>
                              <Pressable
                                onPress={() => handleAddExpense(item.id)}
                                style={{
                                  flex: 1, backgroundColor: colors.success, borderRadius: 8,
                                  paddingVertical: 10, alignItems: 'center',
                                }}
                              >
                                <Text style={{ ...TextStyles.bodyLgEm, color: '#fff' }}>Add Expense</Text>
                              </Pressable>
                              <Pressable
                                onPress={() => { setAddingExpenseFor(null); setNewExpenseDesc(''); setNewExpenseAmount(''); }}
                                style={{
                                  flex: 1, backgroundColor: colors.borderLight, borderRadius: 8,
                                  paddingVertical: 10, alignItems: 'center',
                                }}
                              >
                                <Text style={{ ...TextStyles.bodyLgEm, color: colors.text }}>Cancel</Text>
                              </Pressable>
                            </View>
                          </View>
                        ) : (
                          <Pressable
                            onPress={() => setAddingExpenseFor(item.id)}
                            style={{
                              flexDirection: 'row',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: 6,
                              paddingVertical: 10,
                              borderRadius: 8,
                              borderWidth: 1,
                              borderColor: colors.border,
                              backgroundColor: colors.cardBackground,
                            }}
                          >
                            <FontAwesome name="plus" size={12} color={colors.text} />
                            <Text style={{ ...TextStyles.bodyLg, fontWeight: '500', color: colors.text }}>Add Expense</Text>
                          </Pressable>
                        )}
                      </View>
                    </>
                  ) : (
                    /* ── Editing budgeted amount inline ── */
                    <View>
                      <Text style={{ ...TextStyles.caption, color: colors.textSecondary, marginBottom: 6 }}>Budgeted</Text>
                      <TextInput
                        value={tempBudgeted}
                        onChangeText={setTempBudgeted}
                        keyboardType="numeric"
                        placeholder="0.00"
                        placeholderTextColor={colors.textTertiary}
                        autoFocus
                        style={{
                          borderWidth: 1, borderColor: colors.border, borderRadius: 8,
                          paddingHorizontal: 12, paddingVertical: 8,
                          fontSize: FontSize.bodyXl, color: colors.text, backgroundColor: colors.inputBackground,
                          marginBottom: 12,
                        }}
                      />
                      <View style={{ flexDirection: 'row', gap: 8 }}>
                        <Pressable
                          onPress={handleSaveEdit}
                          style={{
                            flex: 1, backgroundColor: colors.success, borderRadius: 8,
                            paddingVertical: 10, alignItems: 'center',
                          }}
                        >
                          <Text style={{ ...TextStyles.bodyLgEm, color: '#fff' }}>Save</Text>
                        </Pressable>
                        <Pressable
                          onPress={handleCancelEdit}
                          style={{
                            flex: 1, backgroundColor: colors.borderLight, borderRadius: 8,
                            paddingVertical: 10, alignItems: 'center',
                          }}
                        >
                          <Text style={{ ...TextStyles.bodyLgEm, color: colors.text }}>Cancel</Text>
                        </Pressable>
                      </View>
                    </View>
                  )}
                </View>
              )}
            </View>
          );
        })}

        {/* ===== Add Category Card ===== */}
        {!showAddCategory ? (
          <Pressable
            onPress={() => setShowAddCategory(true)}
            style={{
              borderWidth: 2,
              borderStyle: 'dashed',
              borderColor: colors.border,
              borderRadius: 10,
              paddingVertical: 32,
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
            }}
          >
            <FontAwesome name="plus" size={22} color={colors.textTertiary} />
            <Text style={{ ...TextStyles.bodyLg, fontWeight: '500', color: colors.textSecondary }}>Add Category</Text>
          </Pressable>
        ) : (
          <View style={{ backgroundColor: colors.successBg, borderRadius: 10, borderWidth: 2, borderColor: colors.success, padding: 16 }}>
            <Text style={{ ...TextStyles.caption, fontWeight: '500', color: colors.text, marginBottom: 6 }}>Category Name</Text>
            <TextInput
              value={newCategory}
              onChangeText={setNewCategory}
              placeholder="e.g., Insurance"
              placeholderTextColor={colors.textTertiary}
              autoFocus
              style={{
                borderWidth: 1, borderColor: colors.border, borderRadius: 8,
                paddingHorizontal: 12, paddingVertical: 8,
                fontSize: FontSize.bodyLg, color: colors.text, backgroundColor: colors.inputBackground,
                marginBottom: 10,
              }}
            />
            <Text style={{ ...TextStyles.caption, fontWeight: '500', color: colors.text, marginBottom: 6 }}>Budgeted Amount</Text>
            <TextInput
              value={newBudgeted}
              onChangeText={setNewBudgeted}
              placeholder="0.00"
              placeholderTextColor={colors.textTertiary}
              keyboardType="numeric"
              style={{
                borderWidth: 1, borderColor: colors.border, borderRadius: 8,
                paddingHorizontal: 12, paddingVertical: 8,
                fontSize: FontSize.bodyLg, color: colors.text, backgroundColor: colors.inputBackground,
                marginBottom: 10,
              }}
            />
            <Text style={{ ...TextStyles.caption, fontWeight: '500', color: colors.text, marginBottom: 6 }}>Actual Spent</Text>
            <TextInput
              value={newActual}
              onChangeText={setNewActual}
              placeholder="0.00"
              placeholderTextColor={colors.textTertiary}
              keyboardType="numeric"
              style={{
                borderWidth: 1, borderColor: colors.border, borderRadius: 8,
                paddingHorizontal: 12, paddingVertical: 8,
                fontSize: FontSize.bodyLg, color: colors.text, backgroundColor: colors.inputBackground,
                marginBottom: 14,
              }}
            />
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Pressable
                onPress={handleAddCategory}
                style={{
                  flex: 1, backgroundColor: colors.success, borderRadius: 8,
                  paddingVertical: 10, alignItems: 'center',
                }}
              >
                <Text style={{ ...TextStyles.bodyLgEm, color: '#fff' }}>Add</Text>
              </Pressable>
              <Pressable
                onPress={() => { setShowAddCategory(false); setNewCategory(''); setNewBudgeted(''); setNewActual(''); }}
                style={{
                  flex: 1, backgroundColor: colors.cardBackground, borderRadius: 8, borderWidth: 1, borderColor: colors.border,
                  paddingVertical: 10, alignItems: 'center',
                }}
              >
                <Text style={{ ...TextStyles.bodyLgEm, color: colors.text }}>Cancel</Text>
              </Pressable>
            </View>
          </View>
        )}
      </View>
    </ScrollView>
    </PageTransition>
  );
}
