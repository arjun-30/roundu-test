-- Migration: 002.sql
-- Create bookings table

CREATE TABLE IF NOT EXISTS bookings (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  service_id      VARCHAR(255),
  status          VARCHAR(50) NOT NULL DEFAULT 'pending',
  scheduled_at    TIMESTAMPTZ,
  address         TEXT,
  lat             NUMERIC(10, 7),
  lng             NUMERIC(10, 7),
  price           NUMERIC(10, 2),
  notes           TEXT,
  voice_note      BOOLEAN DEFAULT FALSE,
  voice_note_url  VARCHAR(500),
  paid            BOOLEAN DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bookings_customer    ON bookings(customer_id);
CREATE INDEX IF NOT EXISTS idx_bookings_provider    ON bookings(provider_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status      ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_scheduled   ON bookings(scheduled_at);
