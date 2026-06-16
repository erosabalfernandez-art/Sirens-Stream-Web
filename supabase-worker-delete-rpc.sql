-- Migration: delete_worker_entry RPC (final — drop old UUID version first)
  -- Run this in the Supabase SQL Editor

  -- Step 1: Drop the old UUID-param version if it exists
  DROP FUNCTION IF EXISTS delete_worker_entry(UUID, UUID);

  -- Step 2: Create/replace the TEXT-param version
  CREATE OR REPLACE FUNCTION delete_worker_entry(entry_id TEXT, requesting_user_id TEXT)
  RETURNS BOOLEAN
  LANGUAGE plpgsql
  SECURITY DEFINER
  AS $$
  DECLARE
    deleted_app TEXT;
  BEGIN
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

  GRANT EXECUTE ON FUNCTION delete_worker_entry(TEXT, TEXT) TO anon, authenticated;
  