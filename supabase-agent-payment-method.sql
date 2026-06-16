-- Migration: add agent_payment_method column to profiles
  -- Run this once in Supabase SQL Editor
  ALTER TABLE profiles ADD COLUMN IF NOT EXISTS agent_payment_method text;

  -- After running, you can set an agent's payment method directly:
  -- UPDATE profiles SET agent_payment_method = 'transferencia' WHERE agent_code = 'EA-JLK8B7HQ';
  -- UPDATE profiles SET agent_payment_method = 'efectivo' WHERE agent_code = 'EA-JLK8B7HQ';

  -- Grant access via RLS (if needed)
  -- The column is readable/writable by the authenticated user owning the profile.
  