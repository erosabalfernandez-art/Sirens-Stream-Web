-- ================================================================
-- ECLIPSE ANGELS / SIRENS STREAM — SQL MAESTRO DEFINITIVO
-- ================================================================
-- Un solo archivo. Idempotente (seguro correr varias veces).
-- Reemplaza TODOS los SQL anteriores.
-- Ejecutar completo en Supabase → SQL Editor → New Query → Run
-- ================================================================


-- ════════════════════════════════════════════════════════════════
-- SECCIÓN 0: FUNCIONES BASE
-- ════════════════════════════════════════════════════════════════

-- is_admin(): evita recursión en políticas RLS
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true);
$$;

-- handle_new_user(): crea perfil automáticamente al registrarse
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (new.id, new.email)
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- ════════════════════════════════════════════════════════════════
-- SECCIÓN 1: PROFILES
-- ════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS profiles (
  id           uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email        text,
  is_admin     boolean NOT NULL DEFAULT false,
  is_agent     boolean NOT NULL DEFAULT false,
  agent_name   text,
  agent_code   text UNIQUE,
  phone        text,
  is_colider   boolean NOT NULL DEFAULT false,
  colider_name text,
  telefono     text,
  agent_payment_method text,
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- Añadir columnas que podrían faltar si la tabla ya existe
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_agent     boolean NOT NULL DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS agent_name   text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS agent_code   text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS phone        text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_colider   boolean NOT NULL DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS colider_name text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS telefono     text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS agent_payment_method text;

-- FK con CASCADE (permite borrar usuarios de auth sin error)
DO $$
DECLARE v_constraint TEXT;
BEGIN
  SELECT tc.constraint_name INTO v_constraint
  FROM information_schema.table_constraints tc
  JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
  WHERE tc.table_name = 'profiles' AND tc.constraint_type = 'FOREIGN KEY' AND kcu.column_name = 'id'
  LIMIT 1;
  IF v_constraint IS NOT NULL THEN
    EXECUTE 'ALTER TABLE profiles DROP CONSTRAINT ' || quote_ident(v_constraint);
  END IF;
END $$;
ALTER TABLE profiles
  ADD CONSTRAINT profiles_id_fkey
  FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users_read_own_profile"    ON profiles;
DROP POLICY IF EXISTS "users_update_own_profile"  ON profiles;
DROP POLICY IF EXISTS "admin_read_all_profiles"   ON profiles;
DROP POLICY IF EXISTS "admin_update_all_profiles" ON profiles;
DROP POLICY IF EXISTS "admin_all_profiles"        ON profiles;
DROP POLICY IF EXISTS "public_read_profiles"      ON profiles;
DROP POLICY IF EXISTS "Users view own profile"    ON profiles;
DROP POLICY IF EXISTS "Users update own profile"  ON profiles;

CREATE POLICY "users_read_own_profile"    ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "users_update_own_profile"  ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "admin_read_all_profiles"   ON profiles FOR SELECT USING (is_admin());
CREATE POLICY "admin_update_all_profiles" ON profiles FOR UPDATE USING (is_admin());

GRANT ALL ON profiles TO service_role;


-- ════════════════════════════════════════════════════════════════
-- SECCIÓN 2: WORKER_ENTRIES
-- ════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS worker_entries (
  id            uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  app_name      text NOT NULL,
  nombre_real   text,
  nombre_en_app text,
  id_aplicacion text,
  telefono      text,
  codigo_pais   text DEFAULT '+1',
  pais          text,
  metodo_pago   text,
  billetera     text,
  agente        text,
  created_at    timestamptz DEFAULT now(),
  updated_at    timestamptz DEFAULT now(),
  UNIQUE(user_id, app_name)
);

-- FK con CASCADE (fix crítico — permite borrar auth users sin error FK)
DO $$
DECLARE v_constraint TEXT;
BEGIN
  SELECT tc.constraint_name INTO v_constraint
  FROM information_schema.table_constraints tc
  JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
  WHERE tc.table_name = 'worker_entries' AND tc.constraint_type = 'FOREIGN KEY' AND kcu.column_name = 'user_id'
  LIMIT 1;
  IF v_constraint IS NOT NULL THEN
    EXECUTE 'ALTER TABLE worker_entries DROP CONSTRAINT ' || quote_ident(v_constraint);
  END IF;
END $$;
ALTER TABLE worker_entries
  ADD CONSTRAINT worker_entries_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE worker_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "workers_manage_own_entries"         ON worker_entries;
DROP POLICY IF EXISTS "admin_read_all_entries"             ON worker_entries;
DROP POLICY IF EXISTS "admin_all_entries"                  ON worker_entries;
DROP POLICY IF EXISTS "Users manage own worker entries"    ON worker_entries;

CREATE POLICY "workers_manage_own_entries" ON worker_entries
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "admin_all_entries" ON worker_entries
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());

