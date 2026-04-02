import { NextRequest } from 'next/server'
import { getRequiredParams, getOptionalParam, proxyToBackend } from '@/lib/api-utils'

export async function GET(req: NextRequest) {
  const params = getRequiredParams(req, 'city', 'country')
  if (params instanceof Response) return params

  const extra: Record<string, string> = {
    city: params.city,
    country: params.country,
  }

  const startDate = getOptionalParam(req, 'start_date', '')
  const endDate = getOptionalParam(req, 'end_date', '')
  if (startDate) extra.start_date = startDate
  if (endDate) extra.end_date = endDate

  return proxyToBackend('/api/events/search', req, { params: extra })
}
