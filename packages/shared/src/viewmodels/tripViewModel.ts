/**
 * @module tripViewModel
 * Trip presentation logic for trip cards and list views.
 * Transforms raw `Trip` DB records into view-ready display objects with
 * pre-formatted status labels, date ranges, traveler counts, and budget strings.
 *
 * Used by the web Trips page, trip cards throughout the app, and the mobile
 * trips list screen.
 */

import type { Trip } from '../types';
import { TripStatusColors } from '../config/colors';
import { formatCurrency } from '../utils';

// ─── Status ─────────────────────────────────────────────────────────

/**
 * View-ready display object for a trip's status.
 * Colors are sourced from the design system's `TripStatusColors` config.
 */
export interface TripStatusDisplay {
  /** Human-readable status label (e.g. "Planning", "Confirmed", "Completed") */
  label: string;
  /** Background color hex string for the status badge */
  bgColor: string;
  /** Text color hex string for the status badge */
  textColor: string;
}

/**
 * Builds a `TripStatusDisplay` from a trip's status value.
 * Falls back to the "planning" color scheme for unknown statuses.
 *
 * @param status - Trip status value from the DB
 * @returns View-ready status display object with label and color tokens
 * @example getTripStatusDisplay("confirmed") // → { label: "Confirmed", bgColor: "...", textColor: "..." }
 */
export function getTripStatusDisplay(status: Trip['status']): TripStatusDisplay {
  const colors = TripStatusColors[status] ?? TripStatusColors.planning;
  const label = status.charAt(0).toUpperCase() + status.slice(1);
  return { label, bgColor: colors.bg, textColor: colors.text };
}

// ─── Date range ─────────────────────────────────────────────────────

/**
 * View-ready date range display for a trip, with both a compact and full format
 * and a computed nights count.
 */
export interface TripDateRangeDisplay {
  /** Compact date range (e.g. "Jun 1 - Jun 5") */
  short: string;
  /** Full date range with year (e.g. "Jun 1, 2024 - Jun 5, 2024") */
  full: string;
  /** Number of nights (end − start, minimum 0) */
  nights: number;
  /** Human-readable nights label (e.g. "4 nights", "1 night") */
  nightsLabel: string;
}

/**
 * Computes a formatted date range display from a trip's start and end dates.
 * Uses the local timezone (not UTC) so dates display correctly in the user's region.
 *
 * @param trip - Trip record with `start_date` and `end_date` ISO strings
 * @returns View-ready `TripDateRangeDisplay`
 * @example
 * getTripDateRange({ start_date: "2024-06-01", end_date: "2024-06-05" })
 * // → { short: "Jun 1 - Jun 5", full: "Jun 1, 2024 - Jun 5, 2024", nights: 4, nightsLabel: "4 nights" }
 */
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

/**
 * Returns a human-readable label for a traveler count.
 * @param count - Number of travelers
 * @returns Label string (e.g. "No travelers", "1 traveler", "3 travelers")
 * @example getTravelersLabel(0) // → "No travelers"
 * @example getTravelersLabel(2) // → "2 travelers"
 */
export function getTravelersLabel(count: number): string {
  if (count <= 0) return 'No travelers';
  if (count === 1) return '1 traveler';
  return `${count} travelers`;
}

// ─── Budget ─────────────────────────────────────────────────────────

/**
 * View-ready budget display for a trip card.
 */
export interface TripBudgetDisplay {
  /** Formatted budget string (e.g. "$2,500") or "No budget set" */
  formatted: string;
  /** True if the trip has a non-zero budget set */
  hasBudget: boolean;
}

/**
 * Builds a `TripBudgetDisplay` from a trip's budget and currency fields.
 * Returns a "No budget set" placeholder when budget is null or ≤ 0.
 *
 * @param budget - Trip budget amount, or null if unset
 * @param currency - ISO 4217 currency code for formatting
 * @returns View-ready budget display object
 * @example getTripBudgetDisplay(2500, "USD") // → { formatted: "$2,500", hasBudget: true }
 * @example getTripBudgetDisplay(null, "USD") // → { formatted: "No budget set", hasBudget: false }
 */
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

/**
 * Complete view model for a trip card in lists and dashboards.
 * Aggregates all display-ready fields in one object to avoid repeated
 * formatting calls in component render functions.
 */
export interface TripCardViewModel {
  /** Trip UUID */
  id: string;
  /** Trip title */
  title: string;
  /** Destination name */
  destination: string;
  /** Status badge display (label + colors) */
  status: TripStatusDisplay;
  /** Date range display strings and nights count */
  dateRange: TripDateRangeDisplay;
  /** Human-readable traveler count label */
  travelersLabel: string;
  /** Budget display string and hasBudget flag */
  budget: TripBudgetDisplay;
  /** True if the trip is visible to users other than the owner */
  isShared: boolean;
}

/**
 * Builds a complete `TripCardViewModel` from a raw `Trip` DB record.
 * Composes all the individual display helpers into a single view-ready object.
 *
 * @param trip - Raw Trip record from Supabase
 * @returns View-ready TripCardViewModel for rendering in trip list cards
 */
export function buildTripCardViewModel(trip: Trip): TripCardViewModel {
  return {
    id: trip.id,
    title: trip.title,
    destination: trip.destination,
    status: getTripStatusDisplay(trip.status),
    dateRange: getTripDateRange(trip),
    travelersLabel: getTravelersLabel(trip.travelers),
    budget: getTripBudgetDisplay(trip.budget, trip.currency),
    isShared: trip.visibility !== 'private',
  };
}