GRANT ALL ON worker_entries TO service_role;

-- Índice para búsquedas por agente
CREATE INDEX IF NOT EXISTS idx_worker_entries_agente ON worker_entries(agente);


-- ════════════════════════════════════════════════════════════════
-- SECCIÓN 3: PUBLISHED_SALARIES
-- ════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS published_salaries (
  id         uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  app_name   text NOT NULL,
  semana     text NOT NULL,
  usd        numeric NOT NULL DEFAULT 0,
  diamantes  numeric NOT NULL DEFAULT 0,
  extras     jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, app_name, semana)
);
ALTER TABLE published_salaries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "workers_read_own_salaries"   ON published_salaries;
DROP POLICY IF EXISTS "workers_delete_own_salaries" ON published_salaries;
DROP POLICY IF EXISTS "worker_delete_own_salaries"  ON published_salaries;
DROP POLICY IF EXISTS "admin_all_salaries"          ON published_salaries;
DROP POLICY IF EXISTS "Workers view own salaries"   ON published_salaries;
DROP POLICY IF EXISTS "Workers delete own salaries" ON published_salaries;

CREATE POLICY "workers_read_own_salaries"   ON published_salaries FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "workers_delete_own_salaries" ON published_salaries FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "admin_all_salaries"          ON published_salaries FOR ALL USING (is_admin()) WITH CHECK (is_admin());

GRANT ALL ON published_salaries TO service_role;


-- ════════════════════════════════════════════════════════════════
-- SECCIÓN 4: NOMINA_HISTORY
-- ════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS nomina_history (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  app_name        text NOT NULL,
  semana          text,
  total_usd       numeric DEFAULT 0,
  total_diamantes numeric DEFAULT 0,
  cobradas_count  integer DEFAULT 0,
  nocobro_count   integer DEFAULT 0,
  sinperfil_count integer DEFAULT 0,
  rows_data       jsonb NOT NULL DEFAULT '{}',
  published       boolean DEFAULT false,
  file_name       text,
  created_at      timestamptz DEFAULT now()
);
ALTER TABLE nomina_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_all_nomina_history" ON nomina_history;
CREATE POLICY "admin_all_nomina_history" ON nomina_history
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());

GRANT ALL ON nomina_history TO service_role;


