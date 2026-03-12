'use client';

import { useState, useMemo } from 'react';
import { DollarSign, PieChart as PieChartIcon } from 'lucide-react';

// Expense categories with colors
const EXPENSE_CATEGORIES: Record<string, { color: string; label: string }> = {
  accommodation: { color: '#3B82F6', label: 'Accommodation' },
  flights: { color: '#8B5CF6', label: 'Flights' },
  food: { color: '#F59E0B', label: 'Food & Dining' },
  activities: { color: '#10B981', label: 'Activities' },
  transport: { color: '#EC4899', label: 'Transport' },
  shopping: { color: '#6366F1', label: 'Shopping' },
  other: { color: '#6B7280', label: 'Other' },
};

export interface ExpenseBreakdown {
  accommodation: number;
  flights: number;
  food: number;
  activities: number;
  transport: number;
  shopping: number;
  other: number;
}

interface BudgetBadgeProps {
  budget: number;
  spent: number;
  currency: string;
  expenses?: ExpenseBreakdown;
}

function formatCurrency(amount: number, currency: string): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatShortCurrency(amount: number, currency: string): string {
  if (amount >= 1000) {
    return `${currency} ${(amount / 1000).toFixed(1)}k`;
  }
  return `${currency} ${amount}`;
}

// SVG Pie Chart component
function PieChart({ data, size = 120 }: { data: { value: number; color: string }[]; size?: number }) {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  const center = size / 2;
  const radius = size / 2 - 8;
  const innerRadius = radius * 0.55; // Donut hole

  const paths = useMemo(() => {
    let currentAngle = -90; // Start from top
    const result: { path: string; color: string; value: number }[] = [];

    data.forEach((item) => {
      if (item.value === 0) return;

      const percentage = (item.value / total) * 100;
      const angle = (item.value / total) * 360;

      const startAngle = currentAngle * (Math.PI / 180);
      const endAngle = (currentAngle + angle) * (Math.PI / 180);

      const x1 = center + radius * Math.cos(startAngle);
      const y1 = center + radius * Math.sin(startAngle);
      const x2 = center + radius * Math.cos(endAngle);
      const y2 = center + radius * Math.sin(endAngle);

      const ix1 = center + innerRadius * Math.cos(startAngle);
      const iy1 = center + innerRadius * Math.sin(startAngle);
      const ix2 = center + innerRadius * Math.cos(endAngle);
      const iy2 = center + innerRadius * Math.sin(endAngle);

      const largeArcFlag = angle > 180 ? 1 : 0;

      const pathD = `
        M ${ix1} ${iy1}
        L ${x1} ${y1}
        A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}
        L ${ix2} ${iy2}
        A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 0 ${ix1} ${iy1}
        Z
      `;

      result.push({
        path: pathD,
        color: item.color,
        value: item.value,
      });

      currentAngle += angle;
    });

    return result;
  }, [data, total, center, radius, innerRadius]);

  return (
    <svg width={size} height={size} className="transform -rotate-0">
      {paths.map((item, index) => (
        <path
          key={index}
          d={item.path}
          fill={item.color}
          className="transition-opacity hover:opacity-80"
          stroke="white"
          strokeWidth="1"
        />
      ))}
    </svg>
  );
}

