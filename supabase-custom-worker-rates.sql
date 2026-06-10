-- ================================================================
  -- CUSTOM WORKER RATES — Ejecuta este SQL en Supabase SQL Editor
  -- Permite asignar tipo de cambio personalizado por trabajadora
  -- ================================================================

  CREATE TABLE IF NOT EXISTS custom_worker_rates (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id text NOT NULL,
    app_name text NOT NULL,
    nombre_en_app text,
    efectivo_rate numeric(10,2) NOT NULL DEFAULT 0,
    transferencia_rate numeric(10,2) NOT NULL DEFAULT 0,
    updated_at timestamptz DEFAULT now(),
    UNIQUE(user_id, app_name)
  );

  ALTER TABLE custom_worker_rates ENABLE ROW LEVEL SECURITY;

  -- Solo admin puede leer/escribir/borrar
  DO $$ BEGIN
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE tablename = 'custom_worker_rates'
      AND policyname = 'admin_all_custom_rates'
    ) THEN
      CREATE POLICY "admin_all_custom_rates" ON custom_worker_rates
        FOR ALL
        USING ((SELECT is_admin FROM profiles WHERE id = auth.uid()))
        WITH CHECK ((SELECT is_admin FROM profiles WHERE id = auth.uid()));
    END IF;
  END $$;

  -- El API usa service_role, no necesita política adicional para la API
  