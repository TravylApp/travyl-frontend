# Global Transit Integration Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add public transit support to Travyl — trains, buses, subways, trams, ferries globally — with directions search (via self-hosted OpenTripPlanner) and trip booking CRUD.

**Architecture:** Self-hosted OTP server on AWS ECS for routing. SST Lambdas for transit search and booking CRUD. Existing `transit` Supabase table (already created, needs RLS). Frontend follows Flights/Cars component patterns.

**Tech Stack:** Next.js, SST (Ion), Supabase, OpenTripPlanner, React Query, TypeScript

**Spec:** `docs/superpowers/specs/2026-05-07-transit-integration-design.md`

**Important context:** Types (`types/transit.ts`), API (`services/transitApi.ts`), and viewmodel (`viewmodels/transitViewModel.ts`) already exist in `packages/shared/src/` — this plan MODIFIES them, does NOT create them anew. The `transit` DB table may already exist too; verify before running migration.

---

## File Structure

### Files to create:
```
services/transit-bookings.ts            — SST Lambda for booking CRUD
services/transit-search.ts              — SST Lambda for OTP directions search
apps/web/app/api/transit/bookings/route.ts    — Next.js proxy for bookings
apps/web/app/api/transit/directions/route.ts  — Next.js proxy for search
apps/web/app/(dashboard)/trip/[id]/transit/page.tsx  — Route page
apps/web/components/trip/transit/TransitCard.tsx
apps/web/components/trip/transit/TransitForm.tsx
apps/web/components/trip/transit/TransitsModule.tsx
apps/web/components/trip/transit/TransitSearchPanel.tsx
apps/web/components/trip/transit/TransitDirectionResults.tsx
apps/web/components/trip/transit/types.ts
```

### Files to modify:
```
packages/shared/src/types/transit.ts        — Expand TransitData, add new types
packages/shared/src/types/index.ts          — Update re-exports
packages/shared/src/services/transitApi.ts  — Add CRUD (not just fetch)
packages/shared/src/services/index.ts       — Add new exports
packages/shared/src/viewmodels/index.ts     — Update exports
packages/shared/src/viewmodels/transitViewModel.ts — Update for new types
infra/api.ts                                — Register transit routes
infra/secrets.ts                            — Add OTP secrets
apps/web/components/trip-rail.tsx           — Add transit tab
apps/web/app/(dashboard)/trip/[id]/trip-layout-inner.tsx — Add transit to tabOrder
```

---

## Chunk 1: Foundation — Expand Types + DB + Shared Services

### Task 1.1: Expand transit types in shared package

**Files:**
- Modify: `packages/shared/src/types/transit.ts`
- Modify: `packages/shared/src/types/index.ts`

- [ ] **Step 1: Read existing `packages/shared/src/types/transit.ts` to confirm current content**

```bash
cat packages/shared/src/types/transit.ts
```
Expected: Contains `VehicleType`, `TransitData`, `TransitSegment` types.

- [ ] **Step 2: Replace `packages/shared/src/types/transit.ts` with expanded types**

```typescript
export type VehicleType = 'train' | 'bus' | 'subway' | 'tram' | 'light_rail' | 'ferry' | 'cable_car' | 'funicular' | 'rideshare' | 'shuttle';

export interface TransitData {
  vehicleType: VehicleType;
  provider: string | null;
  routeName: string | null;
  originLabel: string;
  destinationLabel: string;
  departureAt: string;       // ISO datetime
  arrivalAt: string;         // ISO datetime
  price: number | null;
  currency: string;
  bookingRef: string | null;
  confirmationCode: string | null;
  notes: string | null;
  // New fields for direction search results
  route_data?: TransitDirectionResult;
}

export interface TransitSegment {
  id: string;
  trip_id: string;
  data: TransitData;
  created_at: string;
}

// --- New types below ---

export type TransitMode = VehicleType; // alias for backwards compat

export interface TransitDirectionStep {
  mode: TransitMode;
  line: string;
  line_color?: string;
  carrier: string;
  origin_stop: string;
  origin_stop_id?: string;
  destination_stop: string;
  destination_stop_id?: string;
  departure_at: string;
  arrival_at: string;
  duration_minutes: number;
  distance_meters?: number;
  num_stops?: number;
}

export interface TransitDirectionResult {
  id: string;
  origin: { lat: number; lng: number; label: string };
  destination: { lat: number; lng: number; label: string };
  departure_at: string;
  arrival_at: string;
  total_duration_minutes: number;
  total_distance_meters?: number;
  fare?: { amount: number; currency: string };
  steps: TransitDirectionStep[];
  leg_count: number;
  provider: 'otp';
}

// Input type for creating a booking (without server-generated fields)
export type CreateTransitInput = Omit<TransitData, 'confirmationCode'>;

// Input for CRUD mutations (links trip_id + data)
export interface CreateTransitBookingInput {
  trip_id: string;
  data: TransitData;
}
```

- [ ] **Step 3: Update `packages/shared/src/types/index.ts` re-export**

Replace the existing line:
```typescript
export type { TransitData, TransitSegment, VehicleType } from './transit';
```
With:
```typescript
export type {
  TransitData, TransitSegment, VehicleType, TransitMode,
  TransitDirectionStep, TransitDirectionResult, CreateTransitInput, CreateTransitBookingInput,
} from './transit';
```

- [ ] **Step 4: Verify `transit` DB table exists and add RLS policies**

Check if the table exists in Supabase:
```sql
SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'transit');
```

If yes, add RLS policies:
```sql
ALTER TABLE transit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their trip transit"
  ON transit FOR SELECT
  USING (trip_id IN (SELECT id FROM trips WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert transit to their trips"
  ON transit FOR INSERT
  WITH CHECK (trip_id IN (SELECT id FROM trips WHERE user_id = auth.uid()));

CREATE POLICY "Users can update transit on their trips"
  ON transit FOR UPDATE
  USING (trip_id IN (SELECT id FROM trips WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete transit from their trips"
  ON transit FOR DELETE
  USING (trip_id IN (SELECT id FROM trips WHERE user_id = auth.uid()));
```

If the table does NOT exist, create it:
```sql
CREATE TABLE transit (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id     UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  data        JSONB NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_transit_trip ON transit(trip_id);
ALTER TABLE transit ENABLE ROW LEVEL SECURITY;
-- then add the 4 policies above
```

- [ ] **Step 5: Commit**

```bash
git add packages/shared/src/types/transit.ts packages/shared/src/types/index.ts
git commit -m "feat(transit): expand transit types with direction search types"
```

### Task 1.2: Update shared API service

**Files:**
- Modify: `packages/shared/src/services/transitApi.ts`
- Modify: `packages/shared/src/services/index.ts`

- [ ] **Step 1: Replace `packages/shared/src/services/transitApi.ts` with full CRUD**

