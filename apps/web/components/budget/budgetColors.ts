import { Gray } from '@travyl/shared'

export const CATEGORY_COLORS: Record<string, string> = {
  flights: '#6B8EAE',
  hotels: '#C4956A',
  food: 'var(--trip-base)',
  activities: '#7BA69E',
  transport: '#9B8EC4',
  shopping: '#8FB87A',
  other: Gray[400],
}

export function getCategoryColor(name: string): string {
  return CATEGORY_COLORS[name] ?? Gray[400]
}
