import { NextRequest, NextResponse } from 'next/server'

// Exchange rates — real-time currency conversion
// Primary: Frankfurter API (free, no key, unlimited)
// Fallback: Open Exchange Rates (1,000 calls/mo with free key)

const OER_APP_ID = process.env.OPEN_EXCHANGE_RATES_APP_ID || ''

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams
  const base = sp.get('base') || 'USD'
  const target = sp.get('target') // specific currency code, or omit for all
  const amount = parseFloat(sp.get('amount') || '1')

  try {
    // Primary: Frankfurter (ECB data, no key, supports all major currencies)
    const fUrl = target
      ? `https://api.frankfurter.app/latest?from=${base}&to=${target}`
      : `https://api.frankfurter.app/latest?from=${base}`

    const fRes = await fetch(fUrl, { next: { revalidate: 3600 } })

    if (fRes.ok) {
      const data = await fRes.json()
      const rates = data.rates || {}

      if (target && rates[target] != null) {
        return NextResponse.json({
          base,
          target,
          rate: rates[target],
          converted: Math.round(amount * rates[target] * 100) / 100,
          amount,
          source: 'frankfurter',
          date: data.date,
        })
      }

      return NextResponse.json({
        base,
        rates,
        source: 'frankfurter',
        date: data.date,
      })
    }

    // Fallback: Open Exchange Rates
    if (OER_APP_ID) {
      const oerRes = await fetch(
        `https://openexchangerates.org/api/latest.json?app_id=${OER_APP_ID}&base=${base}`,
        { next: { revalidate: 3600 } }
      )

      if (oerRes.ok) {
        const data = await oerRes.json()
        const rates = data.rates || {}

        if (target && rates[target] != null) {
          return NextResponse.json({
            base,
            target,
            rate: rates[target],
            converted: Math.round(amount * rates[target] * 100) / 100,
            amount,
            source: 'openexchangerates',
          })
        }

        return NextResponse.json({
          base,
          rates,
          source: 'openexchangerates',
        })
      }
    }

    return NextResponse.json({ error: 'Exchange rate fetch failed' }, { status: 502 })
  } catch {
    return NextResponse.json({ error: 'Exchange rate service unavailable' }, { status: 500 })
  }
}