-- ════════════════════════════════════════════════════════════════
-- SECCIÓN 5: SITE_SETTINGS
-- ════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS site_settings (
  key        text PRIMARY KEY,
  value      text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_read_settings" ON site_settings;
DROP POLICY IF EXISTS "admin_all_settings"   ON site_settings;
DROP POLICY IF EXISTS "public_read"          ON site_settings;
DROP POLICY IF EXISTS "admin_write"          ON site_settings;
DROP POLICY IF EXISTS "All can read site settings" ON site_settings;

CREATE POLICY "public_read_settings" ON site_settings FOR SELECT USING (true);
CREATE POLICY "admin_all_settings"   ON site_settings FOR ALL USING (is_admin()) WITH CHECK (is_admin());

GRANT ALL ON site_settings TO service_role;

INSERT INTO site_settings (key, value) VALUES ('show_agencia', 'true') ON CONFLICT (key) DO NOTHING;


-- ════════════════════════════════════════════════════════════════
-- SECCIÓN 6: CHANNEL_REQUESTS
-- ════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS channel_requests (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  app_name    text NOT NULL,
  status      text NOT NULL DEFAULT 'pending',
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now(),
  resolved_at timestamptz,
  resolved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  UNIQUE(user_id, app_name)
);
ALTER TABLE channel_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "workers_manage_own_requests"        ON channel_requests;
DROP POLICY IF EXISTS "admin_all_requests"                 ON channel_requests;
DROP POLICY IF EXISTS "Authenticated can read all requests" ON channel_requests;
DROP POLICY IF EXISTS "Admins manage all requests"         ON channel_requests;
DROP POLICY IF EXISTS "Users manage own channel requests"  ON channel_requests;

CREATE POLICY "workers_manage_own_requests" ON channel_requests
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "admin_all_requests" ON channel_requests
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "authenticated_read_requests" ON channel_requests
  FOR SELECT TO authenticated USING (true);

GRANT ALL ON channel_requests TO service_role;


-- ════════════════════════════════════════════════════════════════
-- SECCIÓN 7: CHANNEL_MESSAGES
-- ════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS channel_messages (
  id         uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  app_name   text NOT NULL,
  content    text,
  image_url  text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE channel_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "approved_workers_read_messages"           ON channel_messages;
DROP POLICY IF EXISTS "admin_all_messages"                       ON channel_messages;
DROP POLICY IF EXISTS "Authenticated can read channel messages"  ON channel_messages;
DROP POLICY IF EXISTS "Admins manage channel messages"           ON channel_messages;

CREATE POLICY "approved_workers_read_messages" ON channel_messages
  FOR SELECT USING (
    is_admin() OR
    auth.uid() IN (
      SELECT user_id FROM channel_requests
      WHERE app_name = channel_messages.app_name AND status = 'approved'
    )
  );
CREATE POLICY "admin_all_messages" ON channel_messages
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());

GRANT ALL ON channel_messages TO service_role;


-- ════════════════════════════════════════════════════════════════
-- SECCIÓN 8: CHANNEL_REACTIONS
-- ════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS channel_reactions (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id    uuid NOT NULL,
  user_id       uuid NOT NULL,
  reaction_type text NOT NULL CHECK (reaction_type IN ('heart', 'like')),
  created_at    timestamptz DEFAULT now(),
  UNIQUE(message_id, user_id, reaction_type)
);
ALTER TABLE channel_reactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "read_reactions"   ON channel_reactions;
DROP POLICY IF EXISTS "insert_reactions" ON channel_reactions;

CREATE POLICY "read_reactions"   ON channel_reactions FOR SELECT TO authenticated USING (true);
CREATE POLICY "insert_reactions" ON channel_reactions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

GRANT ALL ON channel_reactions TO service_role;


-- ════════════════════════════════════════════════════════════════
-- SECCIÓN 9: PAYMENT_STICKER_EVENTS
-- ════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS payment_sticker_events (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL,
  app_name      text NOT NULL,
  nombre_en_app text,
  sticker_index integer NOT NULL DEFAULT 0,
  created_at    timestamptz DEFAULT now()
);
ALTER TABLE payment_sticker_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "read_stickers" ON payment_sticker_events;

CREATE POLICY "read_stickers" ON payment_sticker_events FOR SELECT TO authenticated USING (true);

GRANT ALL ON payment_sticker_events TO service_role;


-- ════════════════════════════════════════════════════════════════
-- SECCIÓN 10: PUSH_SUBSCRIPTIONS
-- ════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id           uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subscription jsonb NOT NULL,
  created_at   timestamptz DEFAULT now(),
  updated_at   timestamptz DEFAULT now(),
  UNIQUE(user_id)
);
CREATE INDEX IF NOT EXISTS push_subscriptions_user_id_idx ON push_subscriptions(user_id);
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_all_push_subs"            ON push_subscriptions;
DROP POLICY IF EXISTS "user_own_push_sub"              ON push_subscriptions;
DROP POLICY IF EXISTS "workers_manage_own_push"        ON push_subscriptions;
DROP POLICY IF EXISTS "Users manage own push subs"     ON push_subscriptions;

CREATE POLICY "admin_all_push_subs" ON push_subscriptions
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "user_own_push_sub" ON push_subscriptions
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

GRANT ALL ON push_subscriptions TO service_role;


-- ════════════════════════════════════════════════════════════════
-- SECCIÓN 11: PAYMENT_CONFIRMATIONS
-- ════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS payment_confirmations (
  id           uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  salary_id    uuid NOT NULL,
  user_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  app_name     text,
  semana       text,
  confirmed_at timestamptz DEFAULT now(),
  UNIQUE(salary_id)
);
ALTER TABLE payment_confirmations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users_insert_own"               ON payment_confirmations;
DROP POLICY IF EXISTS "users_read_own"                 ON payment_confirmations;
DROP POLICY IF EXISTS "admin_read_all"                 ON payment_confirmations;
DROP POLICY IF EXISTS "admin_all_confirmations"        ON payment_confirmations;
DROP POLICY IF EXISTS "Workers manage own pay confirmations" ON payment_confirmations;

