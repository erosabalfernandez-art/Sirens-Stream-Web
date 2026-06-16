-- Migration: delete_worker_entry RPC (final fix — user_id is TEXT not UUID)
  -- Run this in the Supabase SQL Editor

  DROP FUNCTION IF EXISTS delete_worker_entry(UUID, UUID);
  DROP FUNCTION IF EXISTS delete_worker_entry(TEXT, TEXT);

  CREATE OR REPLACE FUNCTION delete_worker_entry(entry_id TEXT, requesting_user_id TEXT)
  RETURNS BOOLEAN
  LANGUAGE plpgsql
  SECURITY DEFINER
  AS $$
  DECLARE
    deleted_app TEXT;
  BEGIN
    -- id column is UUID, user_id column is TEXT — cast only entry_id
    DELETE FROM worker_entries
    WHERE id = entry_id::UUID AND user_id = requesting_user_id
    RETURNING app_name INTO deleted_app;

    IF FOUND AND deleted_app IS NOT NULL THEN
      DELETE FROM custom_worker_rates
      WHERE user_id = requesting_user_id AND app_name = deleted_app;
    END IF;

    RETURN FOUND;
  END;
  $$;

  GRANT EXECUTE ON FUNCTION delete_worker_entry(TEXT, TEXT) TO anon, authenticated;
  