-- Migration: lock agente field once set in worker_entries
    -- Apply via Supabase SQL Editor: paste and click Run
    -- This creates a trigger that prevents changing the agent code once assigned
    -- UPDATED: allows clearing agente (setting to null) for admin use

    CREATE OR REPLACE FUNCTION lock_agente_once_set()
    RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
    DECLARE
      existing_agente TEXT;
    BEGIN
      -- BLOCK: prevent changing agente if already set on this entry
      -- Allow setting to NULL (admin clearing the agent)
      IF TG_OP = 'UPDATE' THEN
        IF OLD.agente IS NOT NULL AND NEW.agente IS NOT NULL AND NEW.agente IS DISTINCT FROM OLD.agente THEN
          RAISE EXCEPTION 'El código de agente no puede cambiarse una vez asignado.';
        END IF;
      END IF;

      -- BLOCK: enforce same agente across ALL entries for the same user
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
  