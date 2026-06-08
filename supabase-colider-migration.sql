-- ============================================================
  -- Colider Feature Migration
  -- Run this in your Supabase SQL Editor
  -- ============================================================

  -- Add colider columns to profiles table
  ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_colider boolean DEFAULT false;
  ALTER TABLE profiles ADD COLUMN IF NOT EXISTS colider_name text;
  ALTER TABLE profiles ADD COLUMN IF NOT EXISTS telefono text;

  -- Table: colider_marks
  -- Tracks which workers/agents the colider has paid per week
  CREATE TABLE IF NOT EXISTS colider_marks (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    semana text NOT NULL,
    person_uid text NOT NULL,
    person_type text NOT NULL CHECK (person_type IN ('worker', 'agent')),
    person_name text,
    person_real_name text,
    person_phone text,
    person_app text,
    salary_usd numeric DEFAULT 0,
    salary_cuba numeric DEFAULT 0,
    metodo_pago text,
    paid boolean DEFAULT false,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    UNIQUE(semana, person_uid, person_app)
  );

  -- Table: colider_week_status
  -- Tracks notification and admin close state per week
  CREATE TABLE IF NOT EXISTS colider_week_status (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    semana text NOT NULL UNIQUE,
    notified boolean DEFAULT false,
    notified_at timestamptz,
    admin_closed boolean DEFAULT false,
    admin_closed_at timestamptz,
    created_at timestamptz DEFAULT now()
  );

  -- Enable RLS
  ALTER TABLE colider_marks ENABLE ROW LEVEL SECURITY;
  ALTER TABLE colider_week_status ENABLE ROW LEVEL SECURITY;

  -- RLS Policies (allow all authenticated users via service role backend)
  DO $$
  BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'colider_marks' AND policyname = 'allow_all_authenticated') THEN
      CREATE POLICY allow_all_authenticated ON colider_marks FOR ALL TO authenticated USING (true) WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'colider_week_status' AND policyname = 'allow_all_authenticated') THEN
      CREATE POLICY allow_all_authenticated ON colider_week_status FOR ALL TO authenticated USING (true) WITH CHECK (true);
    END IF;
  END $$;

  -- Also allow service_role (used by backend)
  GRANT ALL ON colider_marks TO service_role;
  GRANT ALL ON colider_week_status TO service_role;
  GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO service_role;
  