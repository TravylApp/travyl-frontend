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

  // Backend needs country params — derive from city or pass through
  const originCountry = getOptionalParam(req, 'origin_country', '')
  const destCountry = getOptionalParam(req, 'destination_country', '')
  if (originCountry) extra.origin_country = originCountry
  if (destCountry) extra.destination_country = destCountry

  const returnDate = getOptionalParam(req, 'return', '')
  if (returnDate) extra.return_date = returnDate

  const passengers = getOptionalParam(req, 'passengers', '1')
  extra.passengers = passengers

  const cabin = getOptionalParam(req, 'cabin', '')
  if (cabin) extra.travel_class = cabin

  return proxyToBackend('/api/flights/search', req, { params: extra })
}
