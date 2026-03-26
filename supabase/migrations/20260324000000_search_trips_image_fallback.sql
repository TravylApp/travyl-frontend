-- supabase/migrations/20260324000000_search_trips_lower_threshold.sql
-- Lower similarity threshold from 0.4 to 0.15 for short keyword queries

CREATE OR REPLACE FUNCTION search_trips(
  query_embedding vector(1024),
  match_user_id uuid,
  match_count int DEFAULT 5
)
RETURNS TABLE (
  trip_id uuid,
  metadata jsonb,
  score float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    te.trip_id,
    te.metadata,
    (1 - (te.embedding <=> query_embedding))::float AS score
  FROM trip_embeddings te
  WHERE te.user_id = match_user_id
    AND (1 - (te.embedding <=> query_embedding)) >= 0.15
  ORDER BY te.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
