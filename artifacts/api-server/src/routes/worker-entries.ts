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
        sbUrl('worker_entries?select=user_id,app_name,nombre_en_app,nombre_real,metodo_pago,telefono,codigo_pais,id_aplicacion&order=nombre_real.asc,nombre_en_app.asc'),
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
     * GET /api/worker/my-rates?user_id=X
     * Returns custom cup rates + global exchange_rates for the given worker (service role, bypasses RLS)
     */
    router.get('/worker/my-rates', async (req, res) => {
      const { user_id } = req.query as { user_id?: string }
      if (!user_id) return res.status(400).json({ error: 'user_id required' })
      try {
        const [crRes, grRes] = await Promise.all([
          fetch(sbUrl(`custom_worker_rates?user_id=eq.${encodeURIComponent(user_id)}&select=app_name,efectivo_rate,transferencia_rate`), { headers: sbH() })
            .then(r => r.ok ? r.json() : []).catch(() => []),
          fetch(sbUrl('exchange_rates?select=id,rate,updated_at'), { headers: sbH() })
            .then(r => r.ok ? r.json() : []).catch(() => []),
        ])
        const custom: Record<string, {efectivo_rate: number; transferencia_rate: number}> = {}
        for (const c of (crRes as any[])) custom[c.app_name] = { efectivo_rate: Number(c.efectivo_rate) || 0, transferencia_rate: Number(c.transferencia_rate) || 0 }
        const global: Record<string, number> = {}
        for (const g of (grRes as any[])) global[g.id] = Number(g.rate) || 0
        return res.json({ custom, global })
      } catch (err: any) {
        return res.status(500).json({ error: err?.message ?? 'Error interno' })
      }
    })

    /**
       * GET /api/active-semanas
     * Returns semanas where nomina_history.published = true (service role, bypasses RLS)
     */
    router.get('/active-semanas', async (req, res) => {
      try {
        const r = await fetch(
          sbUrl('nomina_history?published=eq.true&select=semana'),
          { headers: sbH() }
        );
        if (!r.ok) return res.status(r.status).json({ error: await r.text() });
        const data = await r.json() as { semana: string }[];
        return res.json({ semanas: data.map((d: { semana: string }) => d.semana) });
      } catch (err: any) {
        return res.status(500).json({ error: err?.message ?? 'Error interno' });
      }
    });

    /**
     * POST /api/worker-entries
   * Body: same fields as worker_entries table
   */
  router.post('/worker-entries', async (req, res) => {
    try {
      const payload = req.body as Record<string, unknown>;
      const userId = payload.user_id as string;
      if (!userId) return res.status(400).json({ error: 'user_id requerido' });

      const existingR = await fetch(
        sbUrl(`worker_entries?user_id=eq.${encodeURIComponent(userId)}&agente=not.is.null&select=agente&limit=1`),
        { headers: sbH() }
      );
      const existing = await existingR.json() as { agente: string }[];
      const lockedAgente = existing[0]?.agente ?? null;

      if (lockedAgente) {

        // Block agents/coliders from being linked to any agent code
        const profileR = await fetch(sbUrl(`profiles?id=eq.${encodeURIComponent(userId)}&select=is_agent,is_colider,agent_code&limit=1`), { headers: sbH() });
        if (profileR.ok) {
          const [prof] = await profileR.json() as { is_agent?: boolean; is_colider?: boolean; agent_code?: string | null }[];
          if (prof?.is_agent || prof?.is_colider || prof?.agent_code) {
            payload.agente = null;
          }
        }
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
   */
  router.patch('/worker-entries/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const payload = req.body as Record<string, unknown>;
      const userId = payload.user_id as string;
      if (!userId) return res.status(400).json({ error: 'user_id requerido' });

      const currentR = await fetch(
        sbUrl(`worker_entries?id=eq.${encodeURIComponent(id)}&user_id=eq.${encodeURIComponent(userId)}&select=agente,id_aplicacion&limit=1`),
        { headers: sbH() }
      );
      const current = await currentR.json() as { agente: string | null; id_aplicacion: string | null }[];
      if (!current.length) return res.status(404).json({ error: 'Entrada no encontrada' });

      const currentAgente = current[0].agente;

        if (current[0].id_aplicacion) {
          payload.id_aplicacion = current[0].id_aplicacion;
        }

      if (currentAgente !== null && currentAgente !== undefined && currentAgente !== '') {
        payload.agente = currentAgente;
      } else if (payload.agente) {
        const otherR = await fetch(
          sbUrl(`worker_entries?user_id=eq.${encodeURIComponent(userId)}&agente=not.is.null&id=neq.${encodeURIComponent(id)}&select=agente&limit=1`),
          { headers: sbH() }
        );
        const other = await otherR.json() as { agente: string }[];
        if (other[0]?.agente && other[0].agente !== payload.agente) {
          payload.agente = other[0].agente;
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

  /**
   * DELETE /api/worker-entries/:id?user_id=X
   * Uses admin_delete_worker_entry RPC (SECURITY DEFINER) to bypass RLS DELETE bug.
   * Verifies ownership before calling.
   */
  router.delete('/worker-entries/:id', async (req, res) => {
    const { id } = req.params;
    const { user_id } = req.query as { user_id?: string };
    if (!user_id) return res.status(400).json({ error: 'user_id requerido' });

    try {
      // First verify ownership
      const checkR = await fetch(
        sbUrl(`worker_entries?id=eq.${encodeURIComponent(id)}&user_id=eq.${encodeURIComponent(user_id)}&select=id&limit=1`),
        { headers: sbH() }
      );
      const checkData = await checkR.json() as any[];
      if (!Array.isArray(checkData) || checkData.length === 0) {
        return res.status(404).json({ error: 'Entrada no encontrada o no pertenece al usuario' });
      }

      // Use admin_delete_worker_entry (SECURITY DEFINER — bypasses RLS DELETE bug)
      const rpcR = await fetch(
        `${process.env.SUPABASE_URL}/rest/v1/rpc/admin_delete_worker_entry`,
        {
          method: 'POST',
          headers: { ...sbH(), Prefer: 'return=representation' },
          body: JSON.stringify({ entry_id: id }),
        }
      );
      if (!rpcR.ok) {
        const errText = await rpcR.text();
        if (errText.includes('PGRST202') || errText.includes('does not exist')) {
          return res.status(503).json({
            error: 'rpc_not_ready',
            message: 'Ejecuta supabase-worker-delete-rpc.sql en el SQL Editor de Supabase para habilitar el borrado de entradas.'
          });
        }
        return res.status(rpcR.status).json({ error: errText });
      }
      const rpcData = await rpcR.json();
      if (rpcData === false) return res.status(404).json({ error: 'Entrada no encontrada' });
      return res.json({ ok: true });
    } catch (err: any) {
      return res.status(500).json({ error: err?.message ?? 'Error interno' });
    }
  });

  /**
   * DELETE /api/admin/worker-entry?user_id=X&app_name=Y
   * Admin: delete a specific worker entry by user_id + app_name.
   * Uses admin_delete_worker_entry RPC (SECURITY DEFINER).
   */
  router.delete('/admin/worker-entry', async (req, res) => {
    const { user_id, app_name } = req.query as { user_id?: string; app_name?: string };
    if (!user_id || !app_name) return res.status(400).json({ error: 'user_id y app_name requeridos' });

    try {
      // Find the entry ID first (GET works fine)
      const findR = await fetch(
        sbUrl(`worker_entries?user_id=eq.${encodeURIComponent(user_id)}&app_name=eq.${encodeURIComponent(app_name)}&select=id&limit=1`),
        { headers: sbH() }
      );
      const found = await findR.json() as { id: string }[];
      if (!found.length) return res.status(404).json({ error: 'Entrada no encontrada' });

      const entryId = found[0].id;

      const rpcR = await fetch(
        `${process.env.SUPABASE_URL}/rest/v1/rpc/admin_delete_worker_entry`,
        {
          method: 'POST',
          headers: { ...sbH(), Prefer: 'return=representation' },
          body: JSON.stringify({ entry_id: entryId }),
        }
      );
      if (!rpcR.ok) {
        const errText = await rpcR.text();
        if (errText.includes('PGRST202') || errText.includes('does not exist')) {
          return res.status(503).json({
            error: 'rpc_not_ready',
            message: 'Ejecuta supabase-worker-delete-rpc.sql en el SQL Editor de Supabase.'
          });
        }
        return res.status(rpcR.status).json({ error: errText });
      }

      return res.json({ ok: true });
    } catch (err: any) {
      return res.status(500).json({ error: err?.message ?? 'Error interno' });
    }
  });

  /**
   * DELETE /api/admin/cleanup-entries
   * Admin: delete a list of worker entries by their IDs (for cleanup after user deletion).
   * Uses admin_delete_worker_entry RPC (SECURITY DEFINER).
   */
  router.delete('/admin/cleanup-entries', async (req, res) => {
    const { ids } = req.body as { ids?: string[] };
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'ids array requerido' });
    }

    const results: Record<string, string> = {};
    for (const entryId of ids) {
      try {
        const rpcR = await fetch(
          `${process.env.SUPABASE_URL}/rest/v1/rpc/admin_delete_worker_entry`,
          {
            method: 'POST',
            headers: { ...sbH(), Prefer: 'return=representation' },
            body: JSON.stringify({ entry_id: entryId }),
          }
        );
        if (!rpcR.ok) {
          const errText = await rpcR.text();
          if (errText.includes('PGRST202') || errText.includes('does not exist')) {
            results[entryId] = 'rpc_not_ready';
          } else {
            results[entryId] = `error: ${errText.slice(0, 100)}`;
          }
        } else {
          results[entryId] = 'deleted';
        }
      } catch (e: any) {
        results[entryId] = `error: ${e?.message}`;
      }
    }

    return res.json({ results });
  });

  export default router;

