-- Add home_airport (IATA code) to profiles for flight search auto-populate.
-- Stored as a 3-letter IATA string; nullable for users who haven't set one.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS home_airport TEXT;

COMMENT ON COLUMN public.profiles.home_airport IS
  'IATA airport code (e.g. "SFO") used to pre-fill the From field on flight search.';
