'use client'

import { use } from 'react'

export default function Packing({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  return <div className="p-6 text-gray-400">Packing list — loading new version...</div>
}
