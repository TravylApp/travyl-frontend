import { PACKING_CATEGORIES } from '@travyl/shared'

const STATIC_LABELS: Record<string, string> = {
  clothing: 'Clothing',
  toiletries: 'Toiletries',
  electronics: 'Electronics',
  documents: 'Documents',
  accessories: 'Accessories',
  essentials: 'Essentials',
}

export function getCategoryLabel(category: string): string {
  if (STATIC_LABELS[category]) return STATIC_LABELS[category]
  return category
    .split(/[-_\s]+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ')
}

export function isStaticCategory(category: string): boolean {
  return (PACKING_CATEGORIES as readonly string[]).includes(category)
}

export function stringToColor(str: string): string {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash)
  }
  const colors = ['#7c3aed', '#059669', '#d97706', '#dc2626', '#2563eb', '#7c3aed']
  return colors[Math.abs(hash) % colors.length]
}
