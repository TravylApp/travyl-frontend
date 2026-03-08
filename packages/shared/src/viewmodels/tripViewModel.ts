import type { Trip } from '../types';
import { TripStatusColors } from '../config/colors';
import { formatCurrency } from '../utils';

// ─── Status ─────────────────────────────────────────────────────────

export interface TripStatusDisplay {
  label: string;
  bgColor: string;
  textColor: string;
}

export function getTripStatusDisplay(status: Trip['status']): TripStatusDisplay {
  const colors = TripStatusColors[status] ?? TripStatusColors.planning;
  const label = status.charAt(0).toUpperCase() + status.slice(1);
  return { label, bgColor: colors.bg, textColor: colors.text };
}

// ─── Date range ─────────────────────────────────────────────────────

export interface TripDateRangeDisplay {
  short: string;
  full: string;
  nights: number;
  nightsLabel: string;
}

export function getTripDateRange(trip: Pick<Trip, 'start_date' | 'end_date'>): TripDateRangeDisplay {
  const start = new Date(trip.start_date);
  const end = new Date(trip.end_date);
  const ms = end.getTime() - start.getTime();
  const nights = Math.max(0, Math.round(ms / (1000 * 60 * 60 * 24)));

  const shortFmt = (d: Date) =>
    d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const fullFmt = (d: Date) =>
    d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  return {
    short: `${shortFmt(start)} - ${shortFmt(end)}`,
    full: `${fullFmt(start)} - ${fullFmt(end)}`,
    nights,
    nightsLabel: nights === 1 ? '1 night' : `${nights} nights`,
  };
}

// ─── Travelers ──────────────────────────────────────────────────────

export function getTravelersLabel(count: number): string {
  if (count <= 0) return 'No travelers';
  if (count === 1) return '1 traveler';
  return `${count} travelers`;
}

// ─── Budget ─────────────────────────────────────────────────────────

export interface TripBudgetDisplay {
  formatted: string;
  hasBudget: boolean;
}

export function getTripBudgetDisplay(
  budget: Trip['budget'],
  currency: Trip['currency'],
): TripBudgetDisplay {
  if (budget == null || budget <= 0) {
    return { formatted: 'No budget set', hasBudget: false };
  }
  return { formatted: formatCurrency(budget, currency), hasBudget: true };
}

// ─── Combined card view model ───────────────────────────────────────

export interface TripCardViewModel {
  id: string;
  title: string;
  destination: string;
  status: TripStatusDisplay;
  dateRange: TripDateRangeDisplay;
  travelersLabel: string;
  budget: TripBudgetDisplay;
  isShared: boolean;
}

export function buildTripCardViewModel(trip: Trip): TripCardViewModel {
  return {
    id: trip.id,
    title: trip.title,
    destination: trip.destination,
    status: getTripStatusDisplay(trip.status),
    dateRange: getTripDateRange(trip),
    travelersLabel: getTravelersLabel(trip.travelers),
    budget: getTripBudgetDisplay(trip.budget, trip.currency),
    isShared: trip.is_shared,
  };
}
