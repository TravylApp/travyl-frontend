# Travyl — Platform Document

## What it is

Travyl is a collaborative travel planning app. Users create trips, build day-by-day itineraries on a calendar, and plan with others in real time.

## Target user

Travelers — solo or in groups — who want a structured way to plan trips. The core use case is building an itinerary collaboratively, not just bookmarking places.

## Core user flows

1. **Auth** — Sign up / sign in via Supabase Auth (email + password)
2. **Trips list** — View all your trips at `/trips`. Create a new trip via the modal (title, destination, dates).
3. **Trip calendar** — At `/trip/[id]`, a week/day calendar view shows activities. Drag to move, click to edit, click empty slot to create.
4. **Real-time collaboration** — Multiple users on the same trip see each other's changes live (Yjs CRDTs) and see presence indicators (who's online, what they're looking at).
5. **Discover** — Browse destinations and places at `/` and `/places`.
6. **Profile** — Manage account at `/profile`.

## Key surfaces

| Route | Surface |
|---|---|
| `/` | Home / Discover |
| `/trips` | Trips list |
| `/trip/[id]` | Trip calendar (week + day view) |
| `/places` | Place details |
| `/profile` | User profile |
| `/login`, `/signup` | Auth |

## Out of scope (currently)

- Real flight/hotel search and booking (mock data used)
- Payments or subscriptions
- AI-generated itineraries (schema has `is_generated` field but feature not built)
- Trip sharing via public link (schema has `share_link_token` but not wired up)
- Mobile app feature parity (web is primary)

## Supabase project

- **Project ID:** `mfhcdxnzzxuyfkcptoyh`
- **Region:** us-east-2
- Use the Supabase MCP for schema queries, migrations, and SQL execution. Always use `apply_migration` for DDL, `execute_sql` for reads.