```typescript
import { supabase } from './supabase';
import type { TransitSegment, CreateTransitBookingInput } from '../types';

export async function fetchTransit(tripId: string): Promise<TransitSegment[]> {
  const { data, error } = await supabase
    .from('transit')
    .select('*')
    .eq('trip_id', tripId)
    .order('created_at', { ascending: true });
  if (error) {
    console.error('[transitApi] fetch error:', error);
    return [];
  }
  return (data as any[])?.map(row => ({
    id: row.id,
    trip_id: row.trip_id,
    data: row.data as TransitSegment['data'],
    created_at: row.created_at,
  })) ?? [];
}

export async function addTransit(tripId: string, input: CreateTransitBookingInput): Promise<TransitSegment> {
  const { data, error } = await supabase
    .from('transit')
    .insert({ trip_id: tripId, data: input.data })
    .select()
    .single();
  if (error) throw error;
  return {
    id: data.id,
    trip_id: data.trip_id,
    data: data.data,
    created_at: data.created_at,
  };
}

export async function updateTransit(id: string, input: Partial<CreateTransitBookingInput>): Promise<TransitSegment> {
  const { data, error } = await supabase
    .from('transit')
    .update({ data: input.data })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return {
    id: data.id,
    trip_id: data.trip_id,
    data: data.data,
    created_at: data.created_at,
  };
}

export async function deleteTransit(id: string): Promise<void> {
  const { error } = await supabase
    .from('transit')
    .delete()
    .eq('id', id);
  if (error) throw error;
}
```

- [ ] **Step 2: Update `packages/shared/src/services/index.ts`**

Replace:
```typescript
export { fetchTransit } from './transitApi';
```
With:
```typescript
export { fetchTransit, addTransit, updateTransit, deleteTransit } from './transitApi';
```

- [ ] **Step 3: Commit**

```bash
git add packages/shared/src/services/transitApi.ts packages/shared/src/services/index.ts
git commit -m "feat(transit): add CRUD to transit API service"
```

### Task 1.3: Update transit viewmodel

**Files:**
- Modify: `packages/shared/src/viewmodels/transitViewModel.ts`
- Modify: `packages/shared/src/viewmodels/index.ts`

- [ ] **Step 1: Replace `packages/shared/src/viewmodels/transitViewModel.ts`**

Note: The existing viewmodel is adequate and doesn't need major changes. Just add the new fields:

```typescript
import type { TransitSegment, VehicleType } from '../types';

export interface TransitViewModel {
  id: string;
  vehicleType: VehicleType;
  provider: string | null;
  routeName: string | null;
  route: string;
  originLabel: string;
  destinationLabel: string;
  departureAt: string | null;
  arrivalAt: string | null;
  departureDisplay: string;
  arrivalDisplay: string;
  price: number | null;
  currency: string;
  bookingRef: string | null;
  confirmationCode: string | null;
  notes: string | null;
}

function fmtTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export function buildTransitViewModel(segment: TransitSegment): TransitViewModel {
  const d = segment.data;
  return {
    id: segment.id,
    vehicleType: d.vehicleType,
    provider: d.provider,
    routeName: d.routeName,
    route: `${d.originLabel} → ${d.destinationLabel}`,
    originLabel: d.originLabel,
    destinationLabel: d.destinationLabel,
    departureAt: d.departureAt,
    arrivalAt: d.arrivalAt,
    departureDisplay: fmtTime(d.departureAt),
    arrivalDisplay: fmtTime(d.arrivalAt),
    price: d.price,
    currency: d.currency,
    bookingRef: d.bookingRef,
    confirmationCode: d.confirmationCode,
    notes: d.notes,
  };
}
```

- [ ] **Step 2: No changes needed to `packages/shared/src/viewmodels/index.ts`** — it already exports these.

- [ ] **Step 3: Commit**

```bash
git add packages/shared/src/viewmodels/transitViewModel.ts
git commit -m "feat(transit): update transit viewmodel"
```

---

## Chunk 2: Backend — Transit Bookings + Search Lambdas

### Task 2.1: Create transit-bookings SST Lambda

**Files:**
- Create: `services/transit-bookings.ts`
- Modify: `infra/secrets.ts`
- Modify: `infra/api.ts`

- [ ] **Step 1: Create `services/transit-bookings.ts`**

```typescript
import { APIGatewayProxyHandlerV2 } from 'aws-lambda';
import { Resource } from 'sst';
import { createClient } from '@supabase/supabase-js';
import { validateAuth } from './lib/auth';
import { safeParseBody } from './lib/validation';

const supabase = createClient(Resource.SupabaseUrl.value, Resource.SupabaseSecretKey.value);

export const listHandler: APIGatewayProxyHandlerV2 = async (event) => {
  try {
    await validateAuth(event.headers.authorization);
    const tripId = event.queryStringParameters?.trip_id;
    if (!tripId) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Missing trip_id' }) };
    }
    const { data, error } = await supabase
      .from('transit')
      .select('*')
      .eq('trip_id', tripId)
      .order('created_at', { ascending: true });
    if (error) {
      console.error('[transit-bookings] list error:', error);
      return { statusCode: 500, body: JSON.stringify({ error: 'Failed to fetch transit bookings' }) };
    }
    return { statusCode: 200, body: JSON.stringify(data ?? []) };
  } catch (err: any) {
    if (err.message === 'Invalid token') {
      return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized' }) };
    }
    console.error('[transit-bookings] error:', err);
    return { statusCode: 500, body: JSON.stringify({ error: 'Internal server error' }) };
  }
};

export const createHandler: APIGatewayProxyHandlerV2 = async (event) => {
  try {
    await validateAuth(event.headers.authorization);
    const body = safeParseBody<{ trip_id: string; data: any }>(event);
    if (!body.success) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Invalid request body' }) };
    }
    const { trip_id, data } = body.data;
    const { data: booking, error } = await supabase
      .from('transit')
      .insert({ trip_id, data })
      .select()
      .single();
    if (error) {
      console.error('[transit-bookings] create error:', error);
      return { statusCode: 500, body: JSON.stringify({ error: 'Failed to create transit booking' }) };
    }
    return { statusCode: 201, body: JSON.stringify(booking) };
  } catch (err: any) {
    if (err.message === 'Invalid token') {
      return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized' }) };
    }
    console.error('[transit-bookings] error:', err);
    return { statusCode: 500, body: JSON.stringify({ error: 'Internal server error' }) };
  }
};

export const updateHandler: APIGatewayProxyHandlerV2 = async (event) => {
  try {
    await validateAuth(event.headers.authorization);
    const bookingId = event.pathParameters?.id;
    if (!bookingId) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Missing booking id' }) };
    }
    const body = safeParseBody<{ data: any }>(event);
    if (!body.success) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Invalid request body' }) };
    }
    const { data: booking, error } = await supabase
      .from('transit')
      .update({ data: body.data.data })
      .eq('id', bookingId)
      .select()
      .single();
    if (error) {
      console.error('[transit-bookings] update error:', error);
      return { statusCode: 500, body: JSON.stringify({ error: 'Failed to update transit booking' }) };
    }
    return { statusCode: 200, body: JSON.stringify(booking) };
  } catch (err: any) {
    if (err.message === 'Invalid token') {
      return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized' }) };
    }
    console.error('[transit-bookings] error:', err);
    return { statusCode: 500, body: JSON.stringify({ error: 'Internal server error' }) };
  }
};

export const deleteHandler: APIGatewayProxyHandlerV2 = async (event) => {
  try {
    await validateAuth(event.headers.authorization);
    const bookingId = event.pathParameters?.id;
    if (!bookingId) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Missing booking id' }) };
    }
    const { error } = await supabase
      .from('transit')
      .delete()
      .eq('id', bookingId);
    if (error) {
      console.error('[transit-bookings] delete error:', error);
      return { statusCode: 500, body: JSON.stringify({ error: 'Failed to delete transit booking' }) };
    }
    return { statusCode: 200, body: JSON.stringify({ success: true }) };
  } catch (err: any) {
    if (err.message === 'Invalid token') {
      return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized' }) };
    }
    console.error('[transit-bookings] error:', err);
    return { statusCode: 500, body: JSON.stringify({ error: 'Internal server error' }) };
  }
};
```

