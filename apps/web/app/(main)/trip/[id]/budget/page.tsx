'use client';

import { use, useState } from 'react';
import {
  Plane, Building2, UtensilsCrossed, Compass, Car, ShoppingBag,
  MoreHorizontal, Wallet, Plus, Trash2, Edit2, Check, X, ChevronDown,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useItineraryScreen } from '@travyl/shared';
import type { LucideIcon } from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface BudgetExpense {
  id: string;
  description: string;
  amount: number;
}

interface BudgetItem {
  id: string;
  category: string;
  budgeted: number;
  actual: number;
  fixed: boolean;
  expenses?: BudgetExpense[];
}

/* ------------------------------------------------------------------ */
/*  Mock data — Paris trip, $3 000 total                               */
/* ------------------------------------------------------------------ */

const INITIAL_BUDGET: BudgetItem[] = [
  {
    id: 'flights',
    category: 'Flights',
    budgeted: 800,
    actual: 750,
    fixed: true,
    expenses: [
      { id: 'f1', description: 'Round-trip CDG — JFK', amount: 680 },
      { id: 'f2', description: 'Seat upgrade', amount: 70 },
    ],
  },
  {
    id: 'hotels',
    category: 'Hotels',
    budgeted: 900,
    actual: 850,
    fixed: true,
    expenses: [
      { id: 'h1', description: 'Hotel Le Marais (5 nights)', amount: 750 },
      { id: 'h2', description: 'Late checkout fee', amount: 100 },
    ],
  },
  {
    id: 'food',
    category: 'Food & Dining',
    budgeted: 500,
    actual: 420,
    fixed: true,
    expenses: [
      { id: 'd1', description: 'Bistro dinners', amount: 220 },
      { id: 'd2', description: 'Bakeries & cafes', amount: 120 },
      { id: 'd3', description: 'Wine tasting', amount: 80 },
    ],
  },
  {
    id: 'activities',
    category: 'Activities',
    budgeted: 400,
    actual: 280,
    fixed: true,
    expenses: [
      { id: 'a1', description: 'Louvre Museum tickets', amount: 40 },
      { id: 'a2', description: 'Seine river cruise', amount: 90 },
      { id: 'a3', description: 'Eiffel Tower summit', amount: 50 },
      { id: 'a4', description: 'Cooking class', amount: 100 },
    ],
  },
  {
    id: 'transportation',
    category: 'Transportation',
    budgeted: 200,
    actual: 150,
    fixed: true,
    expenses: [
      { id: 't1', description: 'Metro pass (5 days)', amount: 75 },
      { id: 't2', description: 'Airport shuttle', amount: 50 },
      { id: 't3', description: 'Uber rides', amount: 25 },
    ],
  },
  {
    id: 'shopping',
    category: 'Shopping',
    budgeted: 150,
    actual: 80,
    fixed: false,
    expenses: [
      { id: 's1', description: 'Souvenirs', amount: 50 },
      { id: 's2', description: 'Macarons gift box', amount: 30 },
    ],
  },
  {
    id: 'other',
    category: 'Other',
    budgeted: 50,
    actual: 30,
    fixed: false,
    expenses: [
      { id: 'o1', description: 'Travel insurance', amount: 30 },
    ],
  },
];

/* ------------------------------------------------------------------ */
/*  Category icon / colour maps                                        */
/* ------------------------------------------------------------------ */

const CATEGORY_ICONS: Record<string, LucideIcon> = {
  Flights: Plane,
  Hotels: Building2,
  'Food & Dining': UtensilsCrossed,
  Activities: Compass,
  Transportation: Car,
  Shopping: ShoppingBag,
  Other: MoreHorizontal,
};

