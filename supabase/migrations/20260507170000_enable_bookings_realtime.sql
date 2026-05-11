-- Enable Supabase Realtime Postgres Changes for booking-related tables.
-- useItineraryScreen subscribes to postgres_changes on these tables so
-- collaborators see flight, hotel, transit, car, and trip edits in real time.
-- Without this migration, the subscriptions silently receive no events.

ALTER PUBLICATION supabase_realtime ADD TABLE trips;
ALTER PUBLICATION supabase_realtime ADD TABLE flights;
ALTER PUBLICATION supabase_realtime ADD TABLE hotels;
ALTER PUBLICATION supabase_realtime ADD TABLE transit;
ALTER PUBLICATION supabase_realtime ADD TABLE cars;