- [ ] **Step 2: Add OTP secrets to `infra/secrets.ts`**

```typescript
export const otpServerUrl = new sst.Secret('OtpServerUrl');
export const otpApiKey = new sst.Secret('OtpApiKey');
```

- [ ] **Step 3: Register transit routes in `infra/api.ts`**

After existing transit directions route, add:
```typescript
// Transit bookings CRUD
api.route('GET /transit/bookings', {
  handler: 'services/transit-bookings.listHandler',
  link: [supabaseSecretKey, supabaseUrl],
  timeout: '10 seconds',
});
api.route('POST /transit/book', {
  handler: 'services/transit-bookings.createHandler',
  link: [supabaseSecretKey, supabaseUrl],
  timeout: '10 seconds',
});
api.route('PUT /transit/book/{id}', {
  handler: 'services/transit-bookings.updateHandler',
  link: [supabaseSecretKey, supabaseUrl],
  timeout: '10 seconds',
});
api.route('DELETE /transit/book/{id}', {
  handler: 'services/transit-bookings.deleteHandler',
  link: [supabaseSecretKey, supabaseUrl],
  timeout: '10 seconds',
});
```

Update the existing transit directions route to link OTP secrets:
```typescript
api.route('GET /transit/directions', {
  handler: 'services/transit.handler',
  link: [supabaseSecretKey, supabaseUrl, graphhopperApiKey, otpServerUrl, otpApiKey],
  timeout: '20 seconds',
});
```

- [ ] **Step 4: Commit**

```bash
git add services/transit-bookings.ts infra/secrets.ts infra/api.ts
git commit -m "feat(transit): add transit bookings CRUD Lambda"
```

### Task 2.2: Create transit-search Lambda (OTP integration)

**Files:**
- Create: `services/transit-search.ts`

- [ ] **Step 1: Create `services/transit-search.ts`**

```typescript
import { APIGatewayProxyHandlerV2 } from 'aws-lambda';
import { Resource } from 'sst';
import { validateAuth } from './lib/auth';

interface OTPItinerary {
  duration: number;
  startTime: string;
  endTime: string;
  legs: OTPLeg[];
  fares?: { fare: { currency: { code: string }; cents: number } }[];
}

interface OTPLeg {
  mode: string;
  route: string;
  agencyName: string;
  from: { name: string; stopId?: string; lat: number; lng: number };
  to: { name: string; stopId?: string; lat: number; lng: number };
  startTime: string;
  endTime: string;
  duration: number;
  distance: number;
  numIntermediateStops?: number;
  legGeometry: { length: number; points: string };
  transitLeg: boolean;
}

interface OTPResponse {
  plan: {
    itineraries: OTPItinerary[];
  };
  error?: { msg: string };
}

function parseOtpItinerary(itinerary: OTPItinerary, originLabel: string, destLabel: string) {
  const steps = itinerary.legs
    .filter((leg) => leg.transitLeg)
    .map((leg) => ({
      mode: mapOtpMode(leg.mode),
      line: leg.route || '',
      carrier: leg.agencyName || '',
      origin_stop: leg.from.name,
      origin_stop_id: leg.from.stopId,
      destination_stop: leg.to.name,
      destination_stop_id: leg.to.stopId,
      departure_at: leg.startTime,
      arrival_at: leg.endTime,
      duration_minutes: Math.round(leg.duration / 60),
      distance_meters: leg.distance ? Math.round(leg.distance) : undefined,
      num_stops: leg.numIntermediateStops,
    }));

  return {
    id: crypto.randomUUID(),
    origin: { lat: 0, lng: 0, label: originLabel },
    destination: { lat: 0, lng: 0, label: destLabel },
    departure_at: itinerary.startTime,
    arrival_at: itinerary.endTime,
    total_duration_minutes: Math.round(itinerary.duration / 60),
    fare: itinerary.fares?.[0]
      ? { amount: itinerary.fares[0].fare.cents / 100, currency: itinerary.fares[0].fare.currency.code }
      : undefined,
    steps,
    leg_count: steps.length,
    provider: 'otp' as const,
  };
}

function mapOtpMode(mode: string): string {
  const map: Record<string, string> = {
    RAIL: 'train',
    BUS: 'bus',
    SUBWAY: 'subway',
    TRAM: 'tram',
    FERRY: 'ferry',
    CABLE_CAR: 'cable_car',
    FUNICULAR: 'funicular',
    GONDOLA: 'cable_car',
  };
  return map[mode] ?? 'train';
}

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  try {
    await validateAuth(event.headers.authorization);
    const params = event.queryStringParameters ?? {};
    const { origin_lat, origin_lng, dest_lat, dest_lng, departure_time } = params;

    if (!origin_lat || !origin_lng || !dest_lat || !dest_lng) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing required params: origin_lat, origin_lng, dest_lat, dest_lng' }),
      };
    }

    const otpUrl = Resource.OtpServerUrl.value;
    const otpKey = Resource.OtpApiKey.value;

    const otpResponse = await fetch(
      `${otpUrl}/otp/routers/default/plan?` + new URLSearchParams({
        fromPlace: `${origin_lat},${origin_lng}`,
        toPlace: `${dest_lat},${dest_lng}`,
        time: departure_time
          ? new Date(departure_time).toLocaleTimeString('en-US', { hour12: false })
          : '12:00',
        date: departure_time
          ? new Date(departure_time).toISOString().split('T')[0]
          : new Date().toISOString().split('T')[0],
        mode: 'TRANSIT,WALK',
        maxWalkDistance: '1000',
        numItineraries: '5',
      }),
      {
        headers: {
          'Content-Type': 'application/json',
          ...(otpKey ? { 'x-api-key': otpKey } : {}),
        },
        signal: AbortSignal.timeout(15000),
      }
    );

    if (!otpResponse.ok) {
      console.error('[transit-search] OTP error:', otpResponse.status, await otpResponse.text());
      return { statusCode: 502, body: JSON.stringify({ error: 'Transit routing service unavailable' }) };
    }

    const otpData: OTPResponse = await otpResponse.json();
    if (otpData.error) {
      console.error('[transit-search] OTP error:', otpData.error);
      return { statusCode: 500, body: JSON.stringify({ error: otpData.error.msg }) };
    }

    const originLabel = `${origin_lat},${origin_lng}`;
    const destLabel = `${dest_lat},${dest_lng}`;
    const results = (otpData.plan?.itineraries ?? []).map((it) =>
      parseOtpItinerary(it, originLabel, destLabel)
    );

    return { statusCode: 200, body: JSON.stringify(results) };
  } catch (err: any) {
    if (err.message === 'Invalid token') {
      return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized' }) };
    }
    if (err instanceof Error && err.name === 'AbortError') {
      return { statusCode: 504, body: JSON.stringify({ error: 'Transit search timeout' }) };
    }
    console.error('[transit-search] error:', err);
    return { statusCode: 500, body: JSON.stringify({ error: 'Internal server error' }) };
  }
};
```

