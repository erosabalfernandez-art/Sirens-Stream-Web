-- ================================================================
  -- SIRENS STREAM — push_subscriptions table
  -- ================================================================
  -- Ejecuta este SQL en el Editor SQL de Supabase:
  -- Dashboard → SQL Editor → New Query → pegar y ejecutar
  -- ================================================================

  CREATE TABLE IF NOT EXISTS push_subscriptions (
    id           uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    subscription jsonb NOT NULL,
    created_at   timestamptz DEFAULT now(),
    updated_at   timestamptz DEFAULT now(),
    UNIQUE(user_id)
  );

  -- Índice para búsquedas por user_id
  CREATE INDEX IF NOT EXISTS push_subscriptions_user_id_idx ON push_subscriptions(user_id);

  -- Row Level Security
  ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

  -- Admin puede leer todas (para enviar notificaciones)
  DROP POLICY IF EXISTS "admin_all_push_subs" ON push_subscriptions;
  CREATE POLICY "admin_all_push_subs" ON push_subscriptions
    FOR ALL USING (is_admin()) WITH CHECK (is_admin());

  -- Cada usuario puede leer/actualizar/borrar su propia suscripción
  DROP POLICY IF EXISTS "user_own_push_sub" ON push_subscriptions;
  CREATE POLICY "user_own_push_sub" ON push_subscriptions
    FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

  -- ✅ Listo — la tabla push_subscriptions está creada
  