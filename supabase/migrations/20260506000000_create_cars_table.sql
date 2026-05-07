CREATE TABLE IF NOT EXISTS cars (
  id         uuid        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  trip_id    uuid        NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  data       jsonb       NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE cars ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own cars"
  ON cars FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM trips t
      WHERE t.id = cars.trip_id AND t.user_id = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS idx_cars_trip_id ON cars (trip_id);
