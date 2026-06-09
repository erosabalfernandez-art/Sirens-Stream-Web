-- ============================================================
  -- Colider Agent Code Migration v2
  -- Run this in your Supabase SQL Editor AFTER colider feature deploy
  -- ============================================================

  -- Add colider_user_id column to colider_week_status for per-colider scoping
  ALTER TABLE colider_week_status ADD COLUMN IF NOT EXISTS colider_user_id uuid;

  -- Drop old semana-only unique constraint (if exists)
  DO $$
  BEGIN
    IF EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conname = 'colider_week_status_semana_key'
    ) THEN
      ALTER TABLE colider_week_status DROP CONSTRAINT colider_week_status_semana_key;
    END IF;
  END $$;

  -- Add composite unique constraint: semana + colider_user_id
  DO $$
  BEGIN
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conname = 'colider_week_status_semana_colider_key'
    ) THEN
      ALTER TABLE colider_week_status
        ADD CONSTRAINT colider_week_status_semana_colider_key
        UNIQUE (semana, colider_user_id);
    END IF;
  END $$;

  -- Indexes for performance
  CREATE INDEX IF NOT EXISTS idx_colider_week_status_colider
    ON colider_week_status(colider_user_id);

  CREATE INDEX IF NOT EXISTS idx_worker_entries_agente
    ON worker_entries(agente);
  