-- supabase/migrations/20260321000000_context_search.sql
-- Enables semantic trip search via pgvector + Bedrock Titan embeddings

-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Create trip_embeddings table
CREATE TABLE IF NOT EXISTS trip_embeddings (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  trip_id uuid NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id),
  embedding vector(1024) NOT NULL,
  text_content text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(trip_id)
);

-- HNSW index for cosine similarity (no training needed, works at any row count)
CREATE INDEX IF NOT EXISTS trip_embeddings_vector_idx
  ON trip_embeddings USING hnsw (embedding vector_cosine_ops);

-- RLS
ALTER TABLE trip_embeddings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own embeddings"
  ON trip_embeddings FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage embeddings"
  ON trip_embeddings FOR ALL USING (true);

-- Search RPC
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
    AND (1 - (te.embedding <=> query_embedding)) >= 0.4
  ORDER BY te.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
