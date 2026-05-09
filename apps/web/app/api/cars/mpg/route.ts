import { NextRequest, NextResponse } from 'next/server'
import { checkOrigin, rateLimit } from '@/lib/api-utils'
import { parseJsonBody } from '@/lib/zod-helpers'
import { z } from '@travyl/shared'

const mpgBodySchema = z.object({
  vehicles: z.array(z.string().max(200)).max(50),
})

const FUEL_ECO_BASE = 'https://www.fueleconomy.gov/ws/rest'

const KNOWN_MAKES = [
  'ALFA ROMEO', 'ASTON MARTIN', 'AUDI', 'BENTLEY', 'BMW', 'BUICK', 'CADILLAC',
  'CHEVROLET', 'CHRYSLER', 'DODGE', 'FERRARI', 'FIAT', 'FORD', 'GMC', 'HONDA',
  'HYUNDAI', 'INFINITI', 'JAGUAR', 'JEEP', 'KIA', 'LAMBORGHINI', 'LAND ROVER',
  'LEXUS', 'LINCOLN', 'MASERATI', 'MAZDA', 'MCLAREN', 'MERCEDES-BENZ', 'MERCEDES',
  'MINI', 'MITSUBISHI', 'NISSAN', 'POLESTAR', 'PORSCHE', 'RAM', 'RIVIAN',
  'ROLLS-ROYCE', 'SUBARU', 'TESLA', 'TOYOTA', 'VOLKSWAGEN', 'VOLVO',
].sort((a, b) => b.length - a.length) // longest first

interface VehicleInfo {
  id: number
  year: number
}

interface VehicleMpg {
  mpg: number
  label: string
}

interface MpgCacheEntry {
  mpg: number | null
  label: string | null
  year: number | null
  ts: number
}

interface ResultEntry {
  mpg: number | null
  label: string | null
  year: number | null
}

const mpgCache = new Map<string, MpgCacheEntry>()
const CACHE_TTL = 24 * 60 * 60 * 1000 // 24 hours

function parseMakeModel(vehicle: string): { make: string; model: string } | null {
  const upper = vehicle.toUpperCase()
  for (const make of KNOWN_MAKES) {
    if (upper.startsWith(make)) {
      const model = vehicle.slice(make.length).trim()
      // Clean up model: remove common suffixes that won't match
      const clean = model
        .replace(/\s+\dWD?$/i, '')     // " AWD", " 4WD"
        .replace(/\s+\dL$/i, '')       // " 2.0L"
        .replace(/\s+Awd$/i, '')
        .replace(/^\s*-\s*/, '')       // leading dash
        .trim()
      if (clean) {
        return { make: make.charAt(0) + make.slice(1).toLowerCase(), model: clean }
      }
    }
  }
  return null
}

async function fetchVehicleInfo(make: string, model: string): Promise<VehicleInfo | null> {
  const url = `${FUEL_ECO_BASE}/vehicle/search?make=${encodeURIComponent(make)}&model=${encodeURIComponent(model)}`
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) })
    if (!res.ok) return null
    const text = await res.text()
    if (!text || text.trim().length < 2) return null
    let data: any[]
    try { data = JSON.parse(text) } catch { return null }
    if (!Array.isArray(data) || data.length === 0) return null
    // Prefer most recent year
    data.sort((a: any, b: any) => (b.year || 0) - (a.year || 0))
    const best = data[0]
    if (best.id == null) return null
    return { id: best.id, year: best.year ?? 0 }
  } catch {
    return null
  }
}

async function fetchVehicleMpg(vehicleId: number): Promise<VehicleMpg | null> {
  const url = `${FUEL_ECO_BASE}/vehicle/${vehicleId}`
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) })
    if (!res.ok) return null
    const text = await res.text()
    if (!text || text.trim().length < 2) return null
    let data: any
    try { data = JSON.parse(text) } catch { return null }
    // comb08 = combined MPG (gas), comb08 = combined MPGe (electric/hybrid)
    const comb08 = data?.comb08
    if (comb08 && typeof comb08 === 'number') {
      const fuelType = (data?.fuelType ?? '').toLowerCase()
      const label = fuelType.includes('electric')
        ? `${comb08} MPGe`
        : `${comb08} MPG`
      return { mpg: comb08, label }
    }
    return null
  } catch {
    return null
  }
}

export async function POST(req: NextRequest) {
  const blocked = checkOrigin(req) || rateLimit(req, 'cars-mpg', 30, 60_000)
  if (blocked) return blocked

  const parsed = await parseJsonBody(req, mpgBodySchema)
  if (!parsed.ok) return parsed.response
  const vehicles = parsed.data.vehicles
  if (vehicles.length === 0) {
    return NextResponse.json({ mpg: {} })
  }

  try {

    // Deduplicate
    const unique = [...new Set(vehicles)]
    const result: Record<string, ResultEntry> = {}

    const batch: { vehicle: string; make: string; model: string }[] = []

    for (const v of unique) {
      // Check cache
      const cached = mpgCache.get(v)
      if (cached && Date.now() - cached.ts < CACHE_TTL) {
        result[v] = { mpg: cached.mpg, label: cached.label, year: cached.year }
        continue
      }
      const parsed = parseMakeModel(v)
      if (!parsed) {
        mpgCache.set(v, { mpg: null, label: null, year: null, ts: Date.now() })
        result[v] = { mpg: null, label: null, year: null }
        continue
      }
      batch.push({ vehicle: v, ...parsed })
    }

    // Process in parallel (max 5 at a time)
    for (let i = 0; i < batch.length; i += 5) {
      const chunk = batch.slice(i, i + 5)
      await Promise.all(chunk.map(async (item) => {
        try {
          const info = await fetchVehicleInfo(item.make, item.model)
          if (!info) {
            mpgCache.set(item.vehicle, { mpg: null, label: null, year: null, ts: Date.now() })
            result[item.vehicle] = { mpg: null, label: null, year: null }
            return
          }
          const mpg = await fetchVehicleMpg(info.id)
          if (mpg) {
            mpgCache.set(item.vehicle, { mpg: mpg.mpg, label: mpg.label, year: info.year, ts: Date.now() })
            result[item.vehicle] = { mpg: mpg.mpg, label: mpg.label, year: info.year }
          } else {
            mpgCache.set(item.vehicle, { mpg: null, label: null, year: info.year, ts: Date.now() })
            result[item.vehicle] = { mpg: null, label: null, year: info.year }
          }
        } catch {
          result[item.vehicle] = { mpg: null, label: null, year: null }
        }
      }))
    }

    return NextResponse.json({ mpg: result })
  } catch (err) {
    console.error('[cars/mpg] error', err)
    return NextResponse.json({ error: 'MPG lookup failed', mpg: {} })
  }
}
