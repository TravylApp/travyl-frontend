import { NextRequest, NextResponse } from 'next/server'
import { errorResponse, rateLimit, checkOrigin } from '@/lib/api-utils'
import { parseJsonBody } from '@/lib/zod-helpers'
import { z } from '@travyl/shared'

// ─── Config ──────────────────────────────────────────────────────────────────

// Rachel — natural multilingual voice. Swap by changing this constant.
const VOICE_ID = '21m00Tcm4TlvDq8ikWAM'
const MODEL_ID = 'eleven_multilingual_v2'
const MAX_TEXT_LENGTH = 200

const ttsBodySchema = z.object({
  text: z.string().min(1).max(MAX_TEXT_LENGTH),
  lang: z.string().max(10).optional(),
})

// ─── Handler ─────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const origin = checkOrigin(req)
  if (origin) return origin

  const limited = rateLimit(req, 'tts', 30, 60_000)
  if (limited) return limited

  const apiKey = process.env.ELEVENLABS_API_KEY
  if (!apiKey) {
    console.error('[tts] ELEVENLABS_API_KEY not set')
    return errorResponse('TTS not configured', 503)
  }

  const parsed = await parseJsonBody(req, ttsBodySchema)
  if (!parsed.ok) return parsed.response
  const text = parsed.data.text.trim()

  try {
    const upstream = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`,
      {
        method: 'POST',
        headers: {
          'xi-api-key': apiKey,
          'Content-Type': 'application/json',
          Accept: 'audio/mpeg',
        },
        body: JSON.stringify({
          text,
          model_id: MODEL_ID,
          voice_settings: { stability: 0.5, similarity_boost: 0.75 },
        }),
      },
    )

    if (!upstream.ok) {
      const detail = await upstream.text().catch(() => '')
      console.error('[tts] ElevenLabs error', upstream.status, detail.slice(0, 300))
      return errorResponse('TTS upstream failed', 502)
    }

    const audio = await upstream.arrayBuffer()
    return new NextResponse(audio, {
      status: 200,
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': String(audio.byteLength),
        'Cache-Control': 'public, max-age=86400, immutable',
      },
    })
  } catch (err) {
    console.error('[tts] fetch error', err)
    return errorResponse('TTS unavailable', 502)
  }
}
