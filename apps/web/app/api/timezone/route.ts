import { NextRequest, NextResponse } from 'next/server'

// TimeZoneDB — timezone conversion for multi-city trips
// Free, unlimited
// Docs: https://timezonedb.com/references/get-time-zone

const API_KEY = process.env.TIMEZONEDB_API_KEY || ''

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams
  const lat = sp.get('lat')
  const lng = sp.get('lng')
  const from = sp.get('from') // source timezone (e.g., "America/New_York")
  const to = sp.get('to') // target timezone (e.g., "Europe/Paris")
  const time = sp.get('time') // optional unix timestamp

  // Mode 1: Get timezone by coordinates
  if (lat && lng) {
    try {
      // Use WorldTimeAPI (free, no key) as primary
      const res = await fetch(
        `https://worldtimeapi.org/api/timezone`,
        { next: { revalidate: 3600 } }
      )

      // Use Nominatim + timezone lookup via coordinates
      const tzRes = await fetch(
        `https://timeapi.io/api/timezone/coordinate?latitude=${lat}&longitude=${lng}`,
        { next: { revalidate: 3600 } }
      )

      if (tzRes.ok) {
        const data = await tzRes.json()
        return NextResponse.json({
          timezone: data.timeZone,
          currentTime: data.currentLocalTime,
          utcOffset: data.currentUtcOffset?.totalSeconds
            ? `UTC${data.currentUtcOffset.totalSeconds >= 0 ? '+' : ''}${Math.floor(data.currentUtcOffset.totalSeconds / 3600)}`
            : null,
          hasDST: data.hasDayLightSaving ?? null,
        })
      }

      // Fallback: TimeZoneDB (requires API key)
      if (API_KEY) {
        const tzdbRes = await fetch(
          `https://api.timezonedb.com/v2.1/get-time-zone?key=${API_KEY}&format=json&by=position&lat=${lat}&lng=${lng}`,
          { next: { revalidate: 3600 } }
        )
        if (tzdbRes.ok) {
          const data = await tzdbRes.json()
          if (data.status === 'OK') {
            return NextResponse.json({
              timezone: data.zoneName,
              currentTime: data.formatted,
              utcOffset: `UTC${data.gmtOffset >= 0 ? '+' : ''}${Math.floor(data.gmtOffset / 3600)}`,
              abbreviation: data.abbreviation,
              hasDST: data.dst === '1',
            })
          }
        }
      }

      return NextResponse.json({ error: 'Could not determine timezone' }, { status: 404 })
    } catch {
      return NextResponse.json({ error: 'Timezone service unavailable' }, { status: 500 })
    }
  }

  // Mode 2: Convert time between timezones
  if (from && to) {
    try {
      const timestamp = time || String(Math.floor(Date.now() / 1000))
      const res = await fetch(
        `https://timeapi.io/api/conversion/converttimezone`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fromTimeZone: from,
            dateTime: new Date(parseInt(timestamp) * 1000).toISOString().slice(0, 19),
            toTimeZone: to,
          }),
        }
      )

      if (res.ok) {
        const data = await res.json()
        return NextResponse.json({
          from: { timezone: from, time: data.originalDateTime },
          to: { timezone: to, time: data.conversionResult?.dateTime },
          offset: data.conversionResult?.offset,
        })
      }

      return NextResponse.json({ error: 'Conversion failed' }, { status: 500 })
    } catch {
      return NextResponse.json({ error: 'Timezone conversion unavailable' }, { status: 500 })
    }
  }

  return NextResponse.json({ error: 'Missing lat/lng or from/to parameters' }, { status: 400 })
}
