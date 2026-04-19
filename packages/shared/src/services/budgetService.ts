/**
 * @module budgetService
 * Supabase CRUD functions for trip budget categories and manual expenses.
 * Works with the `trip_budget_categories` and `trip_manual_expenses` tables.
 * Consumed by budget-related React Query hooks and the budget tab UI.
 */

import { supabase } from './supabase'
import type { TripBudgetCategory, TripManualExpense } from '../types'

// ─── Budget Categories ──────────────────────────────────────

/**
 * Fetches all budget categories for a trip, sorted by `sort_order` ascending.
 * @param tripId - UUID of the trip
 * @returns Array of TripBudgetCategory objects
 * @throws PostgrestError if the query fails
 */
export async function fetchBudgetCategories(tripId: string): Promise<TripBudgetCategory[]> {
  const { data, error } = await supabase
    .from('trip_budget_categories')
    .select('*')
    .eq('trip_id', tripId)
    .order('sort_order', { ascending: true })
  if (error) throw error
  return data ?? []
}

/**
 * Creates or updates a budget category row (upserts on `id`).
 * @param category - Category data including required `trip_id`, `category`, and `created_by`
 * @throws PostgrestError if the upsert fails
 */
export async function upsertBudgetCategory(
  category: Partial<TripBudgetCategory> & { trip_id: string; category: string; created_by: string },
): Promise<void> {
  const { error } = await supabase
    .from('trip_budget_categories')
    .upsert(category, { onConflict: 'id' })
  if (error) throw error
}

/**
 * Deletes a budget category row by its primary key.
 * @param categoryId - UUID of the trip_budget_categories row
 * @throws PostgrestError if the delete fails
 */
export async function deleteBudgetCategory(categoryId: string): Promise<void> {
  const { error } = await supabase
    .from('trip_budget_categories')
    .delete()
    .eq('id', categoryId)
  if (error) throw error
}

// ─── Manual Expenses ────────────────────────────────────────

/**
 * Fetches all manual expenses for a trip, sorted by creation date ascending.
 * @param tripId - UUID of the trip
 * @returns Array of TripManualExpense objects
 * @throws PostgrestError if the query fails
 */
export async function fetchManualExpenses(tripId: string): Promise<TripManualExpense[]> {
  const { data, error } = await supabase
    .from('trip_manual_expenses')
    .select('*')
    .eq('trip_id', tripId)
    .order('created_at', { ascending: true })
  if (error) throw error
  return data ?? []
}

/**
 * Inserts a new manual expense row.
 * @param expense - Expense data excluding auto-generated `id` and `created_at`
 * @throws PostgrestError if the insert fails
 */
export async function addManualExpense(
  expense: Omit<TripManualExpense, 'id' | 'created_at'>,
): Promise<void> {
  const { error } = await supabase
    .from('trip_manual_expenses')
    .insert(expense)
  if (error) throw error
}

/**
 * Deletes a manual expense row by its primary key.
 * @param expenseId - UUID of the trip_manual_expenses row
 * @throws PostgrestError if the delete fails
 */
export async function deleteManualExpense(expenseId: string): Promise<void> {
  const { error } = await supabase
    .from('trip_manual_expenses')
    .delete()
    .eq('id', expenseId)
  if (error) throw error
}
