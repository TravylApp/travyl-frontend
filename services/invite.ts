import { Resource } from 'sst'
import type { APIGatewayProxyHandlerV2 } from 'aws-lambda'
import { createClient } from '@supabase/supabase-js'
import { SESv2Client, SendEmailCommand } from '@aws-sdk/client-sesv2'
import { validateAuth } from './lib/auth'
import { safeParseBody } from './lib/validation'

const ses = new SESv2Client({})
const SENDER = 'noreply@gotravyl.com'
const APP_URL = process.env.APP_URL ?? 'https://gotravyl.com'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type',
}

function respond(statusCode: number, body: Record<string, unknown>) {
  return { statusCode, headers: corsHeaders, body: JSON.stringify(body) }
}

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  try {
    const userId = await validateAuth(event.headers.authorization)

    const parsed = safeParseBody<{ tripId?: string; email?: string; role?: string }>(event)
    if (!parsed.success) {
      return respond(parsed.error.statusCode, JSON.parse(parsed.error.body))
    }

    const { tripId, email, role } = parsed.data
    if (!tripId || !email || !role) {
      return respond(400, { error: 'tripId, email, role required' })
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return respond(400, { error: 'Invalid email format' })
    }

    // Validate role
    const validRoles = ['viewer', 'editor']
    if (!validRoles.includes(role)) {
      return respond(400, { error: 'role must be viewer or editor' })
    }

    const supabase = createClient(Resource.SupabaseUrl.value, Resource.SupabaseSecretKey.value)

    // Verify caller owns the trip
    const { data: trip, error: tripError } = await supabase
      .from('trips')
      .select('id, title, destination, user_id')
      .eq('id', tripId)
      .single()

    if (tripError || !trip) {
      return respond(404, { error: 'Trip not found' })
    }
    if (trip.user_id !== userId) {
      return respond(403, { error: 'Forbidden' })
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

    // Send invite email (non-fatal — invite record is already persisted)
    const acceptUrl = `${APP_URL}/invite/accept?token=${inviteToken}`
    const roleLabel = role === 'editor' ? 'edit' : 'view'
    const roleDisplay = role === 'editor' ? 'Can edit' : 'Can view'
    const tripDestination = trip.destination || trip.title

    let emailWarning: string | undefined
    try {
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
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background-color:#ebe9e3;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#ebe9e3;">
    <tr>
      <td align="center" style="padding:40px 16px;">
        <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="max-width:480px;width:100%;">

          <!-- Logo -->
          <tr>
            <td align="center" style="padding:0 0 24px;">
              <span style="font-family:Georgia,'Times New Roman',serif;font-size:20px;font-weight:700;letter-spacing:2px;color:#1e3a5f;">TRAVYL</span>
            </td>
          </tr>

          <!-- Main Card -->
          <tr>
            <td style="background:#ffffff;border-radius:16px;padding:0;box-shadow:0 4px 24px rgba(0,0,0,0.08),0 1px 4px rgba(0,0,0,0.04);">

              <!-- Navy header stripe -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#1e3a5f;border-radius:16px 16px 0 0;">
                <tr>
                  <td style="padding:36px 32px 28px;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td>
                          <p style="margin:0 0 4px;color:#8aabca;font-size:13px;font-weight:500;letter-spacing:0.3px;">INVITATION TO COLLABORATE</p>
                          <h2 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;line-height:1.3;">You've been invited to<br>${tripDestination}</h2>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Body -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding:28px 32px 0;">
                    <table role="presentation" cellpadding="0" cellspacing="0">
                      <tr>
                        <td width="40" valign="top" style="padding:2px 12px 0 0;">
                          <table role="presentation" cellpadding="0" cellspacing="0" style="width:28px;height:28px;border-radius:50%;background:#1e3a5f;text-align:center;">
                            <tr>
                              <td align="center" valign="middle" style="font-size:12px;font-weight:700;color:#ffffff;line-height:28px;">
                                ${inviterName.charAt(0).toUpperCase()}
                              </td>
                            </tr>
                          </table>
                        </td>
                        <td>
                          <p style="margin:0;color:#111;font-size:15px;line-height:1.5;">
                            <strong style="color:#1e3a5f;">${inviterName}</strong> wants you to help plan this trip.
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Role badge -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding:20px 32px 0;">
                    <table role="presentation" cellpadding="0" cellspacing="0" style="background:#f0f4f9;border-radius:10px;width:100%;">
                      <tr>
                        <td style="padding:14px 20px;">
                          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                            <tr>
                              <td>
                                <p style="margin:0;font-size:12px;font-weight:600;color:#6b7a8e;letter-spacing:0.4px;text-transform:uppercase;">Your role</p>
                                <p style="margin:4px 0 0;font-size:15px;font-weight:600;color:#1e3a5f;">
                                  ${roleDisplay}
                                </p>
                              </td>
                              <td align="right" valign="middle">
                                <span style="display:inline-block;padding:4px 12px;border-radius:20px;font-size:12px;font-weight:600;color:#ffffff;background:#003594;">
                                  ${role === 'editor' ? 'Editor' : 'Viewer'}
                                </span>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- CTA -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding:24px 32px 0;">
                    <table role="presentation" cellpadding="0" cellspacing="0">
                      <tr>
                        <td align="center" style="border-radius:10px;background:#003594;">
                          <a href="${acceptUrl}" target="_blank" style="display:inline-block;padding:14px 36px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:10px;letter-spacing:0.2px;">
                            Accept Invite
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Fallback link -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding:16px 32px 32px;">
                    <p style="margin:0;color:#999;font-size:12px;line-height:1.5;">
                      Button not working? Copy and paste this link into your browser:<br>
                      <a href="${acceptUrl}" target="_blank" style="color:#003594;text-decoration:underline;word-break:break-all;">${acceptUrl}</a>
                    </p>
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center" style="padding:24px 16px 0;">
              <p style="margin:0 0 4px;color:#999;font-size:11px;line-height:1.5;">
                Sent from Travyl &mdash; plan your next adventure together
              </p>
              <p style="margin:0;color:#bbb;font-size:11px;">
                Travyl &middot; gotravyl.com
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
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
    } catch (sesErr: any) {
      // Log the real SES error (visible in CloudWatch) but don't fail the request
      console.error('SES send failed:', sesErr?.message ?? sesErr)
      emailWarning = sesErr?.message ?? 'Email could not be sent'
    }

    return respond(200, {
      ok: true,
      inviteToken,
      acceptUrl,
      ...(emailWarning ? { emailWarning } : {}),
    })
  } catch (err: any) {
    if (err.message === 'Invalid token' || err.message?.includes('Authorization')) {
      return respond(401, { error: 'Unauthorized' })
    }
    console.error('invite error:', err)
    return respond(500, { error: 'Internal server error' })
  }
}