- [ ] **Step 2: Commit**

```bash
git add services/transit-search.ts
git commit -m "feat(transit): add transit search Lambda with OTP integration"
```

---

## Chunk 3: Frontend — Transit Components

### Task 3.1: Create local types and TransitCard

**Files:**
- Create: `apps/web/components/trip/transit/types.ts`
- Create: `apps/web/components/trip/transit/TransitCard.tsx`

- [ ] **Step 1: Create `apps/web/components/trip/transit/types.ts`**

```typescript
import type { TransitData } from '@travyl/shared';

export interface TransitCardViewModel {
  id: string;
  vehicleType: string;
  provider: string | null;
  routeName: string | null;
  origin: string;
  destination: string;
  departureAt: string | null;
  arrivalAt: string | null;
  departureDisplay: string | null;
  arrivalDisplay: string | null;
  bookingRef: string | null;
  price: number | null;
  currency: string;
}

export function buildTransitCardViewModel(data: TransitData): TransitCardViewModel {
  return {
    id: '',
    vehicleType: data.vehicleType,
    provider: data.provider,
    routeName: data.routeName,
    origin: data.originLabel,
    destination: data.destinationLabel,
    departureAt: data.departureAt,
    arrivalAt: data.arrivalAt,
    departureDisplay: data.departureAt
      ? new Date(data.departureAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      : null,
    arrivalDisplay: data.arrivalAt
      ? new Date(data.arrivalAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      : null,
    bookingRef: data.bookingRef,
    price: data.price,
    currency: data.currency,
  };
}
```

- [ ] **Step 2: Create `apps/web/components/trip/transit/TransitCard.tsx`**

```typescript
'use client';
import React from 'react';
import { MoreHorizontal, Train, Bus, Ship, CableCar } from 'lucide-react';
import type { TransitCardViewModel } from './types';

const VEHICLE_ICONS: Record<string, React.ReactNode> = {
  train: <Train size={16} />,
  bus: <Bus size={16} />,
  subway: <Train size={16} />,
  tram: <Train size={16} />,
  light_rail: <Train size={16} />,
  ferry: <Ship size={16} />,
  cable_car: <CableCar size={16} />,
  funicular: <CableCar size={16} />,
};

const VEHICLE_COLORS: Record<string, string> = {
  train: '#10B981',
  bus: '#F59E0B',
  subway: '#3B82F6',
  tram: '#8B5CF6',
  light_rail: '#8B5CF6',
  ferry: '#06B6D4',
  cable_car: '#EC4899',
  funicular: '#EC4899',
};

interface TransitCardProps {
  booking: TransitCardViewModel;
  onEdit: () => void;
  onDelete: () => void;
}

export function TransitCard({ booking, onEdit, onDelete }: TransitCardProps) {
  const [showMenu, setShowMenu] = React.useState(false);
  const menuRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    }
    if (showMenu) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showMenu]);

  const modeColor = VEHICLE_COLORS[booking.vehicleType] ?? '#6B7280';

  return (
    <div className="group relative bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4 hover:shadow-sm transition-shadow">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
            style={{ backgroundColor: `${modeColor}18` }}
          >
            <span style={{ color: modeColor }}>{VEHICLE_ICONS[booking.vehicleType] ?? <Train size={16} />}</span>
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-[13px] font-semibold text-gray-900 dark:text-white truncate">
                {booking.provider || 'Transit'}
              </span>
              <span className="text-[11px] text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded capitalize">
                {booking.vehicleType.replace('_', ' ')}
              </span>
            </div>
            {booking.routeName && (
              <p className="text-[13px] text-gray-600 dark:text-gray-400 mt-0.5 truncate">
                {booking.routeName}
              </p>
            )}
          </div>
        </div>

        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="opacity-0 group-hover:opacity-100 p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-all"
          >
            <MoreHorizontal size={16} className="text-gray-400" />
          </button>
          {showMenu && (
            <div className="absolute right-0 top-8 z-10 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg py-1 min-w-[120px]">
              <button
                onClick={() => { onEdit(); setShowMenu(false); }}
                className="w-full text-left px-3 py-1.5 text-[13px] text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                Edit
              </button>
              <button
                onClick={() => { onDelete(); setShowMenu(false); }}
                className="w-full text-left px-3 py-1.5 text-[13px] text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
              >
                Delete
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="mt-3 flex items-center gap-3 text-[13px]">
        <div className="flex-1">
          <p className="text-gray-900 dark:text-white font-medium">{booking.origin}</p>
          <p className="text-gray-500 dark:text-gray-400">{booking.departureDisplay || '—'}</p>
        </div>
        <div className="text-gray-300 dark:text-gray-600">→</div>
        <div className="flex-1 text-right">
          <p className="text-gray-900 dark:text-white font-medium">{booking.destination}</p>
          <p className="text-gray-500 dark:text-gray-400">{booking.arrivalDisplay || '—'}</p>
        </div>
      </div>

      {(booking.bookingRef || booking.price != null) && (
        <div className="mt-2 flex items-center gap-3 text-[11px] text-gray-500 dark:text-gray-400">
          {booking.bookingRef && <span>Ref: {booking.bookingRef}</span>}
          {booking.price != null && (
            <span className="ml-auto font-medium text-gray-700 dark:text-gray-300">
              {booking.currency}{booking.price}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/components/trip/transit/types.ts apps/web/components/trip/transit/TransitCard.tsx
git commit -m "feat(transit): add TransitCard component"
```

### Task 3.2: Create TransitForm

**File:**
- Create: `apps/web/components/trip/transit/TransitForm.tsx`

- [ ] **Step 1: Create `apps/web/components/trip/transit/TransitForm.tsx`**

