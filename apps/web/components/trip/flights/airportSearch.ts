export interface Airport {
  iata: string
  name: string
  city: string
  country: string
  type: 'airport' | 'city'
}

export async function searchAirports(q: string): Promise<Airport[]> {
  if (q.length < 2) return []
  try {
    const res = await fetch(`/api/airports?q=${encodeURIComponent(q)}`)
    if (!res.ok) return []
    return res.json()
  } catch {
    return []
  }
}
