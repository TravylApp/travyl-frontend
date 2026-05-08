import { APIGatewayProxyHandlerV2 } from 'aws-lambda'
import { Resource } from 'sst'
import { createClient } from '@supabase/supabase-js'
import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime'
import {
  S3Client,
  GetObjectCommand,
  DeleteObjectCommand,
  PutObjectCommand,
} from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { validateAuth } from './lib/auth'

const bedrockClient = new BedrockRuntimeClient({})
const s3Client = new S3Client({})
const MODEL_ID = 'anthropic.claude-3-5-haiku-20241022-v1:0'
const BUCKET_NAME = Resource.DocumentUploads.name
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const UPLOAD_URL_TTL = 300 // 5 minutes
const RATE_LIMIT_MAX = 10 // requests per minute
const DAILY_LIMIT = 50 // requests per day

// Claude Vision prompt for document OCR
const SYSTEM_PROMPT = `You are a travel document OCR system. Given an image of a travel document (hotel confirmation, flight itinerary, car rental, activity booking, etc.), extract structured information.

Return a JSON object with this structure:
{
  "documentType": "hotel" | "flight" | "car" | "activity" | "other",
  "confidence": <0-1 float>,
  "rawText": null | string,
  "data": { <type-specific fields below> }
}

Rules:
- Set confidence to 0-1 based on how clearly you can read the document
- rawText: null for recognized types (hotel/flight/car/activity). Populate ONLY when documentType is "other".
- For "other" documents, data should be an empty object {} and rawText should contain all extracted text.

Hotel fields (documentType: "hotel"):
{
  "name": "Hotel name",
  "address": "Full address",
  "checkIn": "YYYY-MM-DD",
  "checkOut": "YYYY-MM-DD",
  "pricePerNight": number | { "value": number, "alternatives": [number], "note": "string" },
  "totalPrice": number | { "value": number, "alternatives": [number], "note": "string" },
  "currency": "USD",
  "bookingRef": "Confirmation number"
}

Flight fields (documentType: "flight"):
{
  "airline": "Airline name",
  "flightNumber": "AA123",
  "origin": "JFK - New York",
  "destination": "LAX - Los Angeles",
  "departureAt": "YYYY-MM-DDTHH:mm",
  "arrivalAt": "YYYY-MM-DDTHH:mm",
  "bookingRef": "Confirmation number",
  "cabinClass": "Economy"
}

Car rental fields (documentType: "car"):
{
  "company": "Rental company",
  "pickupLocation": "Location",
  "dropoffLocation": "Location",
  "pickupAt": "YYYY-MM-DDTHH:mm",
  "dropoffAt": "YYYY-MM-DDTHH:mm",
  "price": number | { "value": number, "alternatives": [number], "note": "string" },
  "currency": "USD",
  "bookingRef": "Confirmation number"
}

Activity fields (documentType: "activity"):
{
  "name": "Activity name",
  "date": "YYYY-MM-DD",
  "time": "HH:mm",
  "location": "Location",
  "price": number | { "value": number, "alternatives": [number], "note": "string" },
  "currency": "USD",
  "bookingRef": "Confirmation number",
  "duration": "2 hours",
  "notes": "Any additional details"
}

For fields where you find conflicting values (e.g., two different prices), use the AlternativeValue format with "alternatives" array and a "note" explaining the conflict.`

async function handleUploadUrl(userId: string, body: any) {
  const { contentType, fileSize } = body

  if (!contentType || !fileSize) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Missing contentType or fileSize' }) }
  }

  if (fileSize > MAX_FILE_SIZE) {
    return { statusCode: 413, body: JSON.stringify({ error: 'File size exceeds 10MB limit' }) }
  }

  const uuid = crypto.randomUUID()
  const objectKey = `uploads/${userId}/${uuid}.png`

  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: objectKey,
    ContentType: contentType,
  })

  const uploadUrl = await getSignedUrl(s3Client, command, {
    expiresIn: UPLOAD_URL_TTL,
  })

  return {
    statusCode: 200,
    body: JSON.stringify({ uploadUrl, objectKey }),
  }
}

