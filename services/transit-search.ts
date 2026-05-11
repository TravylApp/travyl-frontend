import { APIGatewayProxyHandlerV2 } from 'aws-lambda';
import { Resource } from 'sst';
import { validateAuth } from './lib/auth';

// ─── Region routing ────────────────────────────────────────
// Maps bounding boxes to OTP region names. When OTP instances are
// added for additional regions, add entries here. The handler checks
// that query coordinates fall within a known region before querying.

interface BoundingBox {
  name: string;
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
}

const REGIONS: BoundingBox[] = [
  {
    name: 'NYC Metro',
    minLat: 40.4,
    maxLat: 41.2,
    minLng: -74.6,
    maxLng: -73.5,
  },
];

function findRegion(lat: number, lng: number): BoundingBox | null {
  for (const region of REGIONS) {
    if (lat >= region.minLat && lat <= region.maxLat && lng >= region.minLng && lng <= region.maxLng) {
      return region;
    }
  }
  return null;
}

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

  const firstLeg = itinerary.legs[0];
  const lastLeg = itinerary.legs[itinerary.legs.length - 1];

  return {
    id: crypto.randomUUID(),
    origin: { lat: firstLeg?.from.lat ?? 0, lng: firstLeg?.from.lng ?? 0, label: originLabel },
    destination: { lat: lastLeg?.to.lat ?? 0, lng: lastLeg?.to.lng ?? 0, label: destLabel },
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

    // Validate coordinates fall within a known OTP region
    const originLat = parseFloat(origin_lat);
    const originLng = parseFloat(origin_lng);
    const destLat = parseFloat(dest_lat);
    const destLng = parseFloat(dest_lng);

    const originRegion = findRegion(originLat, originLng);
    const destRegion = findRegion(destLat, destLng);

    if (!originRegion) {
      return {
        statusCode: 503,
        body: JSON.stringify({
          error: `Transit routing not available for origin coordinates (${origin_lat}, ${origin_lng}). Currently serving: ${REGIONS.map((r) => r.name).join(', ')}`,
        }),
      };
    }
    if (!destRegion) {
      return {
        statusCode: 503,
        body: JSON.stringify({
          error: `Transit routing not available for destination coordinates (${dest_lat}, ${dest_lng}). Currently serving: ${REGIONS.map((r) => r.name).join(', ')}`,
        }),
      };
    }

    const otpUrl = Resource.OtpServerUrl.value;
    const otpKey = Resource.OtpApiKey.value;

    if (!otpUrl || otpUrl === 'placeholder') {
      return { statusCode: 503, body: JSON.stringify({ error: 'Transit routing not configured' }) };
    }

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
