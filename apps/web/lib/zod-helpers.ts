import { NextRequest, NextResponse } from 'next/server';
import type { z } from 'zod';

type ParseSuccess<T> = { ok: true; data: T };
type ParseFailure = { ok: false; response: NextResponse };
type ParseResult<T> = ParseSuccess<T> | ParseFailure;

/** Parse `req.nextUrl.searchParams` against a Zod schema. On failure, returns
 *  a `NextResponse` 400 the route should return immediately. */
export function parseQuery<T extends z.ZodTypeAny>(
  req: NextRequest,
  schema: T,
): ParseResult<z.infer<T>> {
  const result = schema.safeParse(
    Object.fromEntries(req.nextUrl.searchParams),
  );
  if (!result.success) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: 'Invalid query', issues: result.error.issues },
        { status: 400 },
      ),
    };
  }
  return { ok: true, data: result.data };
}

/** Parse JSON body against a Zod schema. On failure (bad JSON or validation
 *  failure), returns a `NextResponse` 400. */
export async function parseJsonBody<T extends z.ZodTypeAny>(
  req: NextRequest,
  schema: T,
): Promise<ParseResult<z.infer<T>>> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 }),
    };
  }
  const result = schema.safeParse(body);
  if (!result.success) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: 'Invalid request body', issues: result.error.issues },
        { status: 400 },
      ),
    };
  }
  return { ok: true, data: result.data };
}
