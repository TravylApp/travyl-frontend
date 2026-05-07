/**
 * @module viewmodels
 * Barrel export for all shared view model modules.
 * Import from `@travyl/shared` rather than referencing sub-modules directly.
 */

export {
  getTripStatusDisplay,
  getTripDateRange,
  getTravelersLabel,
  getTripBudgetDisplay,
  buildTripCardViewModel,
  type TripStatusDisplay,
  type TripDateRangeDisplay,
  type TripBudgetDisplay,
  type TripCardViewModel,
} from './tripViewModel';

export {
  buildItineraryDayViewModel,
  buildFlightViewModel,
  buildHotelViewModel,
  buildCarViewModel,
  type ActivityViewModel,
  type TimeGroup,
  type ItineraryDayViewModel,
  type FlightViewModel,
  type HotelViewModel,
  type CarViewModel,
} from './itineraryViewModel';

export {
  buildBudgetSummary,
  type BudgetCategory,
  type BudgetSummary,
} from './budgetViewModel';

export {
  buildTransitViewModel,
  type TransitViewModel,
} from './transitViewModel';
