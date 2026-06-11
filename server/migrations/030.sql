-- Migration 030: Add location columns to bookings table
-- Ensures lat/lng columns exist for storing booking location data

ALTER TABLE bookings ADD COLUMN IF NOT EXISTS lat NUMERIC(10, 7);
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS lng NUMERIC(10, 7);