```typescript
'use client';
import React from 'react';
import { FieldLabel, Input, Select, DateTimeInput, PrimaryButton, SecondaryButton } from '@/components/trip/BookingFormPrimitives';
import type { TransitData } from '@travyl/shared';

interface TransitFormProps {
  initial?: Partial<TransitData> & { id?: string };
  onSubmit: (data: TransitData) => Promise<void>;
  onCancel: () => void;
  onDelete?: () => Promise<void>;
  defaultCurrency?: string;
}

const VEHICLE_OPTIONS = [
  { value: 'train', label: 'Train' },
  { value: 'bus', label: 'Bus' },
  { value: 'subway', label: 'Subway/Metro' },
  { value: 'tram', label: 'Tram' },
  { value: 'light_rail', label: 'Light Rail' },
  { value: 'ferry', label: 'Ferry' },
  { value: 'cable_car', label: 'Cable Car' },
  { value: 'funicular', label: 'Funicular' },
  { value: 'rideshare', label: 'Rideshare' },
  { value: 'shuttle', label: 'Shuttle' },
];

function isoToLocalInput(iso: string | null | undefined): string {
  if (!iso) return '';
  try { return new Date(iso).toISOString().slice(0, 16); } catch { return ''; }
}

function localInputToIso(local: string): string {
  if (!local) return '';
  return new Date(local).toISOString();
}

export function TransitForm({ initial, onSubmit, onCancel, onDelete, defaultCurrency = 'USD' }: TransitFormProps) {
  const isEditing = !!initial?.id;

  const [vehicleType, setVehicleType] = React.useState(initial?.vehicleType ?? 'train');
  const [provider, setProvider] = React.useState(initial?.provider ?? '');
  const [routeName, setRouteName] = React.useState(initial?.routeName ?? '');
  const [originLabel, setOriginLabel] = React.useState(initial?.originLabel ?? '');
  const [destinationLabel, setDestinationLabel] = React.useState(initial?.destinationLabel ?? '');
  const [departureAt, setDepartureAt] = React.useState(isoToLocalInput(initial?.departureAt));
  const [arrivalAt, setArrivalAt] = React.useState(isoToLocalInput(initial?.arrivalAt));
  const [bookingRef, setBookingRef] = React.useState(initial?.bookingRef ?? '');
  const [confirmationCode, setConfirmationCode] = React.useState(initial?.confirmationCode ?? '');
  const [price, setPrice] = React.useState(initial?.price?.toString() ?? '');
  const [currency, setCurrency] = React.useState(initial?.currency ?? defaultCurrency);
  const [notes, setNotes] = React.useState(initial?.notes ?? '');
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [saving, setSaving] = React.useState(false);

  function validate(): boolean {
    const e: Record<string, string> = {};
    if (!originLabel.trim()) e.origin = 'Required';
    if (!destinationLabel.trim()) e.destination = 'Required';
    if (!departureAt) e.departureAt = 'Required';
    if (!arrivalAt) e.arrivalAt = 'Required';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    try {
      await onSubmit({
        vehicleType: vehicleType as any,
        provider: provider.trim() || null,
        routeName: routeName.trim() || null,
        originLabel: originLabel.trim(),
        destinationLabel: destinationLabel.trim(),
        departureAt: localInputToIso(departureAt),
        arrivalAt: localInputToIso(arrivalAt),
        price: price ? parseFloat(price) : null,
        currency,
        bookingRef: bookingRef.trim() || null,
        confirmationCode: confirmationCode.trim() || null,
        notes: notes.trim() || null,
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4 space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <FieldLabel>Mode</FieldLabel>
          <Select value={vehicleType} onChange={(e) => setVehicleType(e.target.value)}>
            {VEHICLE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </Select>
        </div>
        <div>
          <FieldLabel>Provider/Operator</FieldLabel>
          <Input value={provider} onChange={(e) => setProvider(e.target.value)} placeholder="JR East, MTA, SFMTA..." />
        </div>
      </div>

      <div>
        <FieldLabel>Route/Line Name</FieldLabel>
        <Input value={routeName} onChange={(e) => setRouteName(e.target.value)} placeholder="Yamanote Line, N'EX, 38 Geary..." />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <FieldLabel>Origin Stop</FieldLabel>
          <Input value={originLabel} onChange={(e) => setOriginLabel(e.target.value)} placeholder="Tokyo Station" error={errors.origin} />
        </div>
        <div>
          <FieldLabel>Destination Stop</FieldLabel>
          <Input value={destinationLabel} onChange={(e) => setDestinationLabel(e.target.value)} placeholder="Shinjuku Station" error={errors.destination} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <FieldLabel>Departure</FieldLabel>
          <DateTimeInput value={departureAt} onChange={(e) => setDepartureAt(e.target.value)} error={errors.departureAt} />
        </div>
        <div>
          <FieldLabel>Arrival</FieldLabel>
          <DateTimeInput value={arrivalAt} onChange={(e) => setArrivalAt(e.target.value)} error={errors.arrivalAt} />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <FieldLabel>Booking Ref</FieldLabel>
          <Input value={bookingRef} onChange={(e) => setBookingRef(e.target.value)} placeholder="Confirmation #" />
        </div>
        <div>
          <FieldLabel>Confirmation Code</FieldLabel>
          <Input value={confirmationCode} onChange={(e) => setConfirmationCode(e.target.value)} placeholder="e-ticket #" />
        </div>
        <div>
          <FieldLabel>Price</FieldLabel>
          <div className="flex gap-2">
            <Input type="number" min="0" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="0.00" className="flex-1" />
            <Input value={currency} onChange={(e) => setCurrency(e.target.value)} placeholder="USD" className="w-20" />
          </div>
        </div>
      </div>

      <div>
        <FieldLabel>Notes</FieldLabel>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="w-full px-3 py-2 text-[13px] border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 resize-none"
          rows={2}
          placeholder="Platform number, car number, transfer tips..."
        />
      </div>

      <div className="flex items-center justify-between pt-2">
        <div>
          {isEditing && onDelete && (
            <SecondaryButton type="button" onClick={onDelete} className="text-red-600 border-red-200 hover:bg-red-50">
              Delete
            </SecondaryButton>
          )}
        </div>
        <div className="flex items-center gap-2">
          <SecondaryButton type="button" onClick={onCancel}>Cancel</SecondaryButton>
          <PrimaryButton type="submit" disabled={saving}>
            {saving ? 'Saving...' : isEditing ? 'Save Changes' : 'Add Transit'}
          </PrimaryButton>
        </div>
      </div>
    </form>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/components/trip/transit/TransitForm.tsx
git commit -m "feat(transit): add TransitForm component"
```

### Task 3.3: Create TransitsModule (orchestrator)

**File:**
- Create: `apps/web/components/trip/transit/TransitsModule.tsx`

- [ ] **Step 1: Create `apps/web/components/trip/transit/TransitsModule.tsx`**

