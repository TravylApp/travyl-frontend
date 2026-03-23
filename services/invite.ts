import { Resource } from 'sst'
import type { APIGatewayProxyHandlerV2 } from 'aws-lambda'
import { createClient } from '@supabase/supabase-js'
import { SESv2Client, SendEmailCommand } from '@aws-sdk/client-sesv2'
import { validateAuth } from './lib/auth'

const ses = new SESv2Client({})
const SENDER = 'noreply@gotravyl.com'
const APP_URL = 'https://gotravyl.com'

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  try {
    const userId = await validateAuth(event.headers.authorization)

    if (!event.body) {
      return { statusCode: 400, body: JSON.stringify({ error: 'body required' }) }
    }

    const { tripId, email, role } = JSON.parse(event.body)
    if (!tripId || !email || !role) {
      return { statusCode: 400, body: JSON.stringify({ error: 'tripId, email, role required' }) }
    }

    const supabase = createClient(Resource.SupabaseUrl.value, Resource.SupabaseSecretKey.value)

    // Verify caller owns the trip
    const { data: trip, error: tripError } = await supabase
      .from('trips')
      .select('id, title, user_id')
      .eq('id', tripId)
      .single()

    if (tripError || !trip) {
      return { statusCode: 404, body: JSON.stringify({ error: 'Trip not found' }) }
    }
    if (trip.user_id !== userId) {
      return { statusCode: 403, body: JSON.stringify({ error: 'Forbidden' }) }
    }

    // Get inviter display name
    const { data: profile } = await supabase
      .from('profiles')
      .select('display_name, email')
      .eq('id', userId)
      .single()

    const inviterName = profile?.display_name || profile?.email || 'Someone'

    // Reuse existing pending invite or create a new one
    const { data: existing } = await supabase
      .from('trip_collaborators')
      .select('invite_token')
      .eq('trip_id', tripId)
      .eq('invited_email', email.toLowerCase())
      .eq('invite_status', 'pending')
      .maybeSingle()

    let inviteToken: string

    if (existing) {
      inviteToken = existing.invite_token
    } else {
      inviteToken = crypto.randomUUID()
      const { error: insertError } = await supabase.from('trip_collaborators').insert({
        trip_id: tripId,
        invited_email: email.toLowerCase(),
        role_type: role,
        invite_status: 'pending',
        invited_by: userId,
        invite_token: inviteToken,
      })
      if (insertError) throw insertError
    }

    // Send invite email
    const acceptUrl = `${APP_URL}/invite/accept?token=${inviteToken}`
    const roleLabel = role === 'editor' ? 'edit' : 'view'

    await ses.send(
      new SendEmailCommand({
        FromEmailAddress: SENDER,
        Destination: { ToAddresses: [email] },
        Content: {
          Simple: {
            Subject: {
              Data: `${inviterName} invited you to ${roleLabel} "${trip.title}" on Travyl`,
            },
            Body: {
              Html: {
                Data: `
<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:sans-serif;">
  <div style="max-width:480px;margin:40px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
    <div style="background:#1e3a5f;padding:32px 32px 24px;">
      <h1 style="margin:0;color:#fff;font-size:22px;font-weight:700;">Travyl</h1>
    </div>
    <div style="padding:32px;">
      <p style="margin:0 0 8px;color:#111;font-size:16px;font-weight:600;">${inviterName} invited you to collaborate</p>
      <p style="margin:0 0 24px;color:#555;font-size:15px;">You've been invited to <strong>${roleLabel}</strong> the trip <strong>"${trip.title}"</strong>.</p>
      <a href="${acceptUrl}" style="display:inline-block;padding:12px 28px;background:#003594;color:#fff;text-decoration:none;border-radius:8px;font-size:15px;font-weight:600;">
        Accept Invite
      </a>
      <p style="margin:24px 0 0;color:#999;font-size:12px;">Or paste this link into your browser:<br>${acceptUrl}</p>
    </div>
  </div>
</body>
</html>`,
              },
              Text: {
                Data: `${inviterName} invited you to ${roleLabel} "${trip.title}" on Travyl.\n\nAccept here: ${acceptUrl}`,
              },
            },
          },
        },
      }),
    )

    return { statusCode: 200, body: JSON.stringify({ ok: true }) }
  } catch (err: any) {
    if (err.message === 'Invalid token' || err.message?.includes('Authorization')) {
      return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized' }) }
    }
    console.error('invite error:', err)
    return { statusCode: 500, body: JSON.stringify({ error: 'Internal server error' }) }
  }
}
