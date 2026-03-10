import { useState } from 'react';
import { View, Text, ScrollView, Pressable, TextInput, Dimensions } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useItineraryScreen, MOCK_BUDGET_ITEMS } from '@travyl/shared';
import type { BudgetItem, BudgetExpense } from '@travyl/shared';
import { PageTransition, useTabAccent } from './_layout';
import { useThemeColors } from '@/hooks/useThemeColors';
import { SkeletonBlock } from '@/components/ui/SkeletonBlock';

/* ================================================================
   Icon + colour mapping (matches web CATEGORY_COLORS / CATEGORY_ICONS)
   ================================================================ */

const CATEGORY_CONFIG: Record<string, { icon: string; bg: string; color: string; bar: string }> = {
  'Flights':            { icon: 'plane',        bg: '#dbeafe', color: '#2563eb', bar: '#3b82f6' },
  'Hotels':             { icon: 'building',     bg: '#ffedd5', color: '#ea580c', bar: '#f97316' },
  'Food & Dining':      { icon: 'cutlery',      bg: '#e0f2fe', color: '#1e3a5f', bar: '#1e3a5f' },
  'Activities & Tours': { icon: 'camera',        bg: '#ccfbf1', color: '#0d9488', bar: '#14b8a6' },
  'Transportation':     { icon: 'bus',           bg: '#ede9fe', color: '#7c3aed', bar: '#8b5cf6' },
  'Shopping':           { icon: 'shopping-bag',  bg: '#dcfce7', color: '#16a34a', bar: '#22c55e' },
};

const defaultCfg = { icon: 'money', bg: '#f3f4f6', color: '#6b7280', bar: '#9ca3af' };

/* ================================================================
   Mock daily spending data (for the spending chart)
   ================================================================ */

const DAILY_SPENDING = [
  { day: 'Mon', amount: 320, label: 'Mar 10' },
  { day: 'Tue', amount: 185, label: 'Mar 11' },
  { day: 'Wed', amount: 245, label: 'Mar 12' },
  { day: 'Thu', amount: 410, label: 'Mar 13' },
  { day: 'Fri', amount: 195, label: 'Mar 14' },
  { day: 'Sat', amount: 520, label: 'Mar 15' },
  { day: 'Sun', amount: 152, label: 'Mar 16' },
];

/* ================================================================
   Helpers — health-based backgrounds (matches web healthBg / categoryHealthBg)
   ================================================================ */

function healthColors(pct: number): { bg: string; border: string } {
  if (pct >= 100) return { bg: '#fef2f2', border: '#fecaca' };
  if (pct >= 90)  return { bg: '#fffbeb', border: '#fde68a' };
  if (pct >= 75)  return { bg: '#eff6ff', border: '#bfdbfe' };
  return { bg: '#ffffff', border: '#e5e7eb' };
}

