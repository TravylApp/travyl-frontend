import { NextRequest } from 'next/server'
import { getRequiredParams, getOptionalParam, proxyToBackend } from '@/lib/api-utils'

export async function GET(req: NextRequest) {
  const params = getRequiredParams(req, 'origin', 'destination', 'date')
  if (params instanceof Response) return params

  const return_date = getOptionalParam(req, 'return', '')
  const passengers = getOptionalParam(req, 'passengers', '1')
  const travel_class = getOptionalParam(req, 'cabin', 'economy')

  const queryParams: Record<string, string> = {
    origin: params.origin,
    destination: params.destination,
    departure_date: params.date,
    passengers,
    travel_class,
  }
  if (return_date) queryParams.return_date = return_date

  return proxyToBackend('/api/flights/search', req, { params: queryParams })
}
