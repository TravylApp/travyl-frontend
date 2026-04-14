import type { APIGatewayProxyEventV2 } from 'aws-lambda'

/**
 * Safely parse JSON body from API Gateway event.
 * Returns parsed object or error response.
 */
export function safeParseBody<T>(
  event: APIGatewayProxyEventV2,
): { success: true; data: T } | { success: false; error: { statusCode: number; body: string } } {
  if (!event.body) {
    return {
      success: false,
      error: { statusCode: 400, body: JSON.stringify({ error: 'body required' }) },
    }
  }

  try {
    const data = JSON.parse(event.body) as T
    return { success: true, data }
  } catch {
    return {
      success: false,
      error: { statusCode: 400, body: JSON.stringify({ error: 'Invalid JSON in request body' }) },
    }
  }
}

/**
 * Validate date string is YYYY-MM-DD format.
 */
export function isValidDate(date: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(date) && !isNaN(Date.parse(date))
}

/**
 * Validate required query parameters.
 */
export function validateQueryParams(
  params: Record<string, string | undefined>,
  required: string[],
): { success: true } | { success: false; error: { statusCode: number; body: string } } {
  const missing = required.filter((key) => !params[key] || params[key]?.trim() === '')

  if (missing.length > 0) {
    return {
      success: false,
      error: {
        statusCode: 400,
        body: JSON.stringify({ error: `Missing required parameters: ${missing.join(', ')}` }),
      },
    }
  }

  return { success: true }
}

/**
 * Validate date range (startDate <= endDate).
 */
export function validateDateRange(
  startDate: string,
  endDate: string,
): { success: true } | { success: false; error: { statusCode: number; body: string } } {
  if (!isValidDate(startDate)) {
    return {
      success: false,
      error: { statusCode: 400, body: JSON.stringify({ error: 'Invalid startDate format (YYYY-MM-DD)' }) },
    }
  }

  if (!isValidDate(endDate)) {
    return {
      success: false,
      error: { statusCode: 400, body: JSON.stringify({ error: 'Invalid endDate format (YYYY-MM-DD)' }) },
    }
  }

  if (Date.parse(startDate) > Date.parse(endDate)) {
    return {
      success: false,
      error: { statusCode: 400, body: JSON.stringify({ error: 'startDate must be before or equal to endDate' }) },
    }
  }

  return { success: true }
}
