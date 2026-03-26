-- Drop existing function first (return type changed)
DROP FUNCTION IF EXISTS search_entities(TEXT, UUID, TEXT[], UUID, INT);

-- Recreate with latitude and longitude in return type
CREATE OR REPLACE FUNCTION search_entities(
  query TEXT,
  match_user_id UUID,
  entity_types TEXT[] DEFAULT ARRAY['hotel','flight','restaurant','activity','destination'],
  match_trip_id UUID DEFAULT NULL,
  match_count INT DEFAULT 20
)
RETURNS TABLE (
  entity_id UUID,
  entity_type TEXT,
  entity_name TEXT,
  entity_subtitle TEXT,
  trip_id UUID,
  trip_title TEXT,
  trip_destination TEXT,
  image_url TEXT,
  score FLOAT,
  latitude FLOAT,
  longitude FLOAT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT * FROM (

    -- Hotels
    SELECT h.id                                                AS entity_id,
           'hotel'::TEXT                                       AS entity_type,
           (h.data->>'name')::TEXT                            AS entity_name,
           (h.data->>'address')::TEXT                         AS entity_subtitle,
           h.trip_id                                          AS trip_id,
           t.title                                            AS trip_title,
           t.destination                                      AS trip_destination,
           (h.data->>'image_url')::TEXT                       AS image_url,
           (CASE WHEN h.trip_id = match_trip_id THEN 1.5 ELSE 1.0 END)::FLOAT AS score,
           (h.data->>'latitude')::FLOAT                      AS latitude,
           (h.data->>'longitude')::FLOAT                     AS longitude
    FROM hotels h
    JOIN trips t ON h.trip_id = t.id
    WHERE t.user_id = match_user_id
      AND 'hotel' = ANY(entity_types)
      AND (
        h.data->>'name' ILIKE '%' || query || '%'
        OR h.data->>'address' ILIKE '%' || query || '%'
        OR h.data->>'booking_ref' ILIKE '%' || query || '%'
      )

    UNION ALL

    -- Flights
    SELECT f.id,
           'flight'::TEXT,
           ((f.data->>'airline') || ' ' || COALESCE(f.data->>'flight_number', ''))::TEXT,
           ((f.data->>'origin_iata') || ' → ' || (f.data->>'dest_iata'))::TEXT,
           f.trip_id, t.title, t.destination,
           NULL::TEXT,
           (CASE WHEN f.trip_id = match_trip_id THEN 1.5 ELSE 1.0 END)::FLOAT,
           NULL::FLOAT,
           NULL::FLOAT
    FROM flights f
    JOIN trips t ON f.trip_id = t.id
    WHERE t.user_id = match_user_id
      AND 'flight' = ANY(entity_types)
      AND (
        f.data->>'airline' ILIKE '%' || query || '%'
        OR f.data->>'flight_number' ILIKE '%' || query || '%'
        OR f.data->>'origin_iata' ILIKE '%' || query || '%'
        OR f.data->>'dest_iata' ILIKE '%' || query || '%'
      )

    UNION ALL

    -- Restaurants (activity_type = 'food')
    SELECT a.id,
           'restaurant'::TEXT,
           a.activity_name,
           (a.activity_data->>'location_name')::TEXT,
           a.trip_id, t.title, t.destination,
           (a.activity_data->>'image_url')::TEXT,
           (CASE WHEN a.trip_id = match_trip_id THEN 1.5 ELSE 1.0 END)::FLOAT,
           a.latitude::FLOAT,
           a.longitude::FLOAT
    FROM activity a
    JOIN trips t ON a.trip_id = t.id
    WHERE t.user_id = match_user_id
      AND 'restaurant' = ANY(entity_types)
      AND a.activity_type = 'food'
      AND (
        a.activity_name ILIKE '%' || query || '%'
        OR a.notes ILIKE '%' || query || '%'
        OR a.activity_data->>'location_name' ILIKE '%' || query || '%'
      )

    UNION ALL

    -- Activities (non-food, non-hotel)
    SELECT a.id,
           'activity'::TEXT,
           a.activity_name,
           (a.activity_data->>'location_name')::TEXT,
           a.trip_id, t.title, t.destination,
           (a.activity_data->>'image_url')::TEXT,
           (CASE WHEN a.trip_id = match_trip_id THEN 1.5 ELSE 1.0 END)::FLOAT,
           a.latitude::FLOAT,
           a.longitude::FLOAT
    FROM activity a
    JOIN trips t ON a.trip_id = t.id
    WHERE t.user_id = match_user_id
      AND 'activity' = ANY(entity_types)
      AND a.activity_type NOT IN ('food', 'hotel')
      AND (
        a.activity_name ILIKE '%' || query || '%'
        OR a.notes ILIKE '%' || query || '%'
        OR a.activity_data->>'location_name' ILIKE '%' || query || '%'
        OR a.activity_data->>'category' ILIKE '%' || query || '%'
      )

    UNION ALL

    -- Destinations (grouped by destination name)
    SELECT gen_random_uuid(),
           'destination'::TEXT,
           t.destination,
           (COUNT(*)::TEXT || ' trips')::TEXT,
           NULL::UUID, NULL::TEXT, t.destination,
           NULL::TEXT,
           1.0::FLOAT,
           NULL::FLOAT,
           NULL::FLOAT
    FROM trips t
    WHERE t.user_id = match_user_id
      AND 'destination' = ANY(entity_types)
      AND t.destination ILIKE '%' || query || '%'
    GROUP BY t.destination

  ) AS results
  ORDER BY results.score DESC
  LIMIT match_count;
END;
$$;
