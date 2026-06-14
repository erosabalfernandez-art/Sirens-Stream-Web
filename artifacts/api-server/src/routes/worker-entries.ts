import { Router } from 'express';

  const router = Router();

  function sbH(): Record<string, string> {
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
    return { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' };
  }
  function sbUrl(p: string) {
    return `${process.env.SUPABASE_URL}/rest/v1/${p}`;
  }

  /**
   * GET /api/admin/all-workers
   * Returns all worker_entries (for admin use - bypasses RLS via service role)
   */
  router.get('/admin/all-workers', async (req, res) => {
    try {
      const r = await fetch(
        sbUrl('worker_entries?select=user_id,app_name,nombre_en_app,nombre_real,metodo_pago&order=nombre_en_app.asc'),
        { headers: sbH() }
      );
      if (!r.ok) return res.status(r.status).json({ error: await r.text() });
      const data = await r.json();
      return res.json({ workers: data ?? [] });
    } catch (err: any) {
      return res.status(500).json({ error: err?.message ?? 'Error interno' });
    }
  });

  /**
   * POST /api/worker-entries
   * Body: same fields as worker_entries table
   * Enforces: agente cannot differ from any existing agente for same user
   */
  router.post('/worker-entries', async (req, res) => {
    try {
      const payload = req.body as Record<string, unknown>;
      const userId = payload.user_id as string;
      if (!userId) return res.status(400).json({ error: 'user_id requerido' });

      // Enforce agent lock: check if user already has an agente set in any entry
      const existingR = await fetch(
        sbUrl(`worker_entries?user_id=eq.${encodeURIComponent(userId)}&agente=not.is.null&select=agente&limit=1`),
        { headers: sbH() }
      );
      const existing = await existingR.json() as { agente: string }[];
      const lockedAgente = existing[0]?.agente ?? null;

      if (lockedAgente) {
        // Force the locked agente regardless of what was sent
        payload.agente = lockedAgente;
      }

      const insertR = await fetch(sbUrl('worker_entries'), {
        method: 'POST',
        headers: { ...sbH(), Prefer: 'return=representation' },
        body: JSON.stringify(payload),
      });
      const data = await insertR.json();
      if (!insertR.ok) return res.status(insertR.status).json(data);
      return res.status(201).json(Array.isArray(data) ? data[0] : data);
    } catch (err: any) {
      return res.status(500).json({ error: err?.message ?? 'Error interno' });
    }
  });

  /**
   * PATCH /api/worker-entries/:id
   * Body: fields to update
   * Enforces: agente cannot be changed if already set
   */
  router.patch('/worker-entries/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const payload = req.body as Record<string, unknown>;
      const userId = payload.user_id as string;
      if (!userId) return res.status(400).json({ error: 'user_id requerido' });

      // Fetch the current entry to check agente
      const currentR = await fetch(
        sbUrl(`worker_entries?id=eq.${encodeURIComponent(id)}&user_id=eq.${encodeURIComponent(userId)}&select=agente,id_aplicacion&limit=1`),
        { headers: sbH() }
      );
      const current = await currentR.json() as { agente: string | null; id_aplicacion: string | null }[];
      if (!current.length) return res.status(404).json({ error: 'Entrada no encontrada' });

      const currentAgente = current[0].agente;

        // Lock: id_aplicacion cannot be changed once set
        if (current[0].id_aplicacion) {
          payload.id_aplicacion = current[0].id_aplicacion;
        }

      if (currentAgente !== null && currentAgente !== undefined && currentAgente !== '') {
        // Lock: force the existing agente, ignore any incoming agente change
        payload.agente = currentAgente;
      } else if (payload.agente) {
        // First time setting agente — check if user has it set in another entry
        const otherR = await fetch(
          sbUrl(`worker_entries?user_id=eq.${encodeURIComponent(userId)}&agente=not.is.null&id=neq.${encodeURIComponent(id)}&select=agente&limit=1`),
          { headers: sbH() }
        );
        const other = await otherR.json() as { agente: string }[];
        if (other[0]?.agente && other[0].agente !== payload.agente) {
          payload.agente = other[0].agente; // enforce same agente across all entries
        }
      }

      const updateR = await fetch(
        sbUrl(`worker_entries?id=eq.${encodeURIComponent(id)}&user_id=eq.${encodeURIComponent(userId)}`),
        {
          method: 'PATCH',
          headers: { ...sbH(), Prefer: 'return=representation' },
          body: JSON.stringify(payload),
        }
      );
      const data = await updateR.json();
      if (!updateR.ok) return res.status(updateR.status).json(data);
      return res.json(Array.isArray(data) ? data[0] : data);
    } catch (err: any) {
      return res.status(500).json({ error: err?.message ?? 'Error interno' });
    }
  });

  export default router;
  