const CATEGORY_COLORS: Record<string, { bg: string; text: string; bar: string; bgStyle?: React.CSSProperties; textStyle?: React.CSSProperties; barStyle?: React.CSSProperties }> = {
  Flights:         { bg: 'bg-blue-100',       text: 'text-blue-600',     bar: 'bg-blue-500' },
  Hotels:          { bg: 'bg-orange-100',      text: 'text-orange-600',   bar: 'bg-orange-500' },
  'Food & Dining': { bg: '',                   text: '',                  bar: '',
                     bgStyle: { backgroundColor: 'rgb(var(--trip-base-rgb) / 0.1)' },
                     textStyle: { color: 'var(--trip-base)' },
                     barStyle: { backgroundColor: 'var(--trip-base)' } },
  Activities:      { bg: 'bg-teal-100',        text: 'text-teal-600',     bar: 'bg-teal-500' },
  Transportation:  { bg: 'bg-purple-100',      text: 'text-purple-600',   bar: 'bg-purple-500' },
  Shopping:        { bg: 'bg-green-100',        text: 'text-green-600',    bar: 'bg-green-500' },
  Other:           { bg: 'bg-gray-100',        text: 'text-gray-600',     bar: 'bg-gray-500' },
};

const DEFAULT_COLORS: typeof CATEGORY_COLORS[string] = { bg: 'bg-gray-100', text: 'text-gray-600', bar: 'bg-gray-500' };

/* ------------------------------------------------------------------ */
/*  Skeleton                                                           */
/* ------------------------------------------------------------------ */

function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`rounded-md bg-gray-200 animate-pulse ${className}`} />;
}

