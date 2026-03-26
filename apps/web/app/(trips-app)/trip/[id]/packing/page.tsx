'use client'

import { use } from 'react'
import { PackingPage } from '@/components/packing'

export default function PackingRoute({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  return <PackingPage tripId={id} />
}
