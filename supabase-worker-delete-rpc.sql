-- Migration: delete_worker_entry RPC (v2 — TEXT params to avoid PostgREST uuid cast issue)
  -- Run this in the Supabase SQL Editor (replaces previous version if any)

  CREATE OR REPLACE FUNCTION delete_worker_entry(entry_id TEXT, requesting_user_id TEXT)
  RETURNS BOOLEAN
  LANGUAGE plpgsql
  SECURITY DEFINER
  AS $$
  DECLARE
    deleted_app TEXT;
  BEGIN
    -- Cast TEXT to UUID explicitly so PostgreSQL finds the right operator
    DELETE FROM worker_entries
    WHERE id = entry_id::UUID AND user_id = requesting_user_id::UUID
    RETURNING app_name INTO deleted_app;

    IF FOUND AND deleted_app IS NOT NULL THEN
      DELETE FROM custom_worker_rates
      WHERE user_id = requesting_user_id::UUID AND app_name = deleted_app;
    END IF;

    RETURN FOUND;
  END;
  $$;

  -- Grant execute to anon and authenticated roles
  GRANT EXECUTE ON FUNCTION delete_worker_entry(TEXT, TEXT) TO anon, authenticated;
  