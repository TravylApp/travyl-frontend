export {
  Blue,
  Gray,
  Emerald,
  Amber,
  Red,
  Orange,
  Sky,
  Violet,
  Indigo,
  Cyan,
  Teal,
  Slate,
  Navy,
  Brand,
  TripStatusColors,
  hexToRgba,
  COLORS,
  TAB_COLORS,
  TIME_SECTION_COLORS,
  getTabColor,
} from './colors';

export type { ThemeTokens } from './colors';
export { LIGHT_TOKENS, DARK_TOKENS } from './colors';

export {
  TRIP_THEMES,
  THEME_ORDER,
  DEFAULT_ITINERARY_COLORS,
  generateThemeFromColor,
  resolveTheme,
  adjustBrightness,
} from './themes';
export type { TripTheme } from './themes';

export * from './homeData';
// homeData re-exports: HOW_IT_WORKS_STEPS, STEP1_*, STEP2_*, STEP3_*, FOOTER_COLUMNS, SOCIAL_LINKS, etc.

export { EASE_OUT_EXPO } from './animation';

export { PAPER_PLANE_VIEWBOX, PAPER_PLANE_PATHS } from './logo';

export * from './itineraryData';

export * from './mockItineraryData';

export * from './mockPlacesData';

export * from './mockTripsData';

export * from './mockLoginData';

export * from './mockProfileData';

export * from './mockTravelBoardsData';

export * from './mockFlightSearchData';

export * from './mockHotelSearchData';

export * from './activityDetails';

export * from './exploreData';
