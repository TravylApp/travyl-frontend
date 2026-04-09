import { APIGatewayProxyHandlerV2 } from 'aws-lambda'
import { validateAuth } from './lib/auth'
import { safeParseBody } from './lib/validation'

interface BookingValidationRequest {
  type: 'restaurant' | 'flight' | 'event'
  providerId: string
  date: string
  time?: string
  partySize?: number
  passengerCount?: number
  cabinClass?: string
}

interface BookingValidationResponse {
  valid: boolean
  errors: string[]
  warnings: string[]
  availability?: {
    available: boolean
    alternatives?: string[]
  }
}

export const validateHandler: APIGatewayProxyHandlerV2 = async (event) => {
  try {
    await validateAuth(event.headers.authorization)

    const parseResult = safeParseBody<BookingValidationRequest>(event)
    if (!parseResult.success) {
      return parseResult.error
    }

    const booking = parseResult.data
    const errors: string[] = []
    const warnings: string[] = []

    // Validate required fields
    if (!booking.type || !['restaurant', 'flight', 'event'].includes(booking.type)) {
      errors.push('Invalid booking type (must be: restaurant, flight, event)')
    }

    if (!booking.providerId) {
      errors.push('Provider ID is required')
    }

    if (!booking.date || !/^\d{4}-\d{2}-\d{2}$/.test(booking.date)) {
      errors.push('Date must be YYYY-MM-DD format')
    }

    // Type-specific validation
    if (booking.type === 'restaurant') {
      if (!booking.time || !/^\d{2}:\d{2}$/.test(booking.time)) {
        errors.push('Restaurant booking requires time (HH:MM)')
      }
      if (!booking.partySize || booking.partySize < 1 || booking.partySize > 20) {
        errors.push('Party size must be 1-20')
      }
    }

    if (booking.type === 'flight') {
      if (!booking.passengerCount || booking.passengerCount < 1 || booking.passengerCount > 9) {
        errors.push('Passenger count must be 1-9')
      }
      const validCabins = ['economy', 'premium_economy', 'business', 'first']
      if (booking.cabinClass && !validCabins.includes(booking.cabinClass)) {
        errors.push(`Cabin class must be: ${validCabins.join(', ')}`)
      }
      if (!booking.cabinClass) {
        warnings.push('No cabin class specified, defaulting to economy')
      }
    }

    // Date validation (no past dates)
    const bookingDate = new Date(booking.date)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    if (bookingDate < today) {
      errors.push('Booking date cannot be in the past')
    }

    // Far future warning (>1 year)
    const oneYear = new Date()
    oneYear.setFullYear(oneYear.getFullYear() + 1)
    if (bookingDate > oneYear) {
      warnings.push('Booking date is more than 1 year in advance')
    }

    const response: BookingValidationResponse = {
      valid: errors.length === 0,
      errors,
      warnings,
    }

    return {
      statusCode: errors.length > 0 ? 400 : 200,
      body: JSON.stringify(response),
    }
  } catch (err: any) {
    if (err.message === 'Invalid token' || err.message?.includes('Authorization')) {
      return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized' }) }
    }
    console.error('[bookings/validate] error:', err)
    return { statusCode: 500, body: JSON.stringify({ error: 'Internal server error' }) }
  }
}