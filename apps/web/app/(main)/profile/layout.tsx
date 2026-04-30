'use client'

import { AuthGuard } from '@/components/auth/AuthGuard'

export default function ProfileLayout({ children }: { children: React.ReactNode }) {
  return <AuthGuard>{children}</AuthGuard>
}
