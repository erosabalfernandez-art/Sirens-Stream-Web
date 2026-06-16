-- Migration: add delete_worker_entry RPC function
  -- Run this in the Supabase SQL Editor

  -- Function allows a user to delete their own worker entry, bypassing PostgREST filter issues.
  -- SECURITY DEFINER so it runs with elevated privileges (bypasses RLS).
  CREATE OR REPLACE FUNCTION delete_worker_entry(entry_id UUID, requesting_user_id UUID)
  RETURNS BOOLEAN
  LANGUAGE plpgsql
  SECURITY DEFINER
  AS $$
  DECLARE
    deleted_app TEXT;
  BEGIN
    -- Only delete if the entry belongs to the requesting user
    DELETE FROM worker_entries
    WHERE id = entry_id AND user_id = requesting_user_id
    RETURNING app_name INTO deleted_app;

    -- Also clean up custom_worker_rates for this user+app
    IF FOUND AND deleted_app IS NOT NULL THEN
      DELETE FROM custom_worker_rates
      WHERE user_id = requesting_user_id AND app_name = deleted_app;
    END IF;

    RETURN FOUND;
  END;
  $$;

  -- Grant execute to the anon and authenticated roles
  GRANT EXECUTE ON FUNCTION delete_worker_entry(UUID, UUID) TO anon, authenticated;
  