```typescript
'use client';
import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'next/navigation';
import { fetchTransit, deleteTransit, addTransit, updateTransit } from '@travyl/shared/services/transitApi';
import type { TransitData } from '@travyl/shared';
import { TransitCard } from './TransitCard';
import { TransitForm } from './TransitForm';
import { buildTransitCardViewModel } from './types';

interface TransitsModuleProps {
  tripId: string;
  defaultCurrency?: string;
}

export function TransitsModule({ tripId, defaultCurrency = 'USD' }: TransitsModuleProps) {
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();

  const { data: rawBookings = [], isLoading, error } = useQuery({
    queryKey: ['transit', tripId],
    queryFn: () => fetchTransit(tripId),
    staleTime: 5 * 60 * 1000,
  });

  const [adding, setAdding] = React.useState(false);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const hasExpandedRef = React.useRef(false);

  React.useEffect(() => {
    const expand = searchParams.get('expand');
    if (expand && !hasExpandedRef.current) {
      const booking = rawBookings.find((b) => b.id === expand);
      if (booking) { setEditingId(expand); hasExpandedRef.current = true; }
    }
  }, [searchParams, rawBookings]);

  React.useEffect(() => {
    function handleAdd() { setAdding(true); }
    window.addEventListener('transit:add', handleAdd);
    return () => window.removeEventListener('transit:add', handleAdd);
  }, []);

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ['transit', tripId] });
    queryClient.invalidateQueries({ queryKey: ['trip', tripId] });
  }

  const addMutation = useMutation({
    mutationFn: (data: TransitData) => addTransit(tripId, { trip_id: tripId, data }),
    onSuccess: () => { setAdding(false); invalidate(); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: TransitData }) => updateTransit(id, { data }),
    onSuccess: () => { setEditingId(null); invalidate(); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteTransit(id),
    onSuccess: () => { setEditingId(null); invalidate(); },
  });

  const bookings = React.useMemo(
    () => rawBookings.map((b) => ({ ...buildTransitCardViewModel(b.data), id: b.id }))
      .sort((a, b) => {
        if (!a.departureAt && !b.departureAt) return 0;
        if (!a.departureAt) return 1;
        if (!b.departureAt) return -1;
        return new Date(a.departureAt).getTime() - new Date(b.departureAt).getTime();
      }),
    [rawBookings]
  );

  if (isLoading) {
    return <div className="space-y-3">{[1, 2, 3].map((i) => <div key={i} className="h-24 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse" />)}</div>;
  }

  if (error) {
    return <div className="text-center py-12"><p className="text-[13px] text-red-500">Could not load transit bookings.</p></div>;
  }

  if (bookings.length === 0 && !adding) {
    return (
      <div className="text-center py-12">
        <p className="text-[15px] font-medium text-gray-900 dark:text-white">No transit bookings yet</p>
        <p className="text-[13px] text-gray-500 dark:text-gray-400 mt-1">Add a transit leg to your trip</p>
        <button
          onClick={() => setAdding(true)}
          className="mt-4 px-4 h-9 rounded-xl text-[13px] font-semibold text-white shadow-sm hover:shadow-md transition-shadow"
          style={{ backgroundColor: 'var(--trip-base)' }}
        >
          Add Transit
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {adding && (
        <TransitForm
          onSubmit={(data) => addMutation.mutateAsync(data)}
          onCancel={() => setAdding(false)}
          defaultCurrency={defaultCurrency}
        />
      )}
      {bookings.length > 0 && (
        <div className="space-y-3">
          {bookings.map((vm) =>
            editingId === vm.id ? (
              (() => {
                const booking = rawBookings.find((b) => b.id === vm.id);
                if (!booking) return null;
                return (
                  <TransitForm
                    key={vm.id}
                    initial={{ ...booking.data, id: booking.id }}
                    onSubmit={(data) => updateMutation.mutateAsync({ id: vm.id, data })}
                    onCancel={() => setEditingId(null)}
                    onDelete={() => deleteMutation.mutateAsync(vm.id)}
                    defaultCurrency={defaultCurrency}
                  />
                );
              })()
            ) : (
              <TransitCard
                key={vm.id}
                booking={vm}
                onEdit={() => setEditingId(vm.id)}
                onDelete={() => deleteMutation.mutateAsync(vm.id)}
              />
            )
          )}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/components/trip/transit/TransitsModule.tsx
git commit -m "feat(transit): add TransitsModule orchestrator"
```

---

## Chunk 4: Frontend — Transit Route Page + Sidebar

### Task 4.1: Create transit route page

**Files:**
- Create: `apps/web/app/(dashboard)/trip/[id]/transit/page.tsx`
- Modify: `apps/web/components/trip-rail.tsx`
- Modify: `apps/web/app/(dashboard)/trip/[id]/trip-layout-inner.tsx`

- [ ] **Step 1: Create `apps/web/app/(dashboard)/trip/[id]/transit/page.tsx`**

```typescript
'use client';
import { use } from 'react';
import { Plus } from 'lucide-react';
import { useItineraryScreen } from '@travyl/shared';
import { TransitsModule } from '@/components/trip/transit/TransitsModule';

export default function TransitPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { isLoading, trip } = useItineraryScreen(id);
  const tripCurrency = ((trip as any)?.currency ?? 'USD').match(/^[A-Z]{3}/)?.[0] ?? 'USD';

  if (isLoading) {
    return (
      <div className="w-full px-4 sm:px-6 lg:px-10 py-8 lg:py-12">
        <div className="h-8 w-24 bg-gray-100 dark:bg-gray-800 rounded animate-pulse mb-6" />
        <div className="space-y-3">{[1, 2, 3].map((i) => <div key={i} className="h-24 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse" />)}</div>
      </div>
    );
  }

  return (
    <div className="w-full px-4 sm:px-6 lg:px-10 py-8 lg:py-12">
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-[26px] font-serif font-normal text-gray-900 dark:text-white tracking-tight leading-tight">Transit</h1>
          <p className="text-[13px] text-gray-500 dark:text-gray-400 mt-1.5">Trains, buses, subways & more</p>
        </div>
        <button
          onClick={() => window.dispatchEvent(new CustomEvent('transit:add'))}
          className="flex items-center gap-1.5 px-3 h-9 rounded-xl text-[12px] font-semibold text-white shadow-sm hover:shadow-md transition-shadow"
          style={{ backgroundColor: 'var(--trip-base)' }}
        >
          <Plus size={13} /> Transit
        </button>
      </div>
      <TransitsModule tripId={id} defaultCurrency={tripCurrency} />
    </div>
  );
}
```

- [ ] **Step 2: Add transit tab to `apps/web/components/trip-rail.tsx`**

In `ALL_TABS` array, add after the cars entry:
```typescript
{ segment: 'transit', label: 'Transit', subtitle: 'Public transit & routes', icon: Train, color: DEFAULT_COLOR },
```

In `TAB_GROUPS`, add `'transit'` to the `'book'` group's segments (between `'flights'` and `'cars'`):
```typescript
{ id: 'book', segments: ['hotels', 'flights', 'transit', 'cars'] },
```

