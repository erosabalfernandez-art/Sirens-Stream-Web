-- ================================================================
  -- SIRENS STREAM — SQL v6: TABLAS ADICIONALES
  -- ================================================================
  -- Ejecuta este SQL en el Editor SQL de Supabase.
  -- Es seguro correrlo varias veces (IF NOT EXISTS / IF NOT EXISTS).
  -- ================================================================


  -- ── FUNCIÓN is_admin() (re-create por si no existe) ─────────────
  CREATE OR REPLACE FUNCTION is_admin()
  RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE AS $$
    SELECT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true);
  $$;


  -- ================================================================
  -- 14. WEEKLY_NO_COBRO
  -- Trabajadoras que no cobraron en una semana dada.
  -- La API la rellena automáticamente al publicar nóminas.
  -- ================================================================
  CREATE TABLE IF NOT EXISTS weekly_no_cobro (
    id           uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id      uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    app_name     text NOT NULL,
    semana       text NOT NULL,
    reason       text NOT NULL DEFAULT 'not_earned',
    nombre_en_app text,
    nombre_real  text,
    email        text,
    created_at   timestamptz DEFAULT now(),
    justified    boolean NOT NULL DEFAULT false,
    UNIQUE(user_id, app_name, semana)
  );
  ALTER TABLE weekly_no_cobro ENABLE ROW LEVEL SECURITY;

  DROP POLICY IF EXISTS "admin_all_nocobro"         ON weekly_no_cobro;
  DROP POLICY IF EXISTS "workers_insert_own_nocobro" ON weekly_no_cobro;
  DROP POLICY IF EXISTS "workers_read_own_nocobro"   ON weekly_no_cobro;

  CREATE POLICY "admin_all_nocobro" ON weekly_no_cobro
    FOR ALL USING (is_admin()) WITH CHECK (is_admin());

  -- La API usa service role para insertar, pero la trabajadora puede leer la suya
  CREATE POLICY "workers_read_own_nocobro" ON weekly_no_cobro
    FOR SELECT USING (auth.uid() = user_id);


  -- ================================================================
  -- 15. AGENT_PAYMENT_CONFIRMATIONS
  -- Los agentes confirman que recibieron su comisión.
  -- ================================================================
  CREATE TABLE IF NOT EXISTS agent_payment_confirmations (
    id            uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    commission_id uuid NOT NULL,
    user_id       uuid NOT NULL,
    agent_name    text,
    semana        text,
    app_name      text,
    confirmed_at  timestamptz DEFAULT now(),
    UNIQUE(commission_id)
  );
  ALTER TABLE agent_payment_confirmations ENABLE ROW LEVEL SECURITY;

  DROP POLICY IF EXISTS "agents_insert_own_apc"  ON agent_payment_confirmations;
  DROP POLICY IF EXISTS "agents_read_own_apc"    ON agent_payment_confirmations;
  DROP POLICY IF EXISTS "admin_all_apc"          ON agent_payment_confirmations;

  CREATE POLICY "agents_insert_own_apc" ON agent_payment_confirmations
    FOR INSERT WITH CHECK (auth.uid() = user_id);

  CREATE POLICY "agents_read_own_apc" ON agent_payment_confirmations
    FOR SELECT USING (auth.uid() = user_id);

  CREATE POLICY "admin_all_apc" ON agent_payment_confirmations
    FOR ALL USING (is_admin()) WITH CHECK (is_admin());


  -- ================================================================
  -- 16. DIRECT_PAYMENT_NOTIFICATIONS
  -- Notificaciones de pago directo (por ej. pagos fuera de la app).
  -- ================================================================
  CREATE TABLE IF NOT EXISTS direct_payment_notifications (
    id         uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id    uuid NOT NULL,
    app_name   text NOT NULL,
    semana     text NOT NULL,
    nota       text,
    notified_at timestamptz DEFAULT now(),
    UNIQUE(user_id, app_name, semana)
  );
  ALTER TABLE direct_payment_notifications ENABLE ROW LEVEL SECURITY;

  DROP POLICY IF EXISTS "users_insert_own_dpn"  ON direct_payment_notifications;
  DROP POLICY IF EXISTS "users_read_own_dpn"    ON direct_payment_notifications;
  DROP POLICY IF EXISTS "users_delete_own_dpn"  ON direct_payment_notifications;
  DROP POLICY IF EXISTS "admin_all_dpn"         ON direct_payment_notifications;

  CREATE POLICY "users_insert_own_dpn" ON direct_payment_notifications
    FOR INSERT WITH CHECK (auth.uid() = user_id);

  CREATE POLICY "users_read_own_dpn" ON direct_payment_notifications
    FOR SELECT USING (auth.uid() = user_id);

  CREATE POLICY "users_delete_own_dpn" ON direct_payment_notifications
    FOR DELETE USING (auth.uid() = user_id);

  CREATE POLICY "admin_all_dpn" ON direct_payment_notifications
    FOR ALL USING (is_admin()) WITH CHECK (is_admin());


  -- ================================================================
  -- COLUMNAS NUEVAS EN TABLAS EXISTENTES
  -- ================================================================
  ALTER TABLE weekly_no_cobro ADD COLUMN IF NOT EXISTS justified boolean NOT NULL DEFAULT false;
  ALTER TABLE profiles        ADD COLUMN IF NOT EXISTS phone     text;


  -- ================================================================
  -- ✅ SQL v6 LISTO — 3 tablas + 2 columnas nuevas
  -- ================================================================
  