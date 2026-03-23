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

export function mapActivityToBudgetCategory(activityCategory: string): string {
  return CATEGORY_MAP[activityCategory.toLowerCase()] ?? 'other'
}