CREATE POLICY "users_insert_own"        ON payment_confirmations FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "users_read_own"          ON payment_confirmations FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "admin_all_confirmations" ON payment_confirmations FOR ALL USING (is_admin()) WITH CHECK (is_admin());

GRANT ALL ON payment_confirmations TO service_role;


-- ════════════════════════════════════════════════════════════════
-- SECCIÓN 12: ADMIN_PAID_MARKS
-- ════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS admin_paid_marks (
  id        uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  app_name  text NOT NULL,
  semana    text NOT NULL,
  uid       text NOT NULL,
  marked_at timestamptz DEFAULT now(),
  UNIQUE(app_name, semana, uid)
);
ALTER TABLE admin_paid_marks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_all" ON admin_paid_marks;
CREATE POLICY "admin_all" ON admin_paid_marks USING (is_admin()) WITH CHECK (is_admin());

GRANT ALL ON admin_paid_marks TO service_role;


-- ════════════════════════════════════════════════════════════════
-- SECCIÓN 13: AGENT_COMMISSIONS
-- ════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS agent_commissions (
  id                   uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_user_id        uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  agent_name           text NOT NULL,
  app_name             text NOT NULL,
  semana               text NOT NULL,
  total_commission_usd numeric DEFAULT 0,
  workers_data         jsonb DEFAULT '[]',
  created_at           timestamptz DEFAULT now(),
  UNIQUE(agent_name, app_name, semana)
);
ALTER TABLE agent_commissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "agent_view_own"     ON agent_commissions;
DROP POLICY IF EXISTS "agent_view_by_name" ON agent_commissions;
DROP POLICY IF EXISTS "admin_all_agent"    ON agent_commissions;
DROP POLICY IF EXISTS "Agents view own commissions" ON agent_commissions;

CREATE POLICY "agent_view_own" ON agent_commissions
  FOR SELECT USING (agent_user_id = auth.uid());
CREATE POLICY "agent_view_by_name" ON agent_commissions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.is_agent = true
        AND profiles.agent_name = agent_commissions.agent_name
    )
  );
CREATE POLICY "admin_all_agent" ON agent_commissions
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());

GRANT ALL ON agent_commissions TO service_role;


-- ════════════════════════════════════════════════════════════════
-- SECCIÓN 14: PUBLISHED_AGENT_COMMISSIONS
-- ════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS published_agent_commissions (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  semana          text NOT NULL,
  agent_user_id   text NOT NULL,
  agent_name      text NOT NULL,
  worker_uid      text,
  worker_name     text NOT NULL DEFAULT '',
  worker_real_name text,
  app_name        text NOT NULL,
  commission_usd  numeric(10,2) NOT NULL DEFAULT 0,
  published_at    timestamptz DEFAULT now(),
  UNIQUE(semana, agent_user_id, app_name, worker_name)
);
ALTER TABLE published_agent_commissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_all_pac" ON published_agent_commissions;
DROP POLICY IF EXISTS "agent_read_own_pac" ON published_agent_commissions;

CREATE POLICY "admin_all_pac" ON published_agent_commissions
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "agent_read_own_pac" ON published_agent_commissions
  FOR SELECT USING (agent_user_id = auth.uid()::TEXT);

GRANT ALL ON published_agent_commissions TO service_role;


-- ════════════════════════════════════════════════════════════════
-- SECCIÓN 15: AGENT_COMMISSION_PUBLISH_LOG
-- ════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS agent_commission_publish_log (
  semana         text NOT NULL,
  agent_user_id  text NOT NULL,
  agent_name     text NOT NULL DEFAULT '',
  total_usd      numeric(10,2) NOT NULL DEFAULT 0,
  published_at   timestamptz DEFAULT now(),
  PRIMARY KEY(semana, agent_user_id)
);
ALTER TABLE agent_commission_publish_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_all_acpl" ON agent_commission_publish_log;
CREATE POLICY "admin_all_acpl" ON agent_commission_publish_log
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());

GRANT ALL ON agent_commission_publish_log TO service_role;


