'use client'

import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuthStore } from '@travyl/shared'

interface Props {
  children: React.ReactNode
}

export function AuthGuard({ children }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const user = useAuthStore((s) => s.user)
  const loading = useAuthStore((s) => s.loading)

  useEffect(() => {
    if (loading) return
    if (!user) {
      router.replace(`/login?next=${encodeURIComponent(pathname)}`)
    }
  }, [loading, user, router, pathname])

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return <>{children}</>
}
