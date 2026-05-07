import { describe, it, expect } from 'vitest'
import { mapSerpFlightToFlightData, type SerpFlight } from '../flightSearch'

const direct: SerpFlight = {
  id: 'best-0',
  tier: 'best',
  price: 480,
  type: 'Round trip',
  totalDuration: 360,
  stops: 0,
  airlineLogo: 'https://example.com/aa.png',
  carbonEmissions: null,
  legs: [{
    flightNumber: 'AA 100',
    airline: 'American Airlines',
    airlineLogo: 'https://example.com/aa.png',
    airplane: '777',
    travelClass: 'Economy',
    legroom: '32 in',
    duration: 360,
    overnight: false,
    departure: { airport: 'JFK', id: 'JFK', time: '2026-06-01 09:00' },
    arrival:   { airport: 'LHR', id: 'LHR', time: '2026-06-01 21:00' },
    extensions: [],
  }],
  layovers: [],
}

const oneStop: SerpFlight = {
  ...direct,
  id: 'other-2',
  tier: 'other',
  stops: 1,
  totalDuration: 600,
  legs: [
    {
      flightNumber: 'AA 100',
      airline: 'American Airlines',
      airlineLogo: 'https://example.com/aa.png',
      airplane: '777',
      travelClass: 'Economy',
      legroom: '32 in',
      duration: 240,
      overnight: false,
      departure: { airport: 'JFK', id: 'JFK', time: '2026-06-01 09:00' },
      arrival:   { airport: 'LAX', id: 'LAX', time: '2026-06-01 12:00' },
      extensions: [],
    },
    {
      flightNumber: 'BA 200',
      airline: 'British Airways',
      airlineLogo: 'https://example.com/ba.png',
      airplane: '787',
      travelClass: 'Economy',
      legroom: '31 in',
      duration: 600,
      overnight: true,
      departure: { airport: 'LAX', id: 'LAX', time: '2026-06-01 14:00' },
      arrival:   { airport: 'LHR', id: 'LHR', time: '2026-06-02 08:00' },
      extensions: [],
    },
  ],
  layovers: [{ duration: 120, airport: 'Los Angeles', id: 'LAX' }],
}

describe('mapSerpFlightToFlightData', () => {
  it('maps a direct flight 1:1', () => {
    const data = mapSerpFlightToFlightData(direct)
    expect(data.airline).toBe('American Airlines')
    expect(data.flight_number).toBe('AA 100')
    expect(data.origin_iata).toBe('JFK')
    expect(data.origin_name).toBe('JFK')
    expect(data.dest_iata).toBe('LHR')
    expect(data.dest_name).toBe('LHR')
    expect(data.departure_at).toBe('2026-06-01 09:00')
    expect(data.arrival_at).toBe('2026-06-01 21:00')
    expect(data.price).toBe(480)
    expect(data.currency).toBe('USD')
    expect(data.cabin_class).toBe('Economy')
    expect(data.booking_ref).toBeNull()
    expect(data.offer_id).toBe('best-0')
  })

  it('maps a 1-stop flight to first-leg origin → last-leg arrival (decision B)', () => {
    const data = mapSerpFlightToFlightData(oneStop)
    expect(data.airline).toBe('American Airlines')
    expect(data.flight_number).toBe('AA 100')
    expect(data.origin_iata).toBe('JFK')
    expect(data.dest_iata).toBe('LHR')
    expect(data.departure_at).toBe('2026-06-01 09:00')
    expect(data.arrival_at).toBe('2026-06-02 08:00')
    expect(data.cabin_class).toBe('Economy')
    expect(data.offer_id).toBe('other-2')
  })

  it('returns null fields when legs array is empty', () => {
    const data = mapSerpFlightToFlightData({ ...direct, legs: [] })
    expect(data.airline).toBe('')
    expect(data.flight_number).toBeNull()
    expect(data.origin_iata).toBe('')
    expect(data.dest_iata).toBe('')
    expect(data.departure_at).toBeNull()
    expect(data.arrival_at).toBeNull()
  })

  it('preserves null price', () => {
    const data = mapSerpFlightToFlightData({ ...direct, price: null as unknown as number })
    expect(data.price).toBeNull()
    expect(data.currency).toBeNull()
  })
})
