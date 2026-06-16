-- Migration: delete_worker_entry RPC (FIXED — user_id is UUID, not TEXT)
-- Run this in the Supabase SQL Editor

DROP FUNCTION IF EXISTS delete_worker_entry(UUID, UUID);
DROP FUNCTION IF EXISTS delete_worker_entry(TEXT, TEXT);
DROP FUNCTION IF EXISTS delete_worker_entry(UUID, TEXT);
DROP FUNCTION IF EXISTS admin_delete_worker_entry(TEXT);

-- Worker delete: verifies ownership before deleting
-- worker_entries.id = UUID, worker_entries.user_id = UUID
-- custom_worker_rates.user_id = TEXT
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
    WHERE user_id = requesting_user_id AND app_name = deleted_app;
  END IF;

  RETURN FOUND;
END;
$$;

-- Admin delete: no ownership check, deletes any entry by ID
CREATE OR REPLACE FUNCTION admin_delete_worker_entry(entry_id TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted_app TEXT;
  deleted_user TEXT;
BEGIN
  DELETE FROM worker_entries
  WHERE id = entry_id::UUID
  RETURNING app_name, user_id::TEXT INTO deleted_app, deleted_user;

  IF FOUND AND deleted_app IS NOT NULL AND deleted_user IS NOT NULL THEN
    DELETE FROM custom_worker_rates
    WHERE user_id = deleted_user AND app_name = deleted_app;
  END IF;

  RETURN FOUND;
END;
$$;

GRANT EXECUTE ON FUNCTION delete_worker_entry(TEXT, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION admin_delete_worker_entry(TEXT) TO anon, authenticated;