In `MOBILE_PRIMARY`, add `'transit'`:
```typescript
const MOBILE_PRIMARY: string[] = ['', 'itinerary', 'hotels', 'flights', 'transit', 'activities'];
```

Import the `Train` icon from `lucide-react` at the top of the file. Check if `Train` exists in lucide-react; if not use `TramFront`.

- [ ] **Step 3: Add transit to tabOrder in `trip-layout-inner.tsx`**

```typescript
const tabOrder = ['', 'itinerary', 'calendar', 'hotels', 'flights', 'transit', 'restaurants', 'activities', 'packing', 'budget', 'cars'];
```

- [ ] **Step 4: Commit**

```bash
git add apps/web/app/\(dashboard\)/trip/\[id\]/transit/page.tsx apps/web/components/trip-rail.tsx apps/web/app/\(dashboard\)/trip/\[id\]/trip-layout-inner.tsx
git commit -m "feat(transit): add transit route page and sidebar tab"
```

---

## Chunk 5: Transit Search Panel + Direction Results

### Task 5.1: Create search components with geocoding

**Files:**
- Create: `apps/web/components/trip/transit/TransitSearchPanel.tsx`
- Create: `apps/web/components/trip/transit/TransitDirectionResults.tsx`

- [ ] **Step 1: Create `apps/web/components/trip/transit/TransitSearchPanel.tsx`**

```typescript
'use client';
import React from 'react';
import { PrimaryButton, SecondaryButton, FieldLabel, Input, DateInput } from '@/components/trip/BookingFormPrimitives';

export interface TransitSearchParams {
  originLat: number;
  originLng: number;
  destLat: number;
  destLng: number;
  departureTime: string;
  originLabel: string;
  destLabel: string;
}

interface TransitSearchPanelProps {
  onSearch: (params: TransitSearchParams) => void;
  onCancel: () => void;
  isSearching: boolean;
}

/**
 * Geocode a place name to lat/lng using the browser Geolocation API
 * or the existing Places API. Falls back to a simple name-based lookup.
 *
 * For the MVP, this uses a simple coordinate format (lat,lng) or
 * passes the name through for OTP to resolve. A production version
 * should use the Mapbox/Google geocoding API.
 */
async function geocode(place: string): Promise<{ lat: number; lng: number; label: string }> {
  // Check if already coordinates
  const coordMatch = place.match(/^(-?\d+\.?\d*),\s*(-?\d+\.?\d*)$/);
  if (coordMatch) {
    return { lat: parseFloat(coordMatch[1]), lng: parseFloat(coordMatch[2]), label: place };
  }

  // Try the Nominatim geocoding API (free, no key needed for low volume)
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(place)}&limit=1`,
      { headers: { 'User-Agent': 'Travyl/1.0' } }
    );
    if (response.ok) {
      const data = await response.json();
      if (data.length > 0) {
        return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon), label: data[0].display_name };
      }
    }
  } catch {
    // fall through
  }

  // Return placeholder — OTP may still route based on approximate location
  return { lat: 0, lng: 0, label: place };
}