function BudgetSkeleton() {
  return (
    <div>
      <div className="grid grid-cols-3 gap-3 mb-4">
        {['Total Budget', 'Total Spent', 'Remaining'].map((label) => (
          <div key={label} className="rounded-lg p-3 border border-gray-200 bg-white">
            <p className="text-[10px] text-gray-600 uppercase tracking-wide">{label}</p>
            <Skeleton className="h-6 w-16 mt-1.5" />
          </div>
        ))}
      </div>
      <div className="bg-gray-200 rounded-full h-2.5 mb-6 overflow-hidden">
        <div className="h-full rounded-full" style={{ width: '65%', backgroundColor: 'var(--trip-base)' }} />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="rounded-lg p-3.5 border border-gray-200 bg-white">
            <div className="flex items-center justify-between mb-2.5">
              <div className="flex items-center gap-2.5">
                <Skeleton className="w-9 h-9 rounded-[10px]" />
                <div>
                  <Skeleton className="h-3.5 w-20" />
                  <Skeleton className="h-2.5 w-16 mt-1" />
                </div>
              </div>
              <Skeleton className="h-4 w-14" />
            </div>
            <Skeleton className="h-1.5 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

/** Dynamic background class based on budget health percentage. */
function healthBg(pct: number) {
  if (pct >= 100) return 'bg-red-50 border-red-200';
  if (pct >= 90)  return 'bg-amber-50 border-amber-200';
  if (pct >= 75)  return 'bg-blue-50 border-blue-200';
  return 'bg-white border-gray-200';
}

/** Per-category card background (green when healthy). */
function categoryHealthBg(pct: number): { className: string; style?: React.CSSProperties } {
  if (pct >= 100) return { className: 'bg-red-50 border-red-200' };
  if (pct >= 90)  return { className: 'bg-amber-50 border-amber-200' };
  if (pct >= 75)  return { className: 'bg-blue-50 border-blue-200' };
  return {
    className: 'border',
    style: {
      backgroundColor: 'rgb(var(--trip-base-rgb) / 0.05)',
      borderColor: 'rgb(var(--trip-base-rgb) / 0.2)',
    },
  };
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function Budget({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { isLoading } = useItineraryScreen(id);

  /* ---- state ---- */
  const [budgetData, setBudgetData] = useState<BudgetItem[]>(INITIAL_BUDGET);
  const [isEditingTotal, setIsEditingTotal] = useState(false);
  const [tempTotal, setTempTotal] = useState('');
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [tempBudgeted, setTempBudgeted] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [expandedExpenses, setExpandedExpenses] = useState<Set<string>>(new Set());
  const [addingExpenseFor, setAddingExpenseFor] = useState<string | null>(null);
  const [newExpenseDesc, setNewExpenseDesc] = useState('');
  const [newExpenseAmount, setNewExpenseAmount] = useState('');
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [newCategory, setNewCategory] = useState('');
  const [newBudgeted, setNewBudgeted] = useState('');
  const [newActual, setNewActual] = useState('');

  /* ---- derived ---- */
  const totalBudgeted = budgetData.reduce((s, i) => s + i.budgeted, 0);
  const totalActual   = budgetData.reduce((s, i) => s + i.actual, 0);
  const remaining     = totalBudgeted - totalActual;
  const pctUsed       = totalBudgeted > 0 ? (totalActual / totalBudgeted) * 100 : 0;
  const overallBg     = healthBg(pctUsed);

  /* ---- handlers ---- */

  const toggle = (set: Set<string>, id: string) => {
    const next = new Set(set);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  };

  const toggleCategory = (cid: string) =>
    setExpandedCategories((prev) => toggle(prev, cid));

  const toggleExpenses = (cid: string) =>
    setExpandedExpenses((prev) => toggle(prev, cid));

  const handleSaveTotalBudget = () => {
    const newTotal = parseFloat(tempTotal) || 0;
    if (newTotal > 0 && totalBudgeted > 0) {
      const ratio = newTotal / totalBudgeted;
      setBudgetData((prev) =>
        prev.map((item) => ({
          ...item,
          budgeted: Math.round(item.budgeted * ratio * 100) / 100,
        })),
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
          item.id === editingItemId
            ? { ...item, budgeted: parseFloat(tempBudgeted) || 0 }
            : item,
        ),
      );
      setEditingItemId(null);
    }
  };

  const handleCancelEdit = () => {
    setEditingItemId(null);
    setTempBudgeted('');
  };

  const handleDeleteCategory = (cid: string) => {
    setBudgetData((prev) => prev.filter((item) => item.id !== cid));
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
            const actual = expenses.reduce((s, e) => s + e.amount, 0);
            return { ...item, expenses, actual, budgeted: Math.max(item.budgeted, actual) };
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
          const expenses = (item.expenses || []).filter((e) => e.id !== expenseId);
          const actual = expenses.reduce((s, e) => s + e.amount, 0);
          return { ...item, expenses, actual };
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

  /* ---- loading ---- */
  if (isLoading) return <BudgetSkeleton />;

  /* ---- render ---- */
  return (
    <div className="space-y-4">
      {/* ===== Summary Cards (3-column) ===== */}
      <div className="grid grid-cols-3 gap-2">
        {/* Total Budget — editable */}
        <div className={`${overallBg} rounded-lg p-2 transition-colors`}>
          <div className="flex items-center justify-between mb-0.5">
            <span className="text-[10px] sm:text-xs text-gray-600">Total Budget</span>
            {!isEditingTotal ? (
              <button
                onClick={() => {
                  setIsEditingTotal(true);
                  setTempTotal(totalBudgeted.toString());
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <Edit2 size={12} />
              </button>
            ) : (
              <div className="flex items-center gap-1">
                <button
                  onClick={handleSaveTotalBudget}
                  className="text-emerald-600 hover:text-emerald-700"
                >
                  <Check size={12} />
                </button>
                <button
                  onClick={() => setIsEditingTotal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X size={12} />
                </button>
              </div>
            )}
          </div>
          {!isEditingTotal ? (
            <div className="text-base sm:text-xl font-bold text-gray-900">
              ${totalBudgeted.toLocaleString()}
            </div>
          ) : (
            <input
              type="number"
              value={tempTotal}
              onChange={(e) => setTempTotal(e.target.value)}
              className="w-full px-2 py-1 border border-gray-300 rounded text-sm font-bold"
              autoFocus
            />
          )}
        </div>

        {/* Total Spent */}
        <div className={`${overallBg} rounded-lg p-2 transition-colors`}>
          <span className="text-[10px] sm:text-xs text-gray-600 block mb-0.5">Total Spent</span>
          <div className="text-base sm:text-xl font-bold text-gray-900">
            ${totalActual.toLocaleString()}
          </div>
        </div>

        {/* Remaining */}
        <div className={`${overallBg} rounded-lg p-2 transition-colors`}>
          <span className="text-[10px] sm:text-xs text-gray-600 block mb-0.5">Remaining</span>
          <div
            className={`text-base sm:text-xl font-bold ${
              remaining >= 0 ? 'text-emerald-600' : 'text-red-600'
            }`}
          >
            ${Math.abs(remaining).toLocaleString()}
          </div>
        </div>
      </div>

      {/* ===== Overall Progress Bar ===== */}
      <div className={`${overallBg} rounded-lg p-3 transition-colors`}>
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">Budget Progress</span>
          <span className="text-sm font-semibold text-gray-900">{pctUsed.toFixed(1)}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
          <div
            className={`h-full transition-all duration-300 ${
              pctUsed > 100
                ? 'bg-red-500'
                : pctUsed > 80
                  ? 'bg-amber-500'
                  : ''
            }`}
            style={{
              width: `${Math.min(pctUsed, 100)}%`,
              ...(pctUsed <= 80 ? { backgroundColor: 'var(--trip-base)' } : {}),
            }}
          />
        </div>
      </div>

      {/* ===== Category Grid (sm:2 columns) ===== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        {budgetData.map((item) => {
          const isEditing    = editingItemId === item.id;
          const isExpanded   = expandedCategories.has(item.id);
          const itemDiff     = item.budgeted - item.actual;
          const itemPct      = item.budgeted > 0 ? (item.actual / item.budgeted) * 100 : 0;
          const colors       = CATEGORY_COLORS[item.category] || DEFAULT_COLORS;
          const Icon         = CATEGORY_ICONS[item.category] || Wallet;
          const healthResult = categoryHealthBg(itemPct);

          // Progress bar colour — override with amber/red at thresholds
          const progressBar =
            itemPct > 100
              ? 'bg-red-500'
              : itemPct > 80
                ? 'bg-amber-500'
                : colors.bar;
          const progressBarStyle = (itemPct <= 80 && colors.barStyle) ? colors.barStyle : undefined;

          return (
            <div
              key={item.id}
              className={`${healthResult.className} rounded-lg hover:shadow-md transition-shadow ${
                isExpanded ? 'p-4' : 'p-3'
              }`}
              style={healthResult.style}
            >
              {/* --- Collapsed header --- */}
              <div
                onClick={() => !isEditing && toggleCategory(item.id)}
                className="w-full flex items-center justify-between cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <div className={`p-2 ${colors.bg} ${colors.text} rounded-lg`} style={{ ...colors.bgStyle, ...colors.textStyle }}>
                    <Icon size={18} />
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900 text-left">{item.category}</div>
                    {!isExpanded && (
                      <div className="text-sm text-gray-600">
                        ${item.actual.toLocaleString()}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  {!isExpanded && !isEditing && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleStartEdit(item);
                      }}
                      className="p-1 text-gray-400 hover:text-gray-600"
                    >
                      <Edit2 size={14} />
                    </button>
                  )}
                  {!isEditing && (
                    <ChevronDown
                      className={`w-5 h-5 text-gray-400 transition-transform ${
                        isExpanded ? 'rotate-180' : ''
                      }`}
                    />
                  )}
                </div>
              </div>

              {/* --- Expanded content (animated) --- */}
              <AnimatePresence initial={false}>
                {isExpanded && (
                  <motion.div
                    key="expanded"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25, ease: 'easeInOut' }}
                    className="overflow-hidden"
                  >
                    <div className="mt-3">
                      {!isEditing ? (
                        <>
                          {/* Budgeted / Actual */}
                          <div className="grid grid-cols-2 gap-3 mb-3">
                            <div>
                              <div className="text-xs text-gray-600 mb-1">Budgeted</div>
                              <div className="text-lg font-bold text-gray-900">
                                ${item.budgeted.toLocaleString()}
                              </div>
                            </div>
                            <div>
                              <div className="flex items-center justify-between mb-1">
                                <div className="text-xs text-gray-600">Actual</div>
                                <div className="flex items-center gap-1">
                                  <button
                                    onClick={() => handleStartEdit(item)}
                                    className="p-1 text-gray-400 hover:text-gray-600"
                                  >
                                    <Edit2 size={14} />
                                  </button>
                                  {!item.fixed && (
                                    <button
                                      onClick={() => handleDeleteCategory(item.id)}
                                      className="p-1 text-gray-400 hover:text-red-600"
                                    >
                                      <Trash2 size={14} />
                                    </button>
                                  )}
                                </div>
                              </div>
                              <div className="text-lg font-bold text-gray-900">
                                ${item.actual.toLocaleString()}
                              </div>
                            </div>
                          </div>

                          {/* Category progress bar */}
                          <div className="mb-2">
                            <div className="w-full bg-white rounded-full h-2 overflow-hidden">
                              <div
                                className={`h-full transition-all ${progressBar}`}
                                style={{ width: `${Math.min(itemPct, 100)}%`, ...progressBarStyle }}
                              />
                            </div>
                          </div>

                          {/* Under / over indicator */}
                          <div className="flex items-center justify-between text-xs mb-3">
                            <span className="text-gray-600">{itemPct.toFixed(0)}% used</span>
                            {itemDiff > 0 ? (
                              <span className="text-emerald-600 font-medium">
                                ${itemDiff.toLocaleString()} under
                              </span>
                            ) : itemDiff < 0 ? (
                              <span className="text-red-600 font-medium">
                                ${Math.abs(itemDiff).toLocaleString()} over
                              </span>
                            ) : (
                              <span className="text-gray-600">On track</span>
                            )}
                          </div>

                          {/* Expenses section */}
                          <div className="mt-3 pt-3 border-t border-gray-200">
                            {item.expenses && item.expenses.length > 0 && (
                              <div className="mb-3">
                                {/* Collapsible expenses header */}
                                <button
                                  onClick={() => toggleExpenses(item.id)}
                                  className="w-full flex items-center justify-between mb-2 hover:bg-white/50 rounded px-2 py-1 transition-colors"
                                >
                                  <div className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
                                    {item.expenses.length}{' '}
                                    {item.expenses.length === 1 ? 'Expense' : 'Expenses'}
                                  </div>
                                  <ChevronDown
                                    className={`w-5 h-5 text-gray-500 transition-transform ${
                                      expandedExpenses.has(item.id) ? 'rotate-180' : ''
                                    }`}
                                  />
                                </button>

                                {/* Expenses list (animated) */}
                                <AnimatePresence initial={false}>
                                  {expandedExpenses.has(item.id) && (
                                    <motion.div
                                      key="expenses"
                                      initial={{ height: 0, opacity: 0 }}
                                      animate={{ height: 'auto', opacity: 1 }}
                                      exit={{ height: 0, opacity: 0 }}
                                      transition={{ duration: 0.2, ease: 'easeInOut' }}
                                      className="overflow-hidden"
                                    >
                                      <div className="space-y-2 mb-3">
                                        {item.expenses.map((expense) => (
                                          <div
                                            key={expense.id}
                                            className="group flex items-start justify-between bg-white px-3 py-2 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors"
                                          >
                                            <div className="flex-1 min-w-0 mr-3">
                                              <p className="text-xs text-gray-800 leading-relaxed">
                                                {expense.description}
                                              </p>
                                            </div>
                                            <div className="flex items-center gap-2 flex-shrink-0">
                                              <span className="text-sm font-semibold text-gray-900">
                                                ${expense.amount.toLocaleString()}
                                              </span>
                                              <button
                                                onClick={() =>
                                                  handleDeleteExpense(item.id, expense.id)
                                                }
                                                className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-all"
                                                title="Delete expense"
                                              >
                                                <Trash2 size={12} />
                                              </button>
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    </motion.div>
                                  )}
                                </AnimatePresence>
                              </div>
                            )}

                            {/* Add expense form / button */}
                            {addingExpenseFor === item.id ? (
                              <div className="space-y-2.5 bg-white p-3 rounded-lg border border-gray-200 shadow-sm">
                                <div>
                                  <label className="text-xs font-medium text-gray-700 mb-1.5 block">
                                    Description
                                  </label>
                                  <input
                                    type="text"
                                    value={newExpenseDesc}
                                    onChange={(e) => setNewExpenseDesc(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-trip-base focus:border-transparent"
                                    placeholder="e.g., Round trip to Paris"
                                    autoFocus
                                  />
                                </div>
                                <div>
                                  <label className="text-xs font-medium text-gray-700 mb-1.5 block">
                                    Amount
                                  </label>
                                  <input
                                    type="number"
                                    value={newExpenseAmount}
                                    onChange={(e) => setNewExpenseAmount(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-trip-base focus:border-transparent"
                                    placeholder="0.00"
                                  />
                                </div>
                                <div className="flex gap-2 pt-1">
                                  <button
                                    onClick={() => handleAddExpense(item.id)}
                                    className="flex-1 px-3 py-2 text-white rounded-lg hover:bg-trip-base-light text-sm font-medium transition-colors"
                                    style={{ backgroundColor: 'var(--trip-base)' }}
                                  >
                                    Add Expense
                                  </button>
                                  <button
                                    onClick={() => {
                                      setAddingExpenseFor(null);
                                      setNewExpenseDesc('');
                                      setNewExpenseAmount('');
                                    }}
                                    className="flex-1 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm font-medium transition-colors"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <button
                                onClick={() => setAddingExpenseFor(item.id)}
                                className="w-full px-3 py-2 bg-white text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 hover:border-gray-400 text-sm font-medium flex items-center justify-center gap-2 transition-colors"
                              >
                                <Plus size={14} />
                                Add Expense
                              </button>
                            )}
                          </div>
                        </>
                      ) : (
                        /* Editing budgeted amount */
                        <div className="space-y-2">
                          <div>
                            <label className="text-xs text-gray-600 mb-1 block">Budgeted</label>
                            <input
                              type="number"
                              value={tempBudgeted}
                              onChange={(e) => setTempBudgeted(e.target.value)}
                              className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm bg-white"
                              placeholder="0.00"
                            />
                          </div>
                          <div className="flex gap-2 pt-2">
                            <button
                              onClick={handleSaveEdit}
                              className="flex-1 px-3 py-2 text-white rounded-lg hover:bg-trip-base-light text-sm font-medium transition-colors"
                              style={{ backgroundColor: 'var(--trip-base)' }}
                            >
                              Save
                            </button>
                            <button
                              onClick={handleCancelEdit}
                              className="flex-1 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm font-medium transition-colors"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}

        {/* ===== Add Category Card ===== */}
        {!showAddCategory ? (
          <button
            onClick={() => setShowAddCategory(true)}
            className="border-2 border-dashed border-gray-300 rounded-lg p-4 hover:border-trip-base hover:bg-trip-base/5 transition-colors flex flex-col items-center justify-center gap-2 min-h-[200px]"
          >
            <Plus size={24} className="text-gray-400" />
            <span className="text-sm font-medium text-gray-600">Add Category</span>
          </button>
        ) : (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.2 }}
            className="rounded-lg border-2 p-4"
            style={{
              backgroundColor: 'rgb(var(--trip-base-rgb) / 0.05)',
              borderColor: 'rgb(var(--trip-base-rgb) / 0.3)',
            }}
          >
            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-700 mb-1 block font-medium">
                  Category Name
                </label>
                <input
                  type="text"
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                  placeholder="e.g., Insurance"
                  autoFocus
                />
              </div>
              <div>
                <label className="text-xs text-gray-700 mb-1 block font-medium">
                  Budgeted Amount
                </label>
                <input
                  type="number"
                  value={newBudgeted}
                  onChange={(e) => setNewBudgeted(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="text-xs text-gray-700 mb-1 block font-medium">
                  Actual Spent
                </label>
                <input
                  type="number"
                  value={newActual}
                  onChange={(e) => setNewActual(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                  placeholder="0.00"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  onClick={handleAddCategory}
                  className="flex-1 px-3 py-2 text-white rounded hover:bg-trip-base-light text-sm font-medium"
                  style={{ backgroundColor: 'var(--trip-base)' }}
                >
                  Add
                </button>
                <button
                  onClick={() => {
                    setShowAddCategory(false);
                    setNewCategory('');
                    setNewBudgeted('');
                    setNewActual('');
                  }}
                  className="flex-1 px-3 py-2 bg-white text-gray-700 rounded hover:bg-gray-100 text-sm font-medium border border-gray-300"
                >
                  Cancel
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
