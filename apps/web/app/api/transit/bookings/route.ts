import { NextRequest, NextResponse } from 'next/server';
import { parseJsonBody } from '@/lib/zod-helpers';
import { z } from '@travyl/shared';

const API_URL = process.env.NEXT_PUBLIC_RECOMMENDATION_API_URL;

const bookTransitBodySchema = z.object({
  trip_id: z.string().min(1),
  origin_lat: z.number(),
  origin_lng: z.number(),
  dest_lat: z.number(),
  dest_lng: z.number(),
  mode: z.string().optional(),
  departure_time: z.string().optional(),
  passengers: z.number().int().min(1).max(20).default(1),
}).passthrough();

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (!authHeader) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const searchParams = req.nextUrl.searchParams;
  const response = await fetch(`${API_URL}/transit/bookings?${searchParams.toString()}`, {
    headers: { authorization: authHeader },
  });
  return NextResponse.json(await response.json(), { status: response.status });
}

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (!authHeader) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const parsed = await parseJsonBody(req, bookTransitBodySchema);
  if (!parsed.ok) return parsed.response;
  const response = await fetch(`${API_URL}/transit/book`, {
    method: 'POST',
    headers: { authorization: authHeader, 'content-type': 'application/json' },
    body: JSON.stringify(parsed.data),
  });
  return NextResponse.json(await response.json(), { status: response.status });
}