-- ════════════════════════════════════════════════════════════════
-- SECCIÓN 16: COLIDER_COMMISSION_PUBLISH_LOG
-- ════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS colider_commission_publish_log (
  semana       text NOT NULL PRIMARY KEY,
  published_at timestamptz DEFAULT now()
);
ALTER TABLE colider_commission_publish_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_all_ccpl" ON colider_commission_publish_log;
CREATE POLICY "admin_all_ccpl" ON colider_commission_publish_log
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());

GRANT ALL ON colider_commission_publish_log TO service_role;


-- ════════════════════════════════════════════════════════════════
-- SECCIÓN 17: EXCHANGE_RATES
-- ════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS exchange_rates (
  id         text PRIMARY KEY,
  rate       numeric NOT NULL DEFAULT 0,
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE exchange_rates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "read_rates"  ON exchange_rates;
DROP POLICY IF EXISTS "write_rates" ON exchange_rates;
DROP POLICY IF EXISTS "All can read exchange rates" ON exchange_rates;

CREATE POLICY "read_rates"  ON exchange_rates FOR SELECT USING (true);
CREATE POLICY "write_rates" ON exchange_rates FOR ALL USING (is_admin()) WITH CHECK (is_admin());

GRANT ALL ON exchange_rates TO service_role;

INSERT INTO exchange_rates (id, rate) VALUES
  ('efectivo_worker',      600),
  ('transferencia_worker', 600),
  ('efectivo_agent',       600),
  ('transferencia_agent',  600)
ON CONFLICT (id) DO NOTHING;


-- ════════════════════════════════════════════════════════════════
-- SECCIÓN 18: WEEKLY_NO_COBRO
-- ════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS weekly_no_cobro (
  id            uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id       uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  app_name      text NOT NULL,
  semana        text NOT NULL,
  reason        text NOT NULL DEFAULT 'not_earned',
  nombre_en_app text,
  nombre_real   text,
  email         text,
  created_at    timestamptz DEFAULT now(),
  justified     boolean NOT NULL DEFAULT false,
  UNIQUE(user_id, app_name, semana)
);
ALTER TABLE weekly_no_cobro ADD COLUMN IF NOT EXISTS justified boolean NOT NULL DEFAULT false;
ALTER TABLE weekly_no_cobro ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_all_nocobro"          ON weekly_no_cobro;
DROP POLICY IF EXISTS "workers_insert_own_nocobro"  ON weekly_no_cobro;
DROP POLICY IF EXISTS "workers_read_own_nocobro"    ON weekly_no_cobro;

CREATE POLICY "admin_all_nocobro" ON weekly_no_cobro
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "workers_read_own_nocobro" ON weekly_no_cobro
  FOR SELECT USING (auth.uid() = user_id);

GRANT ALL ON weekly_no_cobro TO service_role;


-- ════════════════════════════════════════════════════════════════
-- SECCIÓN 19: AGENT_PAYMENT_CONFIRMATIONS
-- ════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS agent_payment_confirmations (
  id            uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  commission_id uuid NOT NULL,
  user_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  agent_name    text,
  semana        text,
  app_name      text,
  confirmed_at  timestamptz DEFAULT now(),
  UNIQUE(commission_id)
);
ALTER TABLE agent_payment_confirmations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "agents_insert_own_apc"   ON agent_payment_confirmations;
DROP POLICY IF EXISTS "agents_read_own_apc"     ON agent_payment_confirmations;
DROP POLICY IF EXISTS "admin_all_apc"           ON agent_payment_confirmations;
DROP POLICY IF EXISTS "agents_insert_own"       ON agent_payment_confirmations;
DROP POLICY IF EXISTS "agents_read_own"         ON agent_payment_confirmations;
DROP POLICY IF EXISTS "admin_read_all"          ON agent_payment_confirmations;
DROP POLICY IF EXISTS "Agents manage own commission confirmations" ON agent_payment_confirmations;

CREATE POLICY "agents_insert_own_apc" ON agent_payment_confirmations
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "agents_read_own_apc" ON agent_payment_confirmations
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "admin_all_apc" ON agent_payment_confirmations
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());

GRANT ALL ON agent_payment_confirmations TO service_role;


