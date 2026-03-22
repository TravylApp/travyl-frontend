import type { PackingCategory } from '@travyl/shared'

export const CATEGORY_LABELS: Record<PackingCategory, string> = {
  clothing: 'Clothing',
  toiletries: 'Toiletries',
  electronics: 'Electronics',
  documents: 'Documents',
  accessories: 'Accessories',
  essentials: 'Essentials',
}

export function stringToColor(str: string): string {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash)
  }
  const colors = ['#7c3aed', '#059669', '#d97706', '#dc2626', '#2563eb', '#7c3aed']
  return colors[Math.abs(hash) % colors.length]
}
