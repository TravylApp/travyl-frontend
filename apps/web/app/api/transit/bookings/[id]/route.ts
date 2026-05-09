import { NextRequest, NextResponse } from 'next/server';
import { parseJsonBody } from '@/lib/zod-helpers';
import { z } from '@travyl/shared';

const API_URL = process.env.NEXT_PUBLIC_RECOMMENDATION_API_URL;

const updateBookingBodySchema = z.object({}).passthrough();

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authHeader = req.headers.get('authorization');
  if (!authHeader) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const parsed = await parseJsonBody(req, updateBookingBodySchema);
  if (!parsed.ok) return parsed.response;
  const { id } = await params;
  const response = await fetch(`${API_URL}/transit/book/${id}`, {
    method: 'PUT',
    headers: { authorization: authHeader, 'content-type': 'application/json' },
    body: JSON.stringify(parsed.data),
  });
  return NextResponse.json(await response.json(), { status: response.status });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authHeader = req.headers.get('authorization');
  if (!authHeader) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  const response = await fetch(`${API_URL}/transit/book/${id}`, {
    method: 'DELETE',
    headers: { authorization: authHeader },
  });
  return NextResponse.json(await response.json(), { status: response.status });
}