export function TransitSearchPanel({ onSearch, onCancel, isSearching }: TransitSearchPanelProps) {
  const [origin, setOrigin] = React.useState('');
  const [destination, setDestination] = React.useState('');
  const [departureDate, setDepartureDate] = React.useState('');
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [geocoding, setGeocoding] = React.useState(false);

  function validate(): boolean {
    const e: Record<string, string> = {};
    if (!origin.trim()) e.origin = 'Enter origin';
    if (!destination.trim()) e.destination = 'Enter destination';
    if (!departureDate) e.departureDate = 'Select date';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setGeocoding(true);
    try {
      const [originGeo, destGeo] = await Promise.all([
        geocode(origin.trim()),
        geocode(destination.trim()),
      ]);
      onSearch({
        originLat: originGeo.lat,
        originLng: originGeo.lng,
        destLat: destGeo.lat,
        destLng: destGeo.lng,
        departureTime: new Date(departureDate).toISOString(),
        originLabel: originGeo.label,
        destLabel: destGeo.label,
      });
    } finally {
      setGeocoding(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4 space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <FieldLabel>Origin</FieldLabel>
          <Input
            value={origin}
            onChange={(e) => setOrigin(e.target.value)}
            placeholder="Station name or address"
            error={errors.origin}
          />
        </div>
        <div>
          <FieldLabel>Destination</FieldLabel>
          <Input
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
            placeholder="Station name or address"
            error={errors.destination}
          />
        </div>
      </div>
      <div className="w-48">
        <FieldLabel>Departure Date</FieldLabel>
        <DateInput value={departureDate} onChange={(e) => setDepartureDate(e.target.value)} error={errors.departureDate} />
      </div>
      <div className="flex items-center justify-end gap-2">
        <SecondaryButton type="button" onClick={onCancel}>Cancel</SecondaryButton>
        <PrimaryButton type="submit" disabled={isSearching || geocoding}>
          {isSearching || geocoding ? 'Searching...' : 'Search Routes'}
        </PrimaryButton>
      </div>
    </form>
  );
}
```

- [ ] **Step 2: Create `apps/web/components/trip/transit/TransitDirectionResults.tsx`**

```typescript
'use client';
import React from 'react';
import type { TransitDirectionResult } from '@travyl/shared';

interface TransitDirectionResultsProps {
  results: TransitDirectionResult[];
  isLoading: boolean;
  error: string | null;
  onAddToTrip: (result: TransitDirectionResult) => void;
  onRetry: () => void;
}

export function TransitDirectionResults({ results, isLoading, error, onAddToTrip, onRetry }: TransitDirectionResultsProps) {
  if (isLoading) {
    return <div className="space-y-3">{[1, 2].map((i) => <div key={i} className="h-28 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse" />)}</div>;
  }
  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-[13px] text-red-500">{error}</p>
        <button onClick={onRetry} className="mt-3 text-[13px] text-blue-600 hover:underline">Try again</button>
      </div>
    );
  }
  if (results.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-[13px] text-gray-500 dark:text-gray-400">No transit routes found. Try adjusting your departure time.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-[13px] font-medium text-gray-700 dark:text-gray-300">{results.length} route{results.length > 1 ? 's' : ''} found</p>
      {results.map((result, idx) => (
        <div key={result.id || idx} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4 hover:shadow-sm transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <span className="text-[13px] font-semibold text-gray-900 dark:text-white">
                {Math.floor(result.total_duration_minutes / 60)}h {result.total_duration_minutes % 60}m
              </span>
              {result.fare && <span className="text-[12px] text-gray-500">{result.fare.currency} {result.fare.amount.toFixed(2)}</span>}
              <span className="text-[12px] text-gray-400">{result.leg_count} leg{result.leg_count > 1 ? 's' : ''}</span>
            </div>
            <button
              onClick={() => onAddToTrip(result)}
              className="px-3 h-8 rounded-lg text-[12px] font-semibold text-white shadow-sm hover:shadow-md transition-shadow"
              style={{ backgroundColor: 'var(--trip-base)' }}
            >
              Add to Trip
            </button>
          </div>
          <div className="space-y-2">
            {result.steps.map((step, sIdx) => (
              <div key={sIdx} className="flex items-center gap-2 text-[12px]">
                <span className="text-gray-400 font-mono uppercase">{step.mode.slice(0, 3)}</span>
                <span className="text-gray-700 dark:text-gray-300 font-medium">{step.line}</span>
                <span className="text-gray-400">{step.origin_stop}</span>
                <span className="text-gray-300">→</span>
                <span className="text-gray-400">{step.destination_stop}</span>
                {step.num_stops != null && <span className="text-gray-400">({step.num_stops} stops)</span>}
                <span className="text-gray-400 ml-auto">{step.duration_minutes} min</span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 3: Create Next.js API proxy routes**

Create `apps/web/app/api/transit/directions/route.ts`:
```typescript
import { NextRequest, NextResponse } from 'next/server';

const API_URL = process.env.NEXT_PUBLIC_RECOMMENDATION_API_URL;

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (!authHeader) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const searchParams = req.nextUrl.searchParams;
  if (!searchParams.get('origin_lat') || !searchParams.get('dest_lat')) {
    return NextResponse.json({ error: 'Missing required params' }, { status: 400 });
  }

  try {
    const response = await fetch(
      `${API_URL}/transit/directions?${searchParams.toString()}`,
      { headers: { authorization: authHeader } }
    );
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('[transit-directions-proxy] error:', error);
    return NextResponse.json({ error: 'Transit search failed' }, { status: 502 });
  }
}
```

Create `apps/web/app/api/transit/bookings/route.ts`:
```typescript
import { NextRequest, NextResponse } from 'next/server';

const API_URL = process.env.NEXT_PUBLIC_RECOMMENDATION_API_URL;

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (!authHeader) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const searchParams = req.nextUrl.searchParams;
  const response = await fetch(`${API_URL}/transit/bookings?${searchParams.toString()}`, {
    headers: { authorization: authHeader },
  });
  return NextResponse.json(await response.json(), { status: response.status });
}

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (!authHeader) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const response = await fetch(`${API_URL}/transit/book`, {
    method: 'POST',
    headers: { authorization: authHeader, 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  return NextResponse.json(await response.json(), { status: response.status });
}
```

Also create `apps/web/app/api/transit/bookings/[id]/route.ts` for PUT and DELETE:
```typescript
import { NextRequest, NextResponse } from 'next/server';

const API_URL = process.env.NEXT_PUBLIC_RECOMMENDATION_API_URL;

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const authHeader = req.headers.get('authorization');
  if (!authHeader) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await req.json();
  const response = await fetch(`${API_URL}/transit/book/${params.id}`, {
    method: 'PUT',
    headers: { authorization: authHeader, 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  return NextResponse.json(await response.json(), { status: response.status });
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const authHeader = req.headers.get('authorization');
  if (!authHeader) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const response = await fetch(`${API_URL}/transit/book/${params.id}`, {
    method: 'DELETE',
    headers: { authorization: authHeader },
  });
  return NextResponse.json(await response.json(), { status: response.status });
}
```

- [ ] **Step 4: Wire search into TransitsModule**

In `TransitsModule.tsx`, add after the `adding` block and before the bookings list:
```typescript
{searching && (
  <div className="mb-4 space-y-4">
    <TransitSearchPanel
      onSearch={handleSearch}
      onCancel={() => { setSearching(false); setSearchResults([]); setSearchError(null); }}
      isSearching={searchLoading}
    />
    {(searchResults.length > 0 || searchLoading || searchError) && (
      <TransitDirectionResults
        results={searchResults}
        isLoading={searchLoading}
        error={searchError}
        onAddToTrip={handleAddFromSearch}
        onRetry={() => handleSearchWithParams(lastSearchParams)}
      />
    )}
  </div>
)}
```

Add these to the TransitsModule:
```typescript
import { getSupabaseBrowser } from '@/lib/supabase-browser';
import { TransitSearchPanel, type TransitSearchParams } from './TransitSearchPanel';
import { TransitDirectionResults } from './TransitDirectionResults';
import type { TransitDirectionResult } from '@travyl/shared';

// Inside the component body:
const [searching, setSearching] = React.useState(false);
const [searchResults, setSearchResults] = React.useState<TransitDirectionResult[]>([]);
const [searchLoading, setSearchLoading] = React.useState(false);
const [searchError, setSearchError] = React.useState<string | null>(null);
const lastSearchParamsRef = React.useRef<TransitSearchParams | null>(null);

async function getAuthToken(): Promise<string> {
  const supabase = getSupabaseBrowser();
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? '';
}

async function handleSearch(params: TransitSearchParams) {
  lastSearchParamsRef.current = params;
  setSearchLoading(true);
  setSearchError(null);
  try {
    const token = await getAuthToken();
    const response = await fetch(
      `/api/transit/directions?origin_lat=${params.originLat}&origin_lng=${params.originLng}` +
      `&dest_lat=${params.destLat}&dest_lng=${params.destLng}` +
      `&departure_time=${encodeURIComponent(params.departureTime)}`,
      { headers: { authorization: `Bearer ${token}` } }
    );
    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error || 'Search failed');
    }
    setSearchResults(await response.json());
  } catch (err: any) {
    setSearchError(err.message);
  } finally {
    setSearchLoading(false);
  }
}

async function handleAddFromSearch(result: TransitDirectionResult) {
  await addMutation.mutateAsync({
    vehicleType: result.steps[0]?.mode ?? 'train',
    provider: result.steps[0]?.carrier ?? '',
    routeName: result.steps.map((s) => s.line).filter(Boolean).join(' → ') || 'Transit route',
    originLabel: result.origin.label,
    destinationLabel: result.destination.label,
    departureAt: result.departure_at,
    arrivalAt: result.arrival_at,
    price: result.fare?.amount ?? null,
    currency: result.fare?.currency ?? 'USD',
    bookingRef: null,
    confirmationCode: null,
    notes: null,
  });
  setSearching(false);
  setSearchResults([]);
}
```

- [ ] **Step 5: Commit**

```bash
git add apps/web/components/trip/transit/TransitSearchPanel.tsx apps/web/components/trip/transit/TransitDirectionResults.tsx apps/web/app/api/transit/
git commit -m "feat(transit): add transit search panel, results, and API proxy"
```

---

## Verification

After all chunks are implemented:

1. **Typecheck:** `npm run typecheck` — should pass with no errors
2. **Lint:** `npm run lint` — should pass
3. **Build web:** `cd apps/web && npm run build` — should succeed
4. **Manual testing:**
   - Navigate to trip → Transit tab appears in sidebar
   - Click Transit tab → empty state with "Add Transit" button
   - Click "Add Transit" → form with all fields → submit → card appears
   - Edit card → form pre-fills → save → card updates
   - Delete card → card removed
   - Verify `fetchTransit` query works: no errors in console