-- ════════════════════════════════════════════════════════════════
-- SECCIÓN 20: DIRECT_PAYMENT_NOTIFICATIONS
-- ════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS direct_payment_notifications (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  app_name    text NOT NULL,
  semana      text NOT NULL,
  nota        text,
  notified_at timestamptz DEFAULT now(),
  UNIQUE(user_id, app_name, semana)
);
ALTER TABLE direct_payment_notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users_insert_own_dpn"  ON direct_payment_notifications;
DROP POLICY IF EXISTS "users_read_own_dpn"    ON direct_payment_notifications;
DROP POLICY IF EXISTS "users_delete_own_dpn"  ON direct_payment_notifications;
DROP POLICY IF EXISTS "admin_all_dpn"         ON direct_payment_notifications;
DROP POLICY IF EXISTS "Workers manage own payment notifications" ON direct_payment_notifications;

CREATE POLICY "users_insert_own_dpn" ON direct_payment_notifications
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "users_read_own_dpn" ON direct_payment_notifications
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "users_delete_own_dpn" ON direct_payment_notifications
  FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "admin_all_dpn" ON direct_payment_notifications
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());

GRANT ALL ON direct_payment_notifications TO service_role;


-- ════════════════════════════════════════════════════════════════
-- SECCIÓN 21: CUSTOM_WORKER_RATES
-- ════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS custom_worker_rates (
  id                 uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id            text NOT NULL,
  app_name           text NOT NULL,
  nombre_en_app      text,
  efectivo_rate      numeric(10,2) NOT NULL DEFAULT 0,
  transferencia_rate numeric(10,2) NOT NULL DEFAULT 0,
  updated_at         timestamptz DEFAULT now(),
  UNIQUE(user_id, app_name)
);
ALTER TABLE custom_worker_rates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_all_custom_rates" ON custom_worker_rates;

CREATE POLICY "admin_all_custom_rates" ON custom_worker_rates
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());

GRANT ALL ON custom_worker_rates TO service_role;


-- ════════════════════════════════════════════════════════════════
-- SECCIÓN 22: PAYMENT_METHOD_LOCKS
-- ════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS payment_method_locks (
  user_id   text PRIMARY KEY,
  locked    boolean DEFAULT false,
  locked_at timestamptz DEFAULT now()
);
ALTER TABLE payment_method_locks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_all_locks" ON payment_method_locks;
CREATE POLICY "admin_all_locks" ON payment_method_locks
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());

GRANT ALL ON payment_method_locks TO service_role;


-- ════════════════════════════════════════════════════════════════
-- SECCIÓN 23: COLIDER_MARKS
-- ════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS colider_marks (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  semana           text NOT NULL,
  person_uid       text NOT NULL,
  person_type      text NOT NULL CHECK (person_type IN ('worker', 'agent')),
  person_name      text,
  person_real_name text,
  person_phone     text,
  person_app       text,
  salary_usd       numeric DEFAULT 0,
  salary_cuba      numeric DEFAULT 0,
  metodo_pago      text,
  paid             boolean DEFAULT false,
  created_at       timestamptz DEFAULT now(),
  updated_at       timestamptz DEFAULT now(),
  UNIQUE(semana, person_uid, person_app)
);
ALTER TABLE colider_marks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_all_colider_marks"      ON colider_marks;
DROP POLICY IF EXISTS "allow_all_authenticated"      ON colider_marks;

CREATE POLICY "admin_all_colider_marks" ON colider_marks
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "colider_all_marks" ON colider_marks
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

GRANT ALL ON colider_marks TO service_role;


-- ════════════════════════════════════════════════════════════════
-- SECCIÓN 24: COLIDER_WEEK_STATUS
-- ════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS colider_week_status (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  semana          text NOT NULL,
  colider_user_id uuid,
  notified        boolean DEFAULT false,
  notified_at     timestamptz,
  admin_closed    boolean DEFAULT false,
  admin_closed_at timestamptz,
  created_at      timestamptz DEFAULT now()
);

-- Añadir colider_user_id si no existe (migración)
ALTER TABLE colider_week_status ADD COLUMN IF NOT EXISTS colider_user_id uuid;

-- Eliminar restricción única antigua (semana sola) si existe
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'colider_week_status_semana_key') THEN
    ALTER TABLE colider_week_status DROP CONSTRAINT colider_week_status_semana_key;
  END IF;
END $$;

