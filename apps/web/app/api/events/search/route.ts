import { NextRequest, NextResponse } from 'next/server'
import { getRequiredParams, getOptionalParam, proxyToBackend } from '@/lib/api-utils'

export async function GET(req: NextRequest) {
  const params = getRequiredParams(req, 'city')
  if (params instanceof Response) return params

  const extra: Record<string, string> = {
    city: params.city,
  }

  // Country is optional — backend should handle missing country gracefully
  const country = getOptionalParam(req, 'country', '')
  if (country) extra.country = country

  // Dates are optional — if missing, default to next 30 days
  const startDate = getOptionalParam(req, 'start_date', '')
  const endDate = getOptionalParam(req, 'end_date', '')
  if (startDate) {
    extra.start_date = startDate
  } else {
    extra.start_date = new Date().toISOString().split('T')[0]
  }
  if (endDate) {
    extra.end_date = endDate
  } else {
    const d = new Date()
    d.setDate(d.getDate() + 30)
    extra.end_date = d.toISOString().split('T')[0]
  }

  return proxyToBackend('/api/events/search', req, { params: extra })
}
