-- Migration: 029_voice_note_url.sql
-- Owner: Dev 4

-- Add voice_note_url to bookings table
ALTER TABLE bookings
ADD COLUMN voice_note_url TEXT;