async function handleParse(userId: string, body: any) {
  const { objectKey, tripId, hint } = body

  if (!objectKey) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Missing objectKey' }) }
  }

  // Read image from S3
  let imageBuffer: Uint8Array
  try {
    const getCommand = new GetObjectCommand({ Bucket: BUCKET_NAME, Key: objectKey })
    const s3Response = await s3Client.send(getCommand)
    imageBuffer = await s3Response.Body!.transformToByteArray()
  } catch (err) {
    return { statusCode: 400, body: JSON.stringify({ error: 'S3 object not found or inaccessible' }) }
  }

  // Send to Claude 3.5 Haiku v2 Vision
  const base64Image = Buffer.from(imageBuffer).toString('base64')

  const userPrompt = hint
    ? `This document appears to be a ${hint} reservation. Extract the relevant fields for that type.`
    : 'Extract the travel document details from this image.'

  try {
    const command = new InvokeModelCommand({
      modelId: MODEL_ID,
      contentType: 'application/json',
      body: JSON.stringify({
        anthropic_version: 'bedrock-2023-05-31',
        max_tokens: 2048,
        system: SYSTEM_PROMPT,
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: userPrompt },
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: 'image/png',
                  data: base64Image,
                },
              },
            ],
          },
        ],
      }),
    })

    const response = await bedrockClient.send(command)
    const responseBody = JSON.parse(new TextDecoder().decode(response.body))
    const contentText = responseBody.content[0].text
    const result = JSON.parse(contentText)

    // Delete S3 object after successful read (but keep for 5 min window for re-process)
    // The 1hr lifecycle is the safety net; we delete eagerly to minimize storage
    try {
      await s3Client.send(new DeleteObjectCommand({ Bucket: BUCKET_NAME, Key: objectKey }))
    } catch {
      // Non-critical — lifecycle will clean up
    }

    // Low confidence check (< 0.3)
    if (result.confidence < 0.3) {
      return {
        statusCode: 422,
        body: JSON.stringify({
          error: 'Could not read this document clearly',
          partial: result,
        }),
      }
    }

    return {
      statusCode: 200,
      body: JSON.stringify(result),
    }
  } catch (err) {
    console.error('[documents] Bedrock error:', err)
    return { statusCode: 500, body: JSON.stringify({ error: 'Internal server error' }) }
  }
}

// Rate limiter — uses Supabase as a simple counter store
async function checkRateLimit(userId: string): Promise<{ allowed: boolean; retryAfter?: number }> {
  const supabase = createClient(Resource.SupabaseUrl.value, Resource.SupabaseSecretKey.value)
  const now = Date.now()

  // Per-minute window
  const minuteKey = `rate:${userId}:minute:${Math.floor(now / 60000)}`
  const { data: minuteCount } = await supabase
    .rpc('increment_counter', { counter_key: minuteKey, expiry_seconds: 70 })
    .single()
  if ((minuteCount as any)?.count > RATE_LIMIT_MAX) {
    return { allowed: false, retryAfter: 60 }
  }

  // Daily window
  const dayStr = new Date().toISOString().split('T')[0]
  const dayKey = `rate:${userId}:day:${dayStr}`
  const { data: dayCount } = await supabase
    .rpc('increment_counter', { counter_key: dayKey, expiry_seconds: 86400 })
    .single()
  if ((dayCount as any)?.count > DAILY_LIMIT) {
    return { allowed: false, retryAfter: 86400 }
  }

  return { allowed: true }
}

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  try {
    const userId = await validateAuth(event.headers.authorization)

    // Rate limit
    const rateCheck = await checkRateLimit(userId)
    if (!rateCheck.allowed) {
      return {
        statusCode: 429,
        headers: { 'Retry-After': String(rateCheck.retryAfter ?? 60) },
        body: JSON.stringify({ error: 'Rate limit exceeded' }),
      }
    }

    const body = JSON.parse(event.body ?? '{}')
    const routeKey = event.routeKey ?? ''

    if (routeKey.includes('upload-url')) {
      return await handleUploadUrl(userId, body)
    }
    if (routeKey.includes('parse')) {
      return await handleParse(userId, body)
    }

    return { statusCode: 404, body: JSON.stringify({ error: 'Not found' }) }
  } catch (err: any) {
    if (err.message === 'Invalid token' || err.message?.includes('Authorization')) {
      return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized' }) }
    }
    console.error('[documents] error:', err)
    return { statusCode: 500, body: JSON.stringify({ error: 'Internal server error' }) }
  }
}
