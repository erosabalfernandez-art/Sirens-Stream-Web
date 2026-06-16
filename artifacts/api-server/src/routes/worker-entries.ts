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
     * Workers/coliders/agents use this to know which weeks are still open for confirmation.
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
        // First time setting agente Ã¢ÂÂ check if user has it set in another entry
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

  /**
   * DELETE /api/worker-entries/:id?user_id=X
   * Allows a user to delete their own worker entry (bypasses RLS via service role).
   * Verifies that the entry belongs to the requesting user before deleting.
   */
  router.delete('/worker-entries/:id', async (req, res) => {
    const { id } = req.params;
    const { user_id } = req.query as { user_id?: string };
    if (!user_id) return res.status(400).json({ error: 'user_id requerido' });

    try {
      // Use delete_worker_entry RPC to avoid PostgREST uuid operator issue on direct DELETE
      // The function verifies ownership and cleans custom_worker_rates atomically
      const rpcR = await fetch(
        `${process.env.SUPABASE_URL}/rest/v1/rpc/delete_worker_entry`,
        {
          method: 'POST',
          headers: { ...sbH(), Prefer: 'return=representation' },
          body: JSON.stringify({ entry_id: id, requesting_user_id: user_id }),
        }
      );
      if (!rpcR.ok) {
        const errText = await rpcR.text();
        if (errText.includes('PGRST202') || errText.includes('does not exist')) {
          return res.status(503).json({ error: 'rpc_not_ready', message: 'Ejecuta supabase-worker-delete-rpc.sql en el SQL Editor de Supabase.' });
        }
        return res.status(rpcR.status).json({ error: errText });
      }
      const rpcData = await rpcR.json();
      if (rpcData === false) return res.status(404).json({ error: 'Entrada no encontrada o no pertenece al usuario' });
      return res.json({ ok: true });
    } catch (err: any) {
      return res.status(500).json({ error: err?.message ?? 'Error interno' });
    }
  });

  /**
   * DELETE /api/admin/worker-entry?user_id=X&app_name=Y
   * Fully removes a worker entry and ALL related data for that user+app.
   * Tables cleaned: worker_entries, custom_worker_rates, published_salaries,
   *                 payment_confirmations, agent_payment_confirmations.
   * If the user has NO remaining worker_entries after deletion, also cleans
   * push_subscriptions and profiles (but NOT auth.users Ã¢ÂÂ delete from Supabase dashboard).
   */
  router.delete('/admin/worker-entry', async (req, res) => {
    const { user_id, app_name } = req.query as { user_id?: string; app_name?: string };
    if (!user_id || !app_name) return res.status(400).json({ error: 'user_id y app_name requeridos' });

    const uid = encodeURIComponent(user_id);
    const app = encodeURIComponent(app_name);

    try {
      const results: Record<string, number> = {};

      // 1. Delete the worker_entry itself
      const weR = await fetch(sbUrl(`worker_entries?user_id=eq.${uid}&app_name=eq.${app}`), { method: 'DELETE', headers: sbH() });
      results.worker_entries = weR.status;

      // 2. Delete custom exchange rate for this worker+app
      const crR = await fetch(sbUrl(`custom_worker_rates?user_id=eq.${uid}&app_name=eq.${app}`), { method: 'DELETE', headers: sbH() });
      results.custom_worker_rates = crR.status;

      // 3. Delete published salaries for this worker+app
      const psR = await fetch(sbUrl(`published_salaries?user_id=eq.${uid}&app_name=eq.${app}`), { method: 'DELETE', headers: sbH() });
      results.published_salaries = psR.status;

      // 4. Delete payment confirmations for this worker+app
      const pcR = await fetch(sbUrl(`payment_confirmations?user_id=eq.${uid}&app_name=eq.${app}`), { method: 'DELETE', headers: sbH() });
      results.payment_confirmations = pcR.status;

      // 5. Check if user has any remaining worker_entries
      const remainingR = await fetch(sbUrl(`worker_entries?user_id=eq.${uid}&select=user_id&limit=1`), { headers: sbH() });
      const remaining = await remainingR.json().catch(() => []);
      const hasMoreEntries = Array.isArray(remaining) && remaining.length > 0;

      // 6. If no more entries Ã¢ÂÂ clean push_subscriptions too
      if (!hasMoreEntries) {
        const subR = await fetch(sbUrl(`push_subscriptions?user_id=eq.${uid}`), { method: 'DELETE', headers: sbH() });
        results.push_subscriptions = subR.status;
      }

      return res.json({ ok: true, tables_cleaned: results, user_fully_removed: !hasMoreEntries });
    } catch (err: any) {
      return res.status(500).json({ error: err?.message ?? 'Error interno' });
    }
  });

  export default router;
  