-- Restricción compuesta correcta: semana + colider_user_id
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'colider_week_status_semana_colider_key') THEN
    ALTER TABLE colider_week_status
      ADD CONSTRAINT colider_week_status_semana_colider_key
      UNIQUE (semana, colider_user_id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_colider_week_status_colider ON colider_week_status(colider_user_id);

ALTER TABLE colider_week_status ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_all_colider_week"  ON colider_week_status;
DROP POLICY IF EXISTS "allow_all_authenticated" ON colider_week_status;

CREATE POLICY "admin_all_colider_week" ON colider_week_status
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "colider_all_week_status" ON colider_week_status
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

GRANT ALL ON colider_week_status TO service_role;


-- ════════════════════════════════════════════════════════════════
-- SECCIÓN 25: TELEGRAM_LINKS
-- ════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS telegram_links (
  user_id    uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  chat_id    text NOT NULL UNIQUE,
  username   text,
  first_name text,
  linked_at  timestamptz DEFAULT now()
);
ALTER TABLE telegram_links ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users can read own telegram link"   ON telegram_links;
DROP POLICY IF EXISTS "users can delete own telegram link" ON telegram_links;

CREATE POLICY "users_read_own_telegram" ON telegram_links
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "users_delete_own_telegram" ON telegram_links
  FOR DELETE USING (auth.uid() = user_id);

GRANT ALL ON telegram_links TO service_role;


-- ════════════════════════════════════════════════════════════════
-- SECCIÓN 26: TELEGRAM_LINK_CODES
-- ════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS telegram_link_codes (
  code       text PRIMARY KEY,
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz DEFAULT (now() + INTERVAL '15 minutes'),
  used       boolean DEFAULT false
);
ALTER TABLE telegram_link_codes ENABLE ROW LEVEL SECURITY;

GRANT ALL ON telegram_link_codes TO service_role;


-- ════════════════════════════════════════════════════════════════
-- SECCIÓN 27: GRANTS GENERALES
-- ════════════════════════════════════════════════════════════════
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO service_role;


-- ════════════════════════════════════════════════════════════════
-- SECCIÓN 28: TRIGGERS Y FUNCIONES
-- ════════════════════════════════════════════════════════════════

-- ── Trigger: bloquear agente una vez asignado ────────────────────
CREATE OR REPLACE FUNCTION lock_agente_once_set()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  existing_agente TEXT;
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF OLD.agente IS NOT NULL AND NEW.agente IS DISTINCT FROM OLD.agente THEN
      RAISE EXCEPTION 'El código de agente no puede cambiarse una vez asignado.';
    END IF;
  END IF;
  IF NEW.agente IS NOT NULL THEN
    SELECT agente INTO existing_agente
    FROM worker_entries
    WHERE user_id = NEW.user_id
      AND agente IS NOT NULL
      AND id IS DISTINCT FROM NEW.id
    LIMIT 1;
    IF existing_agente IS NOT NULL AND NEW.agente != existing_agente THEN
      RAISE EXCEPTION 'Ya tienes el agente % asignado. Todas tus cuentas deben usar el mismo agente.', existing_agente;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_agente_lock ON worker_entries;
CREATE TRIGGER enforce_agente_lock
  BEFORE INSERT OR UPDATE ON worker_entries
  FOR EACH ROW EXECUTE FUNCTION lock_agente_once_set();


-- ── Trigger: limpiar datos al borrar worker_entry ────────────────
-- FIX CRÍTICO: cast OLD.user_id::TEXT para comparar con custom_worker_rates.user_id (text)
-- Sin este cast el trigger fallaba con "operator does not exist: text = uuid"
-- y bloqueaba TODO delete en worker_entries
CREATE OR REPLACE FUNCTION cleanup_deleted_worker()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  -- custom_worker_rates.user_id es TEXT → necesita cast explícito
  DELETE FROM custom_worker_rates
    WHERE user_id = OLD.user_id::TEXT AND app_name = OLD.app_name;
  -- published_salaries.user_id es UUID → sin cast
  DELETE FROM published_salaries
    WHERE user_id = OLD.user_id AND app_name = OLD.app_name;
  -- payment_confirmations no tiene FK directa pero limpiamos por si acaso
  DELETE FROM payment_confirmations
    WHERE user_id = OLD.user_id AND app_name = OLD.app_name;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS on_worker_entry_delete ON worker_entries;
CREATE TRIGGER on_worker_entry_delete
  AFTER DELETE ON worker_entries
  FOR EACH ROW EXECUTE FUNCTION cleanup_deleted_worker();


-- ════════════════════════════════════════════════════════════════
-- SECCIÓN 29: FUNCIONES RPC (usadas por el API server)
-- ════════════════════════════════════════════════════════════════

-- delete_worker_entry: la trabajadora borra su propia entrada
DROP FUNCTION IF EXISTS delete_worker_entry(UUID, UUID);
DROP FUNCTION IF EXISTS delete_worker_entry(TEXT, TEXT);
DROP FUNCTION IF EXISTS delete_worker_entry(UUID, TEXT);

CREATE OR REPLACE FUNCTION delete_worker_entry(entry_id TEXT, requesting_user_id TEXT)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  deleted_app TEXT;
BEGIN
  DELETE FROM worker_entries
  WHERE id = entry_id::UUID AND user_id = requesting_user_id::UUID
  RETURNING app_name INTO deleted_app;

  -- custom_worker_rates.user_id es TEXT
  IF FOUND AND deleted_app IS NOT NULL THEN
    DELETE FROM custom_worker_rates
    WHERE user_id = requesting_user_id AND app_name = deleted_app;
  END IF;

  RETURN FOUND;
END;
$$;

-- admin_delete_worker_entry: el admin borra cualquier entrada
DROP FUNCTION IF EXISTS admin_delete_worker_entry(TEXT);

CREATE OR REPLACE FUNCTION admin_delete_worker_entry(entry_id TEXT)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  deleted_app  TEXT;
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

-- admin_delete_all_user_data: borra todos los datos de un usuario antes de borrar auth
CREATE OR REPLACE FUNCTION admin_delete_all_user_data(p_user_id UUID)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  DELETE FROM worker_entries            WHERE user_id = p_user_id;
  DELETE FROM custom_worker_rates       WHERE user_id = p_user_id::TEXT;
  DELETE FROM weekly_no_cobro           WHERE user_id = p_user_id;
  DELETE FROM colider_marks             WHERE person_uid = p_user_id::TEXT;
  DELETE FROM push_subscriptions        WHERE user_id = p_user_id;
  DELETE FROM telegram_links            WHERE user_id = p_user_id;
  DELETE FROM payment_confirmations     WHERE user_id = p_user_id;
  DELETE FROM direct_payment_notifications WHERE user_id = p_user_id;
  DELETE FROM agent_payment_confirmations  WHERE user_id = p_user_id;
  DELETE FROM profiles                  WHERE id = p_user_id;
  RETURN TRUE;
END;
$$;

GRANT EXECUTE ON FUNCTION delete_worker_entry(TEXT, TEXT)     TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION admin_delete_worker_entry(TEXT)     TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION admin_delete_all_user_data(UUID)    TO service_role;


-- ════════════════════════════════════════════════════════════════
-- SECCIÓN 30: LIMPIEZA DE DATOS HUÉRFANOS
-- ════════════════════════════════════════════════════════════════
-- Borra worker_entries de prueba y de Daniel Martinez Fajardo.
-- Las IDs UUID van directo en SQL sin el problema del PostgREST.
-- Después de esto, Daniel puede borrarse desde el Dashboard de Supabase.

DELETE FROM worker_entries WHERE id IN (
  '5c9775c3-eda6-43c6-a7ee-e368fe476d06',  -- DELETED/Waha (Daniel)
  '3babaded-8c0e-42ac-89e1-fc9a0621adcf',  -- TestLayla2/Layla (Daniel)
  '4b177959-1279-4762-a794-3151fb27587d',  -- Trabajadora Waha/Waha (Daniel)
  '9e743a8e-7aa3-4aff-b27b-c0974db10e6d',  -- TestWaha2/Waha (prueba eclipse)
  'c0f121ac-b220-4a13-988b-f709a932978c'   -- Trabajadora Layla/Layla (prueba eclipse)
);

-- Borrar perfil de Daniel si quedó huérfano
DELETE FROM profiles WHERE id = '770f9791-acaa-46d6-883c-35b65338c0a4';


-- ════════════════════════════════════════════════════════════════
-- ✅ LISTO
-- Después de ejecutar este SQL:
-- 1. Los datos de prueba y de Daniel están borrados
-- 2. Ve a Supabase → Authentication → Users
-- 3. Busca danielmartinesfajardo@gmail.com → Delete user (ya no dará error)
-- ════════════════════════════════════════════════════════════════
