import { NextRequest } from 'next/server'
import { proxyToBackend } from '@/lib/api-utils'

export async function POST(req: NextRequest) {
  return proxyToBackend('/interact', req)
}
