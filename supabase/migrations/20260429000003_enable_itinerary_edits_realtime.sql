-- Enable Supabase Realtime for the itinerary_edits table
ALTER PUBLICATION supabase_realtime ADD TABLE itinerary_edits;

-- Allow activity_id to be NULL for trip-level edits (like rescaling/rescoper)
ALTER TABLE itinerary_edits ALTER COLUMN activity_id DROP NOT NULL;
