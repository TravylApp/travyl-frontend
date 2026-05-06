import {
  Plane, Building2, UtensilsCrossed, Compass, Car, ShoppingBag,
  MoreHorizontal, Wallet, type LucideIcon,
} from 'lucide-react';

export const CATEGORY_ICONS: Record<string, LucideIcon> = {
  Flights: Plane,
  Hotels: Building2,
  'Food & Dining': UtensilsCrossed,
  Activities: Compass,
  Transportation: Car,
  Shopping: ShoppingBag,
  Other: MoreHorizontal,
};

export function iconFor(category: string): LucideIcon {
  return CATEGORY_ICONS[category] ?? Wallet;
}
