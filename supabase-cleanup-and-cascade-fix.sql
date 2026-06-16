-- ================================================================
  -- SIRENS STREAM — Cleanup & Cascade Fix Migration
  -- ================================================================
  -- Ejecuta este SQL en el Editor SQL de Supabase (una sola vez).
  -- Soluciona: eliminación de usuarios, cascadas FK, y limpieza de datos de prueba.
  -- ================================================================

  -- PASO 1: Eliminar entradas de trabajo de prueba
  -- (TestLayla2, Trabajadora Waha, DELETED/agentewaha de Daniel + TestWaha2, Trabajadora Layla de eclipse)
  DELETE FROM worker_entries WHERE id IN (
    '3babaded-8c0e-42ac-89e1-fc9a0621adcf',
    '4b177959-1279-4762-a794-3151fb27587d',
    '5c9775c3-eda6-43c6-a7ee-e368fe476d06',
    'c0f121ac-b220-4a13-988b-f709a932978c',
    '9e743a8e-7aa3-4aff-b27b-c0974db10e6d'
  );

  -- PASO 2: Arreglar FK de worker_entries — agregar ON DELETE CASCADE
  -- Esto permite borrar usuarios de Supabase sin error de clave foránea
  DO $$
  DECLARE
    constraint_name TEXT;
  BEGIN
    SELECT tc.constraint_name INTO constraint_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
    WHERE tc.table_name = 'worker_entries'
      AND tc.constraint_type = 'FOREIGN KEY'
      AND kcu.column_name = 'user_id'
    LIMIT 1;

    IF constraint_name IS NOT NULL THEN
      EXECUTE 'ALTER TABLE worker_entries DROP CONSTRAINT ' || quote_ident(constraint_name);
    END IF;
  END $$;

  ALTER TABLE worker_entries
    ADD CONSTRAINT worker_entries_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

  -- PASO 3: Arreglar FK de profiles — agregar ON DELETE CASCADE
  DO $$
  DECLARE
    constraint_name TEXT;
  BEGIN
    SELECT tc.constraint_name INTO constraint_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
    WHERE tc.table_name = 'profiles'
      AND tc.constraint_type = 'FOREIGN KEY'
      AND kcu.column_name = 'id'
    LIMIT 1;

    IF constraint_name IS NOT NULL THEN
      EXECUTE 'ALTER TABLE profiles DROP CONSTRAINT ' || quote_ident(constraint_name);
      ALTER TABLE profiles ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;
    END IF;
  END $$;

  -- PASO 4: Recrear delete_worker_entry con cast explícito (arregla el error "operator does not exist")
  DROP FUNCTION IF EXISTS delete_worker_entry(TEXT, TEXT);
  DROP FUNCTION IF EXISTS delete_worker_entry(UUID, UUID);
  DROP FUNCTION IF EXISTS delete_worker_entry(UUID, TEXT);
  DROP FUNCTION IF EXISTS admin_delete_worker_entry(TEXT);

  CREATE OR REPLACE FUNCTION delete_worker_entry(entry_id TEXT, requesting_user_id TEXT)
  RETURNS BOOLEAN
  LANGUAGE plpgsql
  SECURITY DEFINER
  AS $$
  DECLARE
    deleted_app TEXT;
  BEGIN
    DELETE FROM worker_entries
    WHERE id::TEXT = entry_id AND user_id::TEXT = requesting_user_id
    RETURNING app_name INTO deleted_app;

    IF FOUND AND deleted_app IS NOT NULL THEN
      DELETE FROM custom_worker_rates
      WHERE user_id = requesting_user_id AND app_name = deleted_app;
    END IF;

    RETURN FOUND;
  END;
  $$;

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
    WHERE id::TEXT = entry_id
    RETURNING app_name, user_id::TEXT INTO deleted_app, deleted_user;

    IF FOUND AND deleted_app IS NOT NULL AND deleted_user IS NOT NULL THEN
      DELETE FROM custom_worker_rates
      WHERE user_id = deleted_user AND app_name = deleted_app;
    END IF;

    RETURN FOUND;
  END;
  $$;

  -- PASO 5: Crear función RPC para borrar todos los datos de un usuario (usada por el API)
  CREATE OR REPLACE FUNCTION admin_delete_all_user_data(p_user_id UUID)
  RETURNS BOOLEAN
  LANGUAGE plpgsql
  SECURITY DEFINER
  AS $$
  BEGIN
    DELETE FROM worker_entries WHERE user_id = p_user_id;
    DELETE FROM custom_worker_rates WHERE user_id = p_user_id::TEXT;
    DELETE FROM weekly_no_cobro WHERE user_id = p_user_id;
    DELETE FROM colider_marks WHERE person_uid = p_user_id::TEXT;
    DELETE FROM push_subscriptions WHERE user_id = p_user_id;
    DELETE FROM telegram_links WHERE user_id = p_user_id;
    DELETE FROM profiles WHERE id = p_user_id;
    RETURN TRUE;
  END;
  $$;

  GRANT EXECUTE ON FUNCTION delete_worker_entry(TEXT, TEXT) TO anon, authenticated, service_role;
  GRANT EXECUTE ON FUNCTION admin_delete_worker_entry(TEXT) TO anon, authenticated, service_role;
  GRANT EXECUTE ON FUNCTION admin_delete_all_user_data(UUID) TO service_role;

  -- PASO 6 (OPCIONAL): Borrar a Daniel Martinez Fajardo si aún existe
  -- Descomenta las líneas siguientes SOLO si necesitas borrar este usuario:
  -- DELETE FROM worker_entries WHERE user_id = '770f9791-acaa-46d6-883c-35b65338c0a4';
  -- DELETE FROM profiles WHERE id = '770f9791-acaa-46d6-883c-35b65338c0a4';
  -- (Luego bórralo desde el Dashboard de Supabase > Authentication > Users)

  -- ================================================================
  -- LISTO. Recarga el panel de admin en la web.
  -- ================================================================
  