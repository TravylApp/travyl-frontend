/**
 * @module budgetMapping
 * Maps raw activity category strings to the canonical budget categories used
 * in the budget summary UI (flights, hotels, food, activities, transport, shopping, other).
 * Used by `buildBudgetSummary` and the budget breakdown components.
 */

/**
 * Lookup table from activity category (lowercase) → budget display category.
 * Categories not listed here fall back to "other".
 */
const CATEGORY_MAP: Record<string, string> = {
  flight: 'flights',
  hotel: 'hotels',
  accommodation: 'hotels',
  restaurant: 'food',
  food: 'food',
  dining: 'food',
  cafe: 'food',
  bar: 'food',
  tour: 'activities',
  museum: 'activities',
  attraction: 'activities',
  entertainment: 'activities',
  sightseeing: 'activities',
  transport: 'transport',
  car: 'transport',
  bus: 'transport',
  train: 'transport',
  taxi: 'transport',
  shopping: 'shopping',
}

/**
 * Maps an activity category string to its corresponding budget display category.
 * The lookup is case-insensitive. Unknown categories return `"other"`.
 *
 * @param activityCategory - Raw activity category (e.g. "flight", "museum", "cafe")
 * @returns Budget category string (e.g. "flights", "activities", "food", "other")
 * @example mapActivityToBudgetCategory("flight")   // → "flights"
 * @example mapActivityToBudgetCategory("museum")   // → "activities"
 * @example mapActivityToBudgetCategory("spa")      // → "other"
 */
export function mapActivityToBudgetCategory(activityCategory: string): string {
  return CATEGORY_MAP[activityCategory.toLowerCase()] ?? 'other'
}
