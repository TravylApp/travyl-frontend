import { NextRequest } from 'next/server'
import { getRequiredParams, getOptionalParam, proxyToBackend } from '@/lib/api-utils'

export async function GET(req: NextRequest) {
  const params = getRequiredParams(req, 'origin', 'destination', 'date')
  if (params instanceof Response) return params

  const extra: Record<string, string> = {
    origin: params.origin,
    destination: params.destination,
    departure_date: params.date,
  }

  // Backend requires country params — pass through or default
  const originCountry = getOptionalParam(req, 'origin_country', 'US')
  const destCountry = getOptionalParam(req, 'destination_country', '')
  extra.origin_country = originCountry
  // If destination_country not provided, use destination as-is (backend can resolve)
  extra.destination_country = destCountry || params.destination

  const returnDate = getOptionalParam(req, 'return', '')
  if (returnDate) extra.return_date = returnDate

  const passengers = getOptionalParam(req, 'passengers', '1')
  extra.passengers = passengers

  const cabin = getOptionalParam(req, 'cabin', '')
  if (cabin) extra.travel_class = cabin

  return proxyToBackend('/api/flights/search', req, { params: extra })
}
