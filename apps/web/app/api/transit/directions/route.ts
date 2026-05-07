import { NextRequest, NextResponse } from 'next/server';

const API_URL = process.env.NEXT_PUBLIC_RECOMMENDATION_API_URL;

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (!authHeader) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const searchParams = req.nextUrl.searchParams;
  if (!searchParams.get('origin_lat') || !searchParams.get('dest_lat')) {
    return NextResponse.json({ error: 'Missing required params' }, { status: 400 });
  }

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