export function BudgetBadge({ budget, spent, currency, expenses }: BudgetBadgeProps) {
  const [showBreakdown, setShowBreakdown] = useState(false);
  const percentage = (spent / budget) * 100;
  const isOverBudget = percentage > 100;
  const remaining = budget - spent;

  // Convert expenses to pie chart data
  const pieData = useMemo(() => {
    if (!expenses) return [];
    return Object.entries(expenses)
      .filter(([, value]) => value > 0)
      .map(([key, value]) => ({
        value,
        color: EXPENSE_CATEGORIES[key]?.color || EXPENSE_CATEGORIES.other.color,
      }));
  }, [expenses]);

  // Category breakdown for legend
  const categoryList = useMemo(() => {
    if (!expenses) return [];
    return Object.entries(expenses)
      .filter(([, value]) => value > 0)
      .sort(([, a], [, b]) => b - a)
      .map(([key, value]) => ({
        key,
        label: EXPENSE_CATEGORIES[key]?.label || 'Other',
        color: EXPENSE_CATEGORIES[key]?.color || EXPENSE_CATEGORIES.other.color,
        amount: value,
        percentage: (value / spent) * 100,
      }));
  }, [expenses, spent]);

  return (
    <div
      className="relative"
      onMouseEnter={() => setShowBreakdown(true)}
      onMouseLeave={() => setShowBreakdown(false)}
    >
      {/* Budget indicator badge */}
      <div className="flex items-center gap-1.5 cursor-pointer group">
        <div className="relative">
          <DollarSign size={13} className={`group-hover:text-primary-dark transition-colors ${isOverBudget ? 'text-red-500' : 'text-gray-400'}`} />
          {/* Mini progress ring around the icon */}
          <svg className="absolute inset-0 w-[13px] h-[13px] -rotate-90" viewBox="0 0 16 16">
            <circle
              cx="8"
              cy="8"
              r="6"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              className="text-gray-200"
            />
            <circle
              cx="8"
              cy="8"
              r="6"
              fill="none"
              stroke={isOverBudget ? '#EF4444' : percentage > 80 ? '#F59E0B' : '#10B981'}
              strokeWidth="1.5"
              strokeDasharray={`${Math.min(percentage, 100) * 0.377} 37.7`}
              strokeLinecap="round"
              className="transition-all duration-500"
            />
          </svg>
        </div>
        <span className={`group-hover:text-primary-dark transition-colors text-xs ${isOverBudget ? 'text-red-600 font-medium' : 'text-gray-500'}`}>
          {formatShortCurrency(spent, currency)}
          {isOverBudget && <span className="ml-1 text-[10px]">over</span>}
        </span>
      </div>

      {/* Hover breakdown card */}
      {showBreakdown && expenses && (
        <div className="absolute bottom-full left-0 mb-2 z-50 animate-in fade-in-0 zoom-in-95 duration-150">
          <div className="bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden min-w-[240px] p-3">
            {/* Header with total */}
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <PieChartIcon size={14} className="text-accent-amber" />
                <span className="text-sm font-semibold text-gray-800">Budget Breakdown</span>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-400">Total Budget</p>
                <p className="text-sm font-bold text-gray-800">{formatCurrency(budget, currency)}</p>
              </div>
            </div>

            {/* Pie chart and legend */}
            <div className="flex items-start gap-3">
              {/* Pie Chart */}
              <div className="flex-shrink-0">
                <PieChart data={pieData} size={80} />
              </div>

              {/* Legend */}
              <div className="flex-1 space-y-1.5">
                {categoryList.slice(0, 5).map((cat) => (
                  <div key={cat.key} className="flex items-center gap-2">
                    <div
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ backgroundColor: cat.color }}
                    />
                    <span className="text-[11px] text-gray-600 flex-1 truncate">{cat.label}</span>
                    <span className="text-[11px] font-medium text-gray-800">
                      {formatCurrency(cat.amount, currency)}
                    </span>
                  </div>
                ))}
                {categoryList.length > 5 && (
                  <div className="text-[10px] text-gray-400 italic">
                    +{categoryList.length - 5} more
                  </div>
                )}
              </div>
            </div>

            {/* Footer with remaining */}
            <div className="mt-3 pt-2 border-t border-gray-100 flex items-center justify-between">
              <span className="text-xs text-gray-500">
                {isOverBudget ? 'Over budget by' : 'Remaining'}
              </span>
              <span className={`text-sm font-semibold ${isOverBudget ? 'text-red-600' : 'text-emerald-600'}`}>
                {formatCurrency(Math.abs(remaining), currency)}
              </span>
            </div>
          </div>
          {/* Arrow pointer */}
          <div className="absolute -bottom-1.5 left-4 w-2.5 h-2.5 bg-white border-r border-b border-gray-100 rotate-45" />
        </div>
      )}
    </div>
  );
}

// Helper to generate mock expense breakdown
export function generateMockExpenses(budget: number, spent: number): ExpenseBreakdown {
  // Generate random distribution that sums to spent
  const categories = ['accommodation', 'flights', 'food', 'activities', 'transport', 'shopping', 'other'] as const;
  const weights = [0.35, 0.25, 0.15, 0.12, 0.08, 0.03, 0.02]; // Typical travel expense distribution

  let remaining = spent;
  const result: ExpenseBreakdown = {
    accommodation: 0,
    flights: 0,
    food: 0,
    activities: 0,
    transport: 0,
    shopping: 0,
    other: 0,
  };

  categories.forEach((cat, index) => {
    if (index === categories.length - 1) {
      result[cat] = remaining;
    } else {
      const amount = Math.round(spent * weights[index] * (0.8 + Math.random() * 0.4));
      result[cat] = Math.min(amount, remaining);
      remaining -= result[cat];
    }
  });

  return result;
}
