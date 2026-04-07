import { NextRequest } from 'next/server'
import { getRequiredParams, proxyToBackend } from '@/lib/api-utils'

export async function GET(req: NextRequest) {
  const params = getRequiredParams(req, 'destination', 'startDate', 'endDate')
  if (params instanceof Response) return params

  return proxyToBackend('/events', req, { params })
}
