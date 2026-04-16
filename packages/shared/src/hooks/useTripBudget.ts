'use client';

import { useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useItineraryDays } from './useItineraryDays'
import { useFlights } from './useFlights'
import { useHotels } from './useHotels'
import { useExchangeRates } from './useExchangeRates'
import {
  fetchBudgetCategories,
  upsertBudgetCategory,
  deleteBudgetCategory,
  fetchManualExpenses,
  addManualExpense,
  deleteManualExpense,
} from '../services/budgetService'
import { mapActivityToBudgetCategory } from '../utils/budgetMapping'
import { convertToTripCurrency } from '../utils/currency'
import { useAuthStore } from '../stores/authStore'
import type { TripBudgetCategory, TripManualExpense, BudgetCategoryData } from '../types'

// ─── Time Constants ─────────────────────────────────────────
const MS_PER_SECOND = 1000
const MS_PER_MINUTE = MS_PER_SECOND * 60
const MS_PER_HOUR = MS_PER_MINUTE * 60
const MS_PER_DAY = MS_PER_HOUR * 24
const MIN_NIGHTS = 1

export function useTripBudget(tripId: string | undefined, tripCurrency = 'USD') {
  const queryClient = useQueryClient()
  const user = useAuthStore((s) => s.user)

  // ─── Fetch existing trip data ──────────────────────────────
  const { data: days = [], isLoading: daysLoading } = useItineraryDays(tripId)
  const { data: flights = [], isLoading: flightsLoading } = useFlights(tripId)
  const { data: hotels = [], isLoading: hotelsLoading } = useHotels(tripId)
  const { rates, isLoading: ratesLoading, refetch: refetchRates } = useExchangeRates(tripCurrency)

  // ─── Fetch budget-specific data ────────────────────────────
  const categoriesQuery = useQuery({
    queryKey: ['budgetCategories', tripId],
    queryFn: () => fetchBudgetCategories(tripId!),
    enabled: !!tripId,
  })

  const expensesQuery = useQuery({
    queryKey: ['manualExpenses', tripId],
    queryFn: () => fetchManualExpenses(tripId!),
    enabled: !!tripId,
  })

  // ─── Compute category data ─────────────────────────────────
  const categories: BudgetCategoryData[] = useMemo(() => {
    const budgetCategories = categoriesQuery.data ?? []
    const manualExpenses = expensesQuery.data ?? []
    const costMap = new Map<string, { calendarItems: BudgetCategoryData['calendarItems']; manualTotal: number; manualExpenses: TripManualExpense[] }>()

    for (const cat of budgetCategories) {
      costMap.set(cat.category, { calendarItems: [], manualTotal: 0, manualExpenses: [] })
    }

    // Sum activity costs
    for (const day of days) {
      for (const activity of day.activities) {
        if (activity.estimated_cost == null) continue
        const budgetCat = mapActivityToBudgetCategory(activity.category)
        if (!costMap.has(budgetCat)) {
          costMap.set(budgetCat, { calendarItems: [], manualTotal: 0, manualExpenses: [] })
        }
        const entry = costMap.get(budgetCat)!
        const converted = convertToTripCurrency(activity.estimated_cost, activity.currency, tripCurrency, rates)
        entry.calendarItems.push({
          id: activity.id,
          name: activity.name,
          day: day.day_number,
          time: activity.start_time ?? undefined,
          cost: converted,
          originalCurrency: activity.currency !== tripCurrency ? activity.currency : undefined,
        })
      }
    }

    // Sum flight costs
    for (const flight of flights) {
      if (flight.data.price == null) continue
      if (!costMap.has('flights')) {
        costMap.set('flights', { calendarItems: [], manualTotal: 0, manualExpenses: [] })
      }
      const entry = costMap.get('flights')!
      const flightCurrency = flight.data.currency ?? tripCurrency
      const converted = convertToTripCurrency(flight.data.price, flightCurrency, tripCurrency, rates)
      entry.calendarItems.push({
        id: flight.id,
        name: `${flight.data.airline} ${flight.data.flight_number ?? ''} ${flight.data.origin_iata}→${flight.data.dest_iata}`.trim(),
        day: 0,
        cost: converted,
        originalCurrency: flightCurrency !== tripCurrency ? flightCurrency : undefined,
      })
    }

    // Sum hotel costs
    for (const hotel of hotels) {
      let cost = hotel.data.total_price
      if (cost == null && hotel.data.price_per_night != null) {
        const checkIn = new Date(hotel.data.check_in + 'T00:00:00')
        const checkOut = new Date(hotel.data.check_out + 'T00:00:00')
        const nights = Math.max(MIN_NIGHTS, Math.round((checkOut.getTime() - checkIn.getTime()) / MS_PER_DAY))
        cost = hotel.data.price_per_night * nights
      }
      if (cost == null) continue
      if (!costMap.has('hotels')) {
        costMap.set('hotels', { calendarItems: [], manualTotal: 0, manualExpenses: [] })
      }
      const entry = costMap.get('hotels')!
      const hotelCurrency = hotel.data.currency ?? tripCurrency
      const converted = convertToTripCurrency(cost, hotelCurrency, tripCurrency, rates)
      entry.calendarItems.push({
        id: hotel.id,
        name: hotel.data.name,
        day: 0,
        cost: converted,
        originalCurrency: hotelCurrency !== tripCurrency ? hotelCurrency : undefined,
      })
    }

    // Sum manual expenses grouped by category_id
    for (const expense of manualExpenses) {
      const cat = budgetCategories.find((c) => c.id === expense.category_id)
      if (!cat) continue
      if (!costMap.has(cat.category)) {
        costMap.set(cat.category, { calendarItems: [], manualTotal: 0, manualExpenses: [] })
      }
      const entry = costMap.get(cat.category)!
      const converted = convertToTripCurrency(expense.amount, expense.currency, tripCurrency, rates)
      entry.manualTotal += converted
      entry.manualExpenses.push(expense)
    }

    return budgetCategories.map((cat) => {
      const entry = costMap.get(cat.category) ?? { calendarItems: [], manualTotal: 0, manualExpenses: [] }
      const calendarTotal = entry.calendarItems.reduce((sum, item) => sum + item.cost, 0)
      const actual = calendarTotal + entry.manualTotal
      return {
        id: cat.id,
        name: cat.category,
        budgeted: cat.budgeted,
        actual,
        calendarItems: entry.calendarItems,
        manualExpenses: entry.manualExpenses,
        percentUsed: cat.budgeted > 0 ? (actual / cat.budgeted) * 100 : 0,
      }
    })
  }, [days, flights, hotels, expensesQuery.data, categoriesQuery.data, tripCurrency, rates])

  // ─── Derived totals ────────────────────────────────────────
  const totalBudgeted = categories.reduce((sum, c) => sum + c.budgeted, 0)
  const totalSpent = categories.reduce((sum, c) => sum + c.actual, 0)
  const remaining = totalBudgeted - totalSpent

  // ─── Mutations ─────────────────────────────────────────────
  const upsertCat = useMutation({
    mutationFn: (category: Partial<TripBudgetCategory>) =>
      upsertBudgetCategory({
        trip_id: tripId!,
        created_by: user!.id,
        category: '',
        ...category,
      } as TripBudgetCategory),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['budgetCategories', tripId] }),
  })

  const deleteCat = useMutation({
    mutationFn: (categoryId: string) => deleteBudgetCategory(categoryId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budgetCategories', tripId] })
      queryClient.invalidateQueries({ queryKey: ['manualExpenses', tripId] })
    },
  })

  const addExp = useMutation({
    mutationFn: (expense: Partial<TripManualExpense>) =>
      addManualExpense({
        trip_id: tripId!,
        created_by: user!.id,
        category_id: '',
        description: '',
        amount: 0,
        currency: tripCurrency,
        ...expense,
      } as Omit<TripManualExpense, 'id' | 'created_at'>),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['manualExpenses', tripId] }),
  })

  const deleteExp = useMutation({
    mutationFn: (expenseId: string) => deleteManualExpense(expenseId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['manualExpenses', tripId] }),
  })

  const isLoading = daysLoading || flightsLoading || hotelsLoading || categoriesQuery.isLoading || expensesQuery.isLoading

  return {
    categories,
    totalBudgeted,
    totalSpent,
    remaining,
    isLoading,
    error: categoriesQuery.error || expensesQuery.error,
    rates,
    ratesLoading,
    refetchRates,
    upsertCategory: upsertCat.mutate,
    deleteCategory: deleteCat.mutate,
    addExpense: addExp.mutate,
    deleteExpense: deleteExp.mutate,
  }
}
