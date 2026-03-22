'use client'

import { use } from 'react'
import { PackingPage } from '@/components/packing/PackingPage'

export default function Packing({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  return <PackingPage tripId={id} />
}
