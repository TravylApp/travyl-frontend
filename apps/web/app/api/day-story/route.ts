import { NextResponse } from 'next/server';
import { buildTemplatedDayStory } from '@travyl/shared';
import type { DayStoryRequest } from '@travyl/shared';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  let body: DayStoryRequest;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (!body?.tripId || typeof body.dayIndex !== 'number') {
    return NextResponse.json({ error: 'tripId and dayIndex required' }, { status: 400 });
  }

  // Phase 1: templated only. Phase 2 will branch to Bedrock here.
  const story = buildTemplatedDayStory(body);
  return NextResponse.json(story, {
    headers: { 'Cache-Control': 'private, max-age=0, must-revalidate' },
  });
}
