-- Simplify session modes: together/solo instead of together/solo-a/solo-b
-- Run this in Supabase SQL Editor after 001_initial_schema.sql

ALTER TABLE public.sessions DROP CONSTRAINT IF EXISTS sessions_mode_check;
ALTER TABLE public.sessions ADD CONSTRAINT sessions_mode_check
  CHECK (mode IN ('together', 'solo', 'solo-a', 'solo-b'));
-- Keeping solo-a and solo-b for backward compatibility with any existing data
