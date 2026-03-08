import type { ItineraryDayWithActivities, Flight, Hotel } from '../types';
import { formatCurrency } from '../utils';

export interface BudgetCategory {
  label: string;
  amount: number;
  formatted: string;
}

export interface BudgetSummary {
  total: number;
  totalFormatted: string;
  categories: BudgetCategory[];
  currency: string;
}

export function buildBudgetSummary(
  days: ItineraryDayWithActivities[],
  flights: Flight[],
  hotels: Hotel[],
  currency = 'USD',
): BudgetSummary {
  // Sum activity costs
  let activitiesCost = 0;
  for (const day of days) {
    for (const activity of day.activities) {
      if (activity.estimated_cost != null) {
        activitiesCost += activity.estimated_cost;
      }
    }
  }

  // Sum flight prices
  let flightsCost = 0;
  for (const flight of flights) {
    if (flight.data.price != null) {
      flightsCost += flight.data.price;
    }
  }

  // Sum hotel prices
  let hotelsCost = 0;
  for (const hotel of hotels) {
    if (hotel.data.total_price != null) {
      hotelsCost += hotel.data.total_price;
    } else if (hotel.data.price_per_night != null) {
      const checkIn = new Date(hotel.data.check_in + 'T00:00:00');
      const checkOut = new Date(hotel.data.check_out + 'T00:00:00');
      const nights = Math.max(1, Math.round((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24)));
      hotelsCost += hotel.data.price_per_night * nights;
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