function categoryHealthColors(pct: number): { bg: string; border: string } {
  if (pct >= 100) return { bg: '#fef2f2', border: '#fecaca' };
  if (pct >= 90)  return { bg: '#fffbeb', border: '#fde68a' };
  if (pct >= 75)  return { bg: '#eff6ff', border: '#bfdbfe' };
  return { bg: '#ecfdf5', border: '#a7f3d0' };
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
            <Text style={{ fontSize: 10, color: colors.textSecondary, textTransform: 'uppercase' }}>{label}</Text>
            <SkeletonBlock width="80%" height={22} style={{ marginTop: 4 }} />
          </View>
        ))}
      </View>
      <View style={{ backgroundColor: colors.borderLight, borderRadius: 6, height: 10, marginBottom: 20, overflow: 'hidden' }}>
        <View style={{ width: '65%', height: '100%', backgroundColor: '#10b981', borderRadius: 6 }} />
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
  const { id } = useLocalSearchParams<{ id: string }>();
  const { isLoading } = useItineraryScreen(id);

  /* ── State ── */
  const [budgetData, setBudgetData] = useState<BudgetItem[]>(MOCK_BUDGET_ITEMS);

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
    pctUsed >= 100 ? '#ef4444' : pctUsed >= 80 ? '#f59e0b' : '#10b981';

  const overallHealth = healthColors(pctUsed);

  /* Daily spending chart helpers */
  const maxDailySpend = Math.max(...DAILY_SPENDING.map((d) => d.amount));
  const avgDailySpend = Math.round(DAILY_SPENDING.reduce((s, d) => s + d.amount, 0) / DAILY_SPENDING.length);
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
    danger:  { bg: '#fef2f2', border: '#fecaca', icon: '#dc2626', text: '#991b1b' },
    warning: { bg: '#fffbeb', border: '#fde68a', icon: '#d97706', text: '#92400e' },
    info:    { bg: '#eff6ff', border: '#bfdbfe', icon: '#2563eb', text: '#1e40af' },
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
      setBudgetData((prev) =>
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
      setBudgetData((prev) =>
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
    setBudgetData((prev) => prev.filter((item) => item.id !== catId));
  };

  const handleAddExpense = (categoryId: string) => {
    if (newExpenseDesc.trim() && newExpenseAmount) {
      const expense: BudgetExpense = {
        id: `expense-${Date.now()}`,
        description: newExpenseDesc,
        amount: parseFloat(newExpenseAmount) || 0,
      };
      setBudgetData((prev) =>
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
    setBudgetData((prev) =>
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
      setBudgetData((prev) => [
        ...prev,
        {
          id: `custom-${Date.now()}`,
          category: newCategory,
          budgeted: parseFloat(newBudgeted) || 0,
          actual: parseFloat(newActual) || 0,
          fixed: false,
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
        <Text style={{ fontSize: 17, fontWeight: '700', color: colors.text, marginBottom: 6 }}>No expenses yet</Text>
        <Text style={{ fontSize: 13, color: colors.textSecondary, textAlign: 'center', lineHeight: 20, marginBottom: 20 }}>
          Your budget breakdown will appear as you add flights, hotels, and activities to your trip.
        </Text>
        <Pressable
          onPress={() => setShowAddCategory(true)}
          style={{ backgroundColor: ACCENT, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12, flexDirection: 'row', alignItems: 'center', gap: 8 }}
        >
          <FontAwesome name="plus" size={12} color="#fff" />
          <Text style={{ fontSize: 14, fontWeight: '600', color: '#fff' }}>Set Budget</Text>
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
                <Text style={{ fontSize: 12, fontWeight: '500', color: s.text, flex: 1 }}>
                  {alert.message}
                </Text>
              </View>
            );
          })}
        </View>
      )}

      {/* ===== Summary Cards (3 columns) ===== */}
      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>

        {/* Total Budget (editable) */}
        <View style={{ flex: 1, backgroundColor: overallHealth.bg, borderRadius: 10, padding: 12, borderWidth: 1, borderColor: overallHealth.border }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
            <Text style={{ fontSize: 10, color: colors.textSecondary, textTransform: 'uppercase' }}>Total Budget</Text>
            {!isEditingTotal ? (
              <Pressable
                onPress={() => { setIsEditingTotal(true); setTempTotal(totalBudgeted.toString()); }}
                hitSlop={8}
              >
                <FontAwesome name="pencil" size={10} color="#9ca3af" />
              </Pressable>
            ) : (
              <View style={{ flexDirection: 'row', gap: 6 }}>
                <Pressable onPress={handleSaveTotalBudget} hitSlop={8}>
                  <FontAwesome name="check" size={10} color="#10b981" />
                </Pressable>
                <Pressable onPress={() => setIsEditingTotal(false)} hitSlop={8}>
                  <FontAwesome name="times" size={10} color="#9ca3af" />
                </Pressable>
              </View>
            )}
          </View>
          {!isEditingTotal ? (
            <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text, marginTop: 2 }}>
              ${totalBudgeted.toLocaleString()}
            </Text>
          ) : (
            <TextInput
              value={tempTotal}
              onChangeText={setTempTotal}
              keyboardType="numeric"
              autoFocus
              style={{
                fontSize: 16, fontWeight: '700', color: colors.text,
                borderWidth: 1, borderColor: colors.border, borderRadius: 6,
                paddingHorizontal: 8, paddingVertical: 4, marginTop: 2,
              }}
            />
          )}
        </View>

        {/* Total Spent */}
        <View style={{ flex: 1, backgroundColor: overallHealth.bg, borderRadius: 10, padding: 12, borderWidth: 1, borderColor: overallHealth.border }}>
          <Text style={{ fontSize: 10, color: colors.textSecondary, textTransform: 'uppercase', marginBottom: 2 }}>Total Spent</Text>
          <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text, marginTop: 2 }}>
            ${totalActual.toLocaleString()}
          </Text>
        </View>

        {/* Remaining */}
        <View style={{ flex: 1, backgroundColor: overallHealth.bg, borderRadius: 10, padding: 12, borderWidth: 1, borderColor: remaining >= 0 ? '#10b98130' : '#ef444430' }}>
          <Text style={{ fontSize: 10, color: colors.textSecondary, textTransform: 'uppercase', marginBottom: 2 }}>Remaining</Text>
          <Text style={{ fontSize: 18, fontWeight: '700', color: remaining >= 0 ? '#10b981' : '#ef4444', marginTop: 2 }}>
            ${Math.abs(remaining).toLocaleString()}
          </Text>
        </View>
      </View>

      {/* ===== Overall Progress Bar ===== */}
      <View style={{ backgroundColor: overallHealth.bg, borderRadius: 10, padding: 12, borderWidth: 1, borderColor: overallHealth.border, marginBottom: 16 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
          <Text style={{ fontSize: 13, fontWeight: '500', color: colors.text }}>Budget Progress</Text>
          <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text }}>{pctUsed.toFixed(1)}%</Text>
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
          <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text }}>Daily Spending</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Text style={{ fontSize: 11, color: colors.textSecondary }}>Avg:</Text>
            <Text style={{ fontSize: 11, fontWeight: '600', color: colors.text }}>${avgDailySpend}</Text>
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
                <Text style={{ fontSize: 9, fontWeight: '500', color: isHighest ? '#ef4444' : colors.textSecondary }}>
                  ${d.amount}
                </Text>
                {/* Bar */}
                <View
                  style={{
                    width: 20,
                    height: Math.max(barHeight, 4),
                    backgroundColor: isHighest ? '#ef4444' : ACCENT,
                    borderRadius: 4,
                    opacity: isHighest ? 1 : 0.7,
                  }}
                />
                {/* Day label */}
                <Text style={{ fontSize: 10, color: colors.textSecondary, position: 'absolute', bottom: -18 }}>
                  {d.day}
                </Text>
              </View>
            );
          })}
        </View>

        {/* Average line indicator */}
        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8, paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.borderLight }}>
          <View style={{ width: 12, height: 2, backgroundColor: '#f59e0b', borderRadius: 1, marginRight: 6 }} />
          <Text style={{ fontSize: 10, color: colors.textSecondary }}>
            Daily average: ${avgDailySpend}/day
          </Text>
          <View style={{ flex: 1 }} />
          <Text style={{ fontSize: 10, color: colors.textSecondary }}>
            Total: ${DAILY_SPENDING.reduce((s, d) => s + d.amount, 0).toLocaleString()}
          </Text>
        </View>
      </View>

      {/* ===== Category Breakdown ===== */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text }}>Category Breakdown</Text>
        <Text style={{ fontSize: 11, color: colors.textSecondary }}>{budgetData.length} categories</Text>
      </View>

      <View style={{ gap: 10 }}>
        {budgetData.map((item) => {
          const cfg = CATEGORY_CONFIG[item.category] || defaultCfg;
          const isEditing = editingItemId === item.id;
          const isExpanded = expandedCategories.has(item.id);
          const itemPct = item.budgeted > 0 ? (item.actual / item.budgeted) * 100 : 0;
          const itemDiff = item.budgeted - item.actual;
          const itemBarColor =
            itemPct > 100 ? '#ef4444' : itemPct > 80 ? '#f59e0b' : cfg.bar;
          const catHealth = categoryHealthColors(itemPct);

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
                    <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text }}>{item.category}</Text>
                    {!isExpanded && (
                      <Text style={{ fontSize: 12, color: colors.textSecondary }}>${item.actual.toLocaleString()}</Text>
                    )}
                  </View>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  {!isExpanded && (
                    <View style={{ backgroundColor: itemPct >= 100 ? '#fef2f2' : itemPct >= 80 ? '#fffbeb' : '#f0fdf4', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 }}>
                      <Text style={{ fontSize: 10, fontWeight: '600', color: itemPct >= 100 ? '#dc2626' : itemPct >= 80 ? '#d97706' : '#16a34a' }}>
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
                      <FontAwesome name="pencil" size={12} color="#9ca3af" />
                    </Pressable>
                  )}
                  {!isEditing && (
                    <FontAwesome
                      name={isExpanded ? 'chevron-up' : 'chevron-down'}
                      size={12}
                      color="#9ca3af"
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
                          <Text style={{ fontSize: 11, color: colors.textSecondary, marginBottom: 4 }}>Budgeted</Text>
                          <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text }}>
                            ${item.budgeted.toLocaleString()}
                          </Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                            <Text style={{ fontSize: 11, color: colors.textSecondary }}>Actual</Text>
                            <View style={{ flexDirection: 'row', gap: 8 }}>
                              <Pressable onPress={() => handleStartEdit(item)} hitSlop={8}>
                                <FontAwesome name="pencil" size={12} color="#9ca3af" />
                              </Pressable>
                              {!item.fixed && (
                                <Pressable onPress={() => handleDeleteCategory(item.id)} hitSlop={8}>
                                  <FontAwesome name="trash" size={12} color="#9ca3af" />
                                </Pressable>
                              )}
                            </View>
                          </View>
                          <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text }}>
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
                        <Text style={{ fontSize: 11, color: colors.textSecondary }}>{itemPct.toFixed(0)}% used</Text>
                        {itemDiff > 0 ? (
                          <Text style={{ fontSize: 11, fontWeight: '500', color: '#10b981' }}>
                            ${itemDiff.toLocaleString()} under
                          </Text>
                        ) : itemDiff < 0 ? (
                          <Text style={{ fontSize: 11, fontWeight: '500', color: '#ef4444' }}>
                            ${Math.abs(itemDiff).toLocaleString()} over
                          </Text>
                        ) : (
                          <Text style={{ fontSize: 11, color: colors.textSecondary }}>On track</Text>
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
                              <Text style={{ fontSize: 11, fontWeight: '600', color: colors.text, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                                {item.expenses.length} {item.expenses.length === 1 ? 'Expense' : 'Expenses'}
                              </Text>
                              <FontAwesome
                                name={expandedExpenses.has(item.id) ? 'chevron-up' : 'chevron-down'}
                                size={10}
                                color="#6b7280"
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
                                    <Text style={{ fontSize: 12, color: colors.text, flex: 1, marginRight: 8 }} numberOfLines={1}>
                                      {expense.description}
                                    </Text>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                      <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text }}>
                                        ${expense.amount.toLocaleString()}
                                      </Text>
                                      <Pressable
                                        onPress={() => handleDeleteExpense(item.id, expense.id)}
                                        hitSlop={8}
                                        style={{ padding: 4 }}
                                      >
                                        <FontAwesome name="trash" size={11} color="#9ca3af" />
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
                            <Text style={{ fontSize: 11, fontWeight: '500', color: colors.text, marginBottom: 6 }}>Description</Text>
                            <TextInput
                              value={newExpenseDesc}
                              onChangeText={setNewExpenseDesc}
                              placeholder="e.g., Round trip tickets"
                              placeholderTextColor="#9ca3af"
                              autoFocus
                              style={{
                                borderWidth: 1, borderColor: colors.border, borderRadius: 8,
                                paddingHorizontal: 12, paddingVertical: 8,
                                fontSize: 13, color: colors.text, backgroundColor: colors.inputBackground,
                                marginBottom: 10,
                              }}
                            />
                            <Text style={{ fontSize: 11, fontWeight: '500', color: colors.text, marginBottom: 6 }}>Amount</Text>
                            <TextInput
                              value={newExpenseAmount}
                              onChangeText={setNewExpenseAmount}
                              placeholder="0.00"
                              placeholderTextColor="#9ca3af"
                              keyboardType="numeric"
                              style={{
                                borderWidth: 1, borderColor: colors.border, borderRadius: 8,
                                paddingHorizontal: 12, paddingVertical: 8,
                                fontSize: 13, color: colors.text, backgroundColor: colors.inputBackground,
                                marginBottom: 12,
                              }}
                            />
                            <View style={{ flexDirection: 'row', gap: 8 }}>
                              <Pressable
                                onPress={() => handleAddExpense(item.id)}
                                style={{
                                  flex: 1, backgroundColor: '#10b981', borderRadius: 8,
                                  paddingVertical: 10, alignItems: 'center',
                                }}
                              >
                                <Text style={{ fontSize: 13, fontWeight: '600', color: '#fff' }}>Add Expense</Text>
                              </Pressable>
                              <Pressable
                                onPress={() => { setAddingExpenseFor(null); setNewExpenseDesc(''); setNewExpenseAmount(''); }}
                                style={{
                                  flex: 1, backgroundColor: colors.borderLight, borderRadius: 8,
                                  paddingVertical: 10, alignItems: 'center',
                                }}
                              >
                                <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text }}>Cancel</Text>
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
                            <FontAwesome name="plus" size={12} color="#374151" />
                            <Text style={{ fontSize: 13, fontWeight: '500', color: colors.text }}>Add Expense</Text>
                          </Pressable>
                        )}
                      </View>
                    </>
                  ) : (
                    /* ── Editing budgeted amount inline ── */
                    <View>
                      <Text style={{ fontSize: 11, color: colors.textSecondary, marginBottom: 6 }}>Budgeted</Text>
                      <TextInput
                        value={tempBudgeted}
                        onChangeText={setTempBudgeted}
                        keyboardType="numeric"
                        placeholder="0.00"
                        placeholderTextColor="#9ca3af"
                        autoFocus
                        style={{
                          borderWidth: 1, borderColor: colors.border, borderRadius: 8,
                          paddingHorizontal: 12, paddingVertical: 8,
                          fontSize: 14, color: colors.text, backgroundColor: colors.inputBackground,
                          marginBottom: 12,
                        }}
                      />
                      <View style={{ flexDirection: 'row', gap: 8 }}>
                        <Pressable
                          onPress={handleSaveEdit}
                          style={{
                            flex: 1, backgroundColor: '#10b981', borderRadius: 8,
                            paddingVertical: 10, alignItems: 'center',
                          }}
                        >
                          <Text style={{ fontSize: 13, fontWeight: '600', color: '#fff' }}>Save</Text>
                        </Pressable>
                        <Pressable
                          onPress={handleCancelEdit}
                          style={{
                            flex: 1, backgroundColor: colors.borderLight, borderRadius: 8,
                            paddingVertical: 10, alignItems: 'center',
                          }}
                        >
                          <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text }}>Cancel</Text>
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
            <FontAwesome name="plus" size={22} color="#9ca3af" />
            <Text style={{ fontSize: 13, fontWeight: '500', color: colors.textSecondary }}>Add Category</Text>
          </Pressable>
        ) : (
          <View style={{ backgroundColor: '#ecfdf5', borderRadius: 10, borderWidth: 2, borderColor: '#6ee7b7', padding: 16 }}>
            <Text style={{ fontSize: 11, fontWeight: '500', color: colors.text, marginBottom: 6 }}>Category Name</Text>
            <TextInput
              value={newCategory}
              onChangeText={setNewCategory}
              placeholder="e.g., Insurance"
              placeholderTextColor="#9ca3af"
              autoFocus
              style={{
                borderWidth: 1, borderColor: colors.border, borderRadius: 8,
                paddingHorizontal: 12, paddingVertical: 8,
                fontSize: 13, color: colors.text, backgroundColor: colors.inputBackground,
                marginBottom: 10,
              }}
            />
            <Text style={{ fontSize: 11, fontWeight: '500', color: colors.text, marginBottom: 6 }}>Budgeted Amount</Text>
            <TextInput
              value={newBudgeted}
              onChangeText={setNewBudgeted}
              placeholder="0.00"
              placeholderTextColor="#9ca3af"
              keyboardType="numeric"
              style={{
                borderWidth: 1, borderColor: colors.border, borderRadius: 8,
                paddingHorizontal: 12, paddingVertical: 8,
                fontSize: 13, color: colors.text, backgroundColor: colors.inputBackground,
                marginBottom: 10,
              }}
            />
            <Text style={{ fontSize: 11, fontWeight: '500', color: colors.text, marginBottom: 6 }}>Actual Spent</Text>
            <TextInput
              value={newActual}
              onChangeText={setNewActual}
              placeholder="0.00"
              placeholderTextColor="#9ca3af"
              keyboardType="numeric"
              style={{
                borderWidth: 1, borderColor: colors.border, borderRadius: 8,
                paddingHorizontal: 12, paddingVertical: 8,
                fontSize: 13, color: colors.text, backgroundColor: colors.inputBackground,
                marginBottom: 14,
              }}
            />
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Pressable
                onPress={handleAddCategory}
                style={{
                  flex: 1, backgroundColor: '#10b981', borderRadius: 8,
                  paddingVertical: 10, alignItems: 'center',
                }}
              >
                <Text style={{ fontSize: 13, fontWeight: '600', color: '#fff' }}>Add</Text>
              </Pressable>
              <Pressable
                onPress={() => { setShowAddCategory(false); setNewCategory(''); setNewBudgeted(''); setNewActual(''); }}
                style={{
                  flex: 1, backgroundColor: colors.cardBackground, borderRadius: 8, borderWidth: 1, borderColor: colors.border,
                  paddingVertical: 10, alignItems: 'center',
                }}
              >
                <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text }}>Cancel</Text>
              </Pressable>
            </View>
          </View>
        )}
      </View>
    </ScrollView>
    </PageTransition>
  );
}
