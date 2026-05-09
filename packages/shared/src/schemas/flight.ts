import { z } from 'zod';
import type { Flight, FlightData, FlightOption, FlightDetailsType } from '../types';

export const flightDataSchema = z.object({
  airline: z.string(),
  airline_logo: z.string().nullable().optional(),
  flight_number: z.string().nullable(),
  origin_iata: z.string(),
  origin_name: z.string().nullable(),
  dest_iata: z.string(),
  dest_name: z.string().nullable(),
  departure_at: z.string().nullable(),
  arrival_at: z.string().nullable(),
  price: z.number().nullable(),
  currency: z.string().nullable(),
  cabin_class: z.string().nullable(),
  booking_ref: z.string().nullable(),
  offer_id: z.string().nullable(),
});

const _fd: FlightData = {} as z.infer<typeof flightDataSchema>;
void _fd;

export const flightSchema = z.object({
  id: z.string(),
  trip_id: z.string(),
  data: flightDataSchema,
  created_at: z.string(),
});

const _f: Flight = {} as z.infer<typeof flightSchema>;
void _f;

export const flightOptionSchema = z.object({
  id: z.string(),
  airline: z.string(),
  airlineLogo: z.string(),
  flightNumber: z.string(),
  aircraft: z.string(),
  departure: z.object({ time: z.string(), airport: z.string(), terminal: z.string() }),
  arrival: z.object({ time: z.string(), airport: z.string(), terminal: z.string(), nextDay: z.boolean().optional() }),
  duration: z.string(),
  stops: z.number(),
  layover: z.object({ airport: z.string(), duration: z.string() }).optional(),
  fareClass: z.string(),
  price: z.object({ base: z.number(), taxes: z.number(), total: z.number() }),
  baggage: z.object({ carryOn: z.boolean(), checked: z.number(), checkedFee: z.number() }),
  seatPitch: z.string(),
  seatWidth: z.string(),
  amenities: z.object({ wifi: z.boolean(), power: z.boolean(), meals: z.boolean(), entertainment: z.boolean() }),
  cancellation: z.object({ refundable: z.boolean(), changeFee: z.number(), policy: z.string() }),
  onTime: z.number(),
  co2: z.number(),
  co2Avg: z.number(),
  milesEarned: z.number(),
  alliance: z.string(),
  badge: z.string().nullable(),
});

const _fo: FlightOption = {} as z.infer<typeof flightOptionSchema>;
void _fo;

export const flightDetailsSchema = z.object({
  confirmationNumber: z.string(),
  pnr: z.string(),
  ticketNumbers: z.array(z.string()),
  fareClass: z.string(),
  fareType: z.string(),
  baggageAllowance: z.object({ carryOn: z.string(), checked: z.string(), fees: z.number() }),
  cancellationPolicy: z.string(),
  changePolicy: z.string(),
  refundPolicy: z.string(),
  checkInUrl: z.string(),
  checkInOpens: z.string(),
});

const _fdt: FlightDetailsType = {} as z.infer<typeof flightDetailsSchema>;
void _fdt;

// Inbound — flight search query
export const flightSearchQuerySchema = z.object({
  origin: z.string().min(2).max(10),
  destination: z.string().min(2).max(10),
  departure_date: z.string(),
  return_date: z.string().optional(),
  travelers: z.coerce.number().int().min(1).max(20).default(1),
  cabin: z.enum(['economy', 'premium', 'business', 'first']).optional(),
});
export type FlightSearchQuery = z.infer<typeof flightSearchQuerySchema>;
