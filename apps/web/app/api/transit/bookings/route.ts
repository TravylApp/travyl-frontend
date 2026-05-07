import { NextRequest, NextResponse } from 'next/server';

const API_URL = process.env.NEXT_PUBLIC_RECOMMENDATION_API_URL;

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

  const body = await req.json();
  const response = await fetch(`${API_URL}/transit/book`, {
    method: 'POST',
    headers: { authorization: authHeader, 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  return NextResponse.json(await response.json(), { status: response.status });
}
