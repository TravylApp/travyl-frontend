export const PLACE_CARD_SIZES = {
  compact: { width: 175, height: 210 },
  standard: { width: 280, height: 380 },
  full: { width: 0, height: 420 }, // width = parent
} as const;

export type PlaceCardSize = keyof typeof PLACE_CARD_SIZES;
