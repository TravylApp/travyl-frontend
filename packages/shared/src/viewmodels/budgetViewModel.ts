/**
 * @module budgetViewModel
 * Budget presentation logic for the trip overview budget tab.
 * Aggregates costs across activities, flights, and hotels, converts all amounts
 * to the trip's display currency, and produces a `BudgetSummary` with per-category
 * breakdowns ready for rendering.
 *
 * Used by the web BudgetTab component and the mobile budget screen.
 */

import type { ItineraryDayWithActivities, Flight, Hotel } from '../types';
import { formatCurrency } from '../utils';
import { convertToTripCurrency } from '../utils/currency';

/**
 * A single line item in the budget breakdown, representing one cost category.
 */
export interface BudgetCategory {
  /** Display label for the category (e.g. "Flights", "Hotels", "Activities") */
  label: string;
  /** Total cost in the trip's display currency */
  amount: number;
  /** Pre-formatted display string (e.g. "$1,234") */
  formatted: string;
}

/**
 * Complete budget summary for a trip, produced by {@link buildBudgetSummary}.
 * Contains the grand total and an array of per-category breakdowns.
 */
export interface BudgetSummary {
  /** Grand total across all categories, in the trip's display currency */
  total: number;
  /** Pre-formatted grand total string (e.g. "$3,456") */
  totalFormatted: string;
  /** Per-category breakdowns (only categories with non-zero amounts are included) */
  categories: BudgetCategory[];
  /** ISO 4217 currency code for all amounts in this summary */
  currency: string;
}

/**
 * Builds a complete `BudgetSummary` from the trip's itinerary data.
 * Aggregates estimated costs from activities, flight prices, and hotel prices,
 * converting each amount to the target display currency using the provided
 * exchange rate table.
 *
 * For hotels with no `total_price`, the nightly rate is multiplied by the
 * number of nights (check-out − check-in). Only categories with a non-zero
 * total are included in the returned `categories` array.
 *
 * @param days - Itinerary days with their associated activity records
 * @param flights - Flight records for the trip
 * @param hotels - Hotel records for the trip
 * @param currency - ISO 4217 code for the target display currency (default: "USD")
 * @param rates - Exchange rate table (currency code → rate) or null if unavailable;
 *                when null, amounts are used as-is without conversion
 * @returns A fully computed `BudgetSummary` ready for rendering
 * @example
 * const summary = buildBudgetSummary(days, flights, hotels, "EUR", rates)
 * // summary.totalFormatted → "€2,450"
 * // summary.categories → [{ label: "Flights", amount: 800, formatted: "€800" }, ...]
 */
export function buildBudgetSummary(
  days: ItineraryDayWithActivities[],
  flights: Flight[],
  hotels: Hotel[],
  currency = 'USD',
  rates: Record<string, number> | null = null,
): BudgetSummary {
  // Sum activity costs
  let activitiesCost = 0;
  for (const day of days) {
    for (const activity of day.activities) {
      if (activity.estimated_cost != null) {
        const convertedCost = convertToTripCurrency(activity.estimated_cost, activity.currency, currency, rates);
        activitiesCost += convertedCost;
      }
    }
  }

  // Sum flight prices
  let flightsCost = 0;
  for (const flight of flights) {
    if (flight.data.price != null) {
      const convertedPrice = convertToTripCurrency(flight.data.price, flight.data.currency ?? currency, currency, rates);
      flightsCost += convertedPrice;
    }
  }

  // Sum hotel prices
  let hotelsCost = 0;
  for (const hotel of hotels) {
    if (hotel.data.total_price != null) {
      const convertedTotal = convertToTripCurrency(hotel.data.total_price, hotel.data.currency ?? currency, currency, rates);
      hotelsCost += convertedTotal;
    } else if (hotel.data.price_per_night != null) {
      const checkIn = new Date(hotel.data.check_in + 'T00:00:00');
      const checkOut = new Date(hotel.data.check_out + 'T00:00:00');
      const nights = Math.max(1, Math.round((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24)));
      const convertedNightly = convertToTripCurrency(hotel.data.price_per_night, hotel.data.currency ?? currency, currency, rates);
      hotelsCost += convertedNightly * nights;
    }
  }

  const total = activitiesCost + flightsCost + hotelsCost;

  const categories: BudgetCategory[] = [];
  if (flightsCost > 0) {
    categories.push({ label: 'Flights', amount: flightsCost, formatted: formatCurrency(flightsCost, currency) });
  }
  if (hotelsCost > 0) {
    categories.push({ label: 'Hotels', amount: hotelsCost, formatted: formatCurrency(hotelsCost, currency) });
  }
  if (activitiesCost > 0) {
    categories.push({ label: 'Activities', amount: activitiesCost, formatted: formatCurrency(activitiesCost, currency) });
  }

  return {
    total,
    totalFormatted: formatCurrency(total, currency),
    categories,
    currency,
  };
}
