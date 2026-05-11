import { APIGatewayProxyHandlerV2 } from 'aws-lambda';
import { Resource } from 'sst';
import { createClient } from '@supabase/supabase-js';
import { validateAuth } from './lib/auth';
import { safeParseBody } from './lib/validation';

const supabase = createClient(Resource.SupabaseUrl.value, Resource.SupabaseSecretKey.value);

// The `transit` table may not exist in all environments — PostgREST returns
// PGRST205 / 42P01 when the relation is missing. Handle gracefully.
const MISSING_TABLE_CODES = new Set(['PGRST205', '42P01']);

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
      if (MISSING_TABLE_CODES.has(error.code ?? '')) {
        return { statusCode: 200, body: JSON.stringify([]) };
      }
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
      if (MISSING_TABLE_CODES.has(error.code ?? '')) {
        return { statusCode: 503, body: JSON.stringify({ error: 'Transit table not yet provisioned' }) };
      }
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
      if (MISSING_TABLE_CODES.has(error.code ?? '')) {
        return { statusCode: 503, body: JSON.stringify({ error: 'Transit table not yet provisioned' }) };
      }
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
      if (MISSING_TABLE_CODES.has(error.code ?? '')) {
        return { statusCode: 503, body: JSON.stringify({ error: 'Transit table not yet provisioned' }) };
      }
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
