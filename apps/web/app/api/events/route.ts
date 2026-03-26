import { NextRequest } from 'next/server'
import { getRequiredParams, getOptionalParam, proxyToBackend } from '@/lib/api-utils'

export async function GET(req: NextRequest) {
  const params = getRequiredParams(req, 'city')
  if (params instanceof Response) return params

  const start_date = getOptionalParam(req, 'start', '')
  const end_date = getOptionalParam(req, 'end', '')
  const country = getOptionalParam(req, 'country', '')

  const queryParams: Record<string, string> = { city: params.city }
  if (country) queryParams.country = country
  if (start_date) queryParams.start_date = start_date
  if (end_date) queryParams.end_date = end_date

  return proxyToBackend('/api/events/search', req, { params: queryParams })
}
