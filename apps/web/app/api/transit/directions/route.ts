import { NextRequest, NextResponse } from 'next/server';
import { parseQuery } from '@/lib/zod-helpers';
import { z } from '@travyl/shared';

const API_URL = process.env.NEXT_PUBLIC_RECOMMENDATION_API_URL;

const directionsQuerySchema = z.object({
  origin_lat: z.coerce.number().min(-90).max(90),
  origin_lng: z.coerce.number().min(-180).max(180),
  dest_lat: z.coerce.number().min(-90).max(90),
  dest_lng: z.coerce.number().min(-180).max(180),
  mode: z.string().optional(),
  departure_time: z.string().optional(),
});

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (!authHeader) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const parsed = parseQuery(req, directionsQuerySchema);
  if (!parsed.ok) return parsed.response;
  const searchParams = req.nextUrl.searchParams;

  try {
    const response = await fetch(
      `${API_URL}/transit/directions?${searchParams.toString()}`,
      { headers: { authorization: authHeader } }
    );

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      let message = 'Transit search failed';
      try { message = JSON.parse(body).error || message; } catch { /* use default */ }
      return NextResponse.json({ error: message }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('[transit-directions-proxy] error:', error);
    return NextResponse.json({ error: 'Transit search failed' }, { status: 502 });
  }
}
