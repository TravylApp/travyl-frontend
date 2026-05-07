# Document OCR & Reservation Import — Design Spec

## Overview

Allow users to upload travel documents (hotel confirmations, flight itineraries, car rentals, tour bookings) and have them automatically parsed by AI and added to the correct section of their trip. The entry point is the spotlight search (Ctrl+K).

## Entry Points

### Spotlight Search Integration

Three discovery mechanisms in the spotlight (Ctrl+K) search bar:

1. **Upload icon** — small upload button inline in the search input, opens native file picker (images + PDFs)
2. **Paste detection** — pasting an image from clipboard shows a brief tooltip "Upload this image?" with confirm/cancel. This prevents accidentally sending sensitive clipboard content. On confirm, the image is sent to the parse flow.
3. **Mobile camera** — deferred to a future phase (web-only for initial implementation)

### States

- **Idle:** Upload icon visible in spotlight input, tooltip "Upload a reservation or travel document"
- **Uploading:** Progress indicator in spotlight while file uploads and AI parses
- **Success:** Spotlight closes, review modal opens
- **Error:** Inline error message in spotlight with retry option

## Backend: New SST Lambda

### Route: `POST /documents/upload-url`

Returns a presigned S3 URL for uploading the document image.

**Input:** `{ contentType: string, fileSize: number }` (client sends the file's MIME type and size)

**Output:** `{ uploadUrl: string, objectKey: string }` — `uploadUrl` is a PUT presigned URL (5 min TTL) with `content-length-range` policy condition enforcing max 10MB. `objectKey` is the S3 key to pass to the parse endpoint.

**Error responses:**
- `400` — Missing contentType or fileSize
- `413` — fileSize exceeds 10MB limit
- `500` — S3 permission error or URL generation failure

### Route: `POST /documents/parse`

New Lambda at `services/documents.ts`. Bound in `infra/api.ts`.

**Input:** JSON body with `{ objectKey: string, tripId?: string, hint?: string }`. The `objectKey` is the S3 key returned from `POST /documents/upload-url`. The Lambda reads the object from S3 using this key. `tripId` is pre-filled automatically from the route params when the user is on a trip page. `hint` is used for re-processing "other" type documents (e.g., `hint: "hotel"` tells the AI to focus on hotel fields).

**Processing:**

1. Accept image upload (max 10MB). PDFs are converted to images client-side before upload — the parse endpoint only receives PNG/JPEG.
2. Call Bedrock Claude Vision with a structured prompt (and optional `hint` to guide extraction for specific document types)
3. Delete the S3 object (it lives for max 5 minutes for re-processing support)
4. Return parsed result as JSON

**Claude Prompt Design:**

Given an image of a travel document, Claude returns structured JSON:

```json
{
  "documentType": "hotel" | "flight" | "car" | "activity" | "other",
  "confidence": 0.95,
  "rawText": null | string,
  // rawText is null for recognized document types (hotel/flight/car/activity).
  // It is populated only when documentType is "other" (unrecognized format)
  // so the user can see what text was extracted and manually categorize.
  "data": {
    // Type-specific fields (see below)
  }
}
```

**Document Types and Extracted Fields:**

| Type | Fields |
|------|--------|
| `hotel` | name, address, checkIn (date), checkOut (date), pricePerNight (number), totalPrice (number), currency (string), bookingRef (string) |
| `flight` | airline, flightNumber, origin (iata + name), destination (iata + name), departureAt (datetime), arrivalAt (datetime), bookingRef (string), cabinClass (string) |
| `car` | company, pickupLocation, dropoffLocation, pickupAt (datetime), dropoffAt (datetime), price (number), currency (string), bookingRef (string) |
| `activity` | name, date, time, location, price (number), currency, bookingRef, duration (string), notes |
| `other` | `data` is empty object `{}`, all extracted text is in `rawText` field |

### Error Responses (parse endpoint)

- `400` — No image URL provided, or S3 object not found
- `422` — Image processed but unreadable (confidence < 0.3)
- `429` — Rate limit exceeded (see Rate Limiting below)
- `500` — Internal error (Claude unavailable, Bedrock timeout, etc.)

### Document Retention & Privacy

- **Uploaded documents are stored temporarily in S3 for processing.** The image is uploaded to a temp S3 path (`uploads/{userId}/{uuid}.png`) via a presigned URL, the Lambda reads it, sends it to Claude Bedrock. The S3 object is retained for 5 minutes (to support "other" type re-processing with a hint). After 5 minutes, an S3 lifecycle rule auto-deletes the object.
- **Auto-delete lifecycle policy:** S3 lifecycle rule deletes objects in the `uploads/` prefix after 5 minutes. Additional safety net: orphaned objects older than 1 hour are also cleaned up.
- No copy is saved to any database. The structured JSON result is returned to the frontend but NOT persisted server-side. Persistence only happens when the user clicks "Add to Trip" in the review modal, and at that point only the structured data fields (name, dates, prices, refs) are written — never the raw image.
- This means no long-term customer data retention burden. Users' booking confirmations with personal data are ephemeral.

### Rate Limiting & Cost Guard

- **Per-user rate limit:** 10 requests per minute per user (tracked via DynamoDB with TTL-based expiry — DynamoDB only, not in-memory, since Lambda containers are ephemeral and concurrent requests can land on different instances)
- **Daily per-user cap:** 50 requests per day (separate DynamoDB counter with end-of-day TTL)
- **Response on limit exceeded:** HTTP 429 with `Retry-After` header
- This protects against both abuse and accidental cost spikes from Bedrock usage (~$0.08/image with Claude 3.5 Haiku v2 vision)
- **Model choice:** Use **Claude 3.5 Haiku v2** (`anthropic.claude-3-5-haiku-20241022-v1:0`) — this is the cheapest vision-capable Claude model and is sufficient for document OCR. Claude 3 Haiku (non-vision) cannot process images and will fail. The Bedrock resource ARN in `infra/api.ts` must reference the vision-capable model, not the older text-only one. Pricing is approximately $0.08/image at 200 DPI (input) + negligible output.
- **Lambda timeout:** 60 seconds (Claude Vision inference takes 5-15 seconds for images, plus upload time). Must be set explicitly in the route binding, matching the `'POST /api/trips/plan'` pattern of `timeout: '60 seconds'`.

### PDF Handling

- Multi-page PDFs: only the **first page** is processed. Travel confirmations are almost always single-page or have all key info on page 1.
- PDFs are converted to images **client-side** in the browser using `pdfjs-dist` (Mozilla's PDF.js). This avoids the complex native dependency chain (`node-canvas` + Cairo + Pango) that would be required on Lambda ARM/Graviton2. The browser renders the first page to a canvas at 200 DPI, then uploads the resulting PNG via the presigned URL. This keeps the server-side Lambda dependency-free for image processing.
- If the first page yields low confidence (< 0.5), return that low confidence rather than attempting subsequent pages. The user can re-upload a specific page if needed.

### Conflict Resolution in Response Schema

When the AI detects conflicting values (e.g., two different prices on the same document), the response can include alternatives:

```json
{
  "documentType": "hotel",
  "confidence": 0.85,
  "data": {
    "name": "Marriott Paris",
    "checkIn": "2026-06-05",
    "checkOut": "2026-06-08",
    "pricePerNight": { "value": 250, "alternatives": [200], "note": "First night shows 200, subsequent nights 250" },
    "totalPrice": 750,
    "currency": "EUR",
    "bookingRef": "MR123456"
  }
}
```

Fields with alternatives show a small dropdown in the review modal so the user can pick the correct one. Most fields remain single-valued; only potentially ambiguous numeric fields (prices, dates) support this.

### Low Confidence Handling

When confidence is low (< 0.5), Claude still returns the best-guess structured data alongside the document type. The review modal shows a prominent "Please verify carefully" banner with the low-confidence fields highlighted for review. Raw text extraction is not returned — the structured data itself is the deliverable, and the user edits any wrong fields in the form.

### Infrastructure

- New Lambda function with Bedrock invocation policy
- Route added to API Gateway (`POST /documents/parse`)
- JWT auth (same as existing endpoints, `services/lib/auth.ts`)
- **Multipart handling:** API Gateway v2 supports `multipart/form-data` with Lambda proxy, but the existing CORS config does not explicitly allow `multipart/form-data` boundary headers. Use a two-step approach instead:
  1. **Client → presigned URL:** Upload the image to an S3 bucket with a short-lived presigned URL (5 min TTL). The client gets the URL from `POST /documents/upload-url`.
  2. **Client → parse:** Call `POST /documents/parse` with `{ imageUrl, tripId? }`. The Lambda reads from S3, sends to Bedrock, then deletes the S3 object.
  This avoids multipart parsing issues, keeps images out of API Gateway, and doesn't require changes to existing auth middleware. Only the presigned URL endpoint needs to generate a temp S3 reference — the image is never permanently stored.
- **S3 CORS:** The S3 bucket must have a CORS policy allowing `PUT` from the web app origin (and `*` for development), with `ETag` exposed header for upload verification.
- The outgoing presigned URL endpoint requires S3 write permissions on a temp bucket path (e.g., `uploads/{userId}/{uuid}.png`).

## Frontend: Review Modal

After parsing completes, a modal appears showing the extracted data:

### Layout

- **Document type badge** at top (color-coded: hotel=blue, flight=purple, car=amber, activity=green)
- **Confidence indicator:** "High" (green check, 0.8+), "Medium" (yellow warning, 0.5-0.8), "Low" (red alert, <0.5 — means user should carefully review)
- **Editable fields form** — all extracted fields shown as labeled inputs, pre-filled with AI values
- **Trip selector** — if `tripId` wasn't provided or dates match multiple trips, dropdown to pick which trip. If the user has no trips, show a "Create a trip first" message with a button to create one (the parsed data is held in local state).
- **Date conflict warning** — if the reservation dates overlap existing activities on the trip, subtle non-blocking warning
- **Actions:** "Add to Trip" (primary), "Cancel" (secondary)

### Write Logic

All writes use existing Supabase client mutations from `@travyl/shared`. No new API endpoints are needed for persistence:

| Document Type | Persistence Path | Existing Mechanism |
|---|---|---|
| `hotel` | Upsert to `hotels` table via existing `useHotels`/`useActivityMutations` hook | `supabase.from('hotels').upsert()` + optional `activity` row (calendar hotel block) |
| `flight` | Upsert to `flights` table via existing `useFlights`/`useActivityMutations` hook | `supabase.from('flights').upsert()` + optional `activity` row (calendar transport) |
| `car` | Create `activity` row with `activity_type = 'transport'` | `useActivityMutations.createActivity()` with car data in `activity_data` jsonb |
| `activity` | Create `activity` row | `useActivityMutations.createActivity()` |
| `other` | Show category picker → re-process with type hint or show blank form | For re-process: call `POST /documents/parse` again with `{ hint: "hotel" }`. If still fails, present a blank create form for the chosen type. |

### Edge Cases

| Scenario | Handling |
|---|---|
| Blurry / unreadable image | Return confidence < 0.3, show "Couldn't read this clearly — try a clearer photo" |
| Unrecognized document type | Show raw text + manual category picker |
| Multiple trips match dates | Show trip picker dropdown in review modal |
| Field looks wrong | All fields are editable in the review form |
| Network error during upload | Retry button, preserve file in temp state |
| Document has conflicting info (e.g., two prices) | AI returns both possibilities shown as options |
| PDF upload | Convert to image on server side for Claude Vision |
| Not authenticated | Redirect to login (existing auth guard) |

## Implementation Plan

### Phase 1: Backend Lambda
- Create `services/documents.ts` with two endpoints: `upload-url` (presigned S3 URL) and `parse` (Claude Vision parsing)
- Add S3 bucket for temp uploads with auto-delete lifecycle (1 hour TTL)
- Add routes to `infra/api.ts` (`POST /documents/upload-url`, `POST /documents/parse`)
- Add Bedrock permissions + S3 temp upload permissions
- Deploy via SST

### Phase 2: Frontend — Spotlight Integration
- Add upload icon button to spotlight search input
- Add paste detection (clipboard image handler)
- Add upload progress state
- Wire up `POST /documents/parse` call

### Phase 3: Review Modal
- Build DocumentReviewModal component
- Editable fields form per document type
- Trip selector dropdown
- Date conflict warnings

### Phase 4: Write to DB
- Hooks for writing parsed data to hotels/flights/activities tables
  - hotel → write to `hotels` table + optional calendar activity (day-spanning block)
  - flight → write to `flights` table + optional calendar transport activity
  - car → write as calendar activity with `activity_type = 'transport'` and car data in `activity_data`
  - activity → write directly to calendar activity
  - other → show category picker, then re-process with type hint or create blank form
- Calendar activity creation for time-bound reservations
- Error handling + rollback
