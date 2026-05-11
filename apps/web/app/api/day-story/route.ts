import { NextRequest, NextResponse } from 'next/server';
import { buildTemplatedDayStory, z } from '@travyl/shared';
import { parseJsonBody } from '@/lib/zod-helpers';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const dayStoryBodySchema = z.object({
  tripId: z.string().min(1),
  dayIndex: z.number().int().min(0),
  destination: z.string().min(1).max(200),
  dateLabel: z.string(),
  isFirstDay: z.boolean(),
  isLastDay: z.boolean(),
  activities: z.array(z.object({
    name: z.string(),
    type: z.string(),
    startHour: z.number(),
    image: z.string().optional(),
  })),
});

export async function POST(request: NextRequest) {
  const parsed = await parseJsonBody(request, dayStoryBodySchema);
  if (!parsed.ok) return parsed.response;

  // Phase 1: templated only. Phase 2 will branch to Bedrock here.
  const story = buildTemplatedDayStory(parsed.data);
  return NextResponse.json(story, {
    headers: { 'Cache-Control': 'private, max-age=0, must-revalidate' },
  });
}
