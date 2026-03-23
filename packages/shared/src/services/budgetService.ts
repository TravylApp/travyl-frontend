import { supabase } from './supabase'
import type { TripBudgetCategory, TripManualExpense } from '../types'

// ─── Budget Categories ──────────────────────────────────────

export async function fetchBudgetCategories(tripId: string): Promise<TripBudgetCategory[]> {
  const { data, error } = await supabase
    .from('trip_budget_categories')
    .select('*')
    .eq('trip_id', tripId)
    .order('sort_order', { ascending: true })
  if (error) throw error
  return data ?? []
}

export async function upsertBudgetCategory(
  category: Partial<TripBudgetCategory> & { trip_id: string; category: string; created_by: string },
): Promise<void> {
  const { error } = await supabase
    .from('trip_budget_categories')
    .upsert(category, { onConflict: 'id' })
  if (error) throw error
}

export async function deleteBudgetCategory(categoryId: string): Promise<void> {
  const { error } = await supabase
    .from('trip_budget_categories')
    .delete()
    .eq('id', categoryId)
  if (error) throw error
}

// ─── Manual Expenses ────────────────────────────────────────

export async function fetchManualExpenses(tripId: string): Promise<TripManualExpense[]> {
  const { data, error } = await supabase
    .from('trip_manual_expenses')
    .select('*')
    .eq('trip_id', tripId)
    .order('created_at', { ascending: true })
  if (error) throw error
  return data ?? []
}

export async function addManualExpense(
  expense: Omit<TripManualExpense, 'id' | 'created_at'>,
): Promise<void> {
  const { error } = await supabase
    .from('trip_manual_expenses')
    .insert(expense)
  if (error) throw error
}

export async function deleteManualExpense(expenseId: string): Promise<void> {
  const { error } = await supabase
    .from('trip_manual_expenses')
    .delete()
    .eq('id', expenseId)
  if (error) throw error
}
