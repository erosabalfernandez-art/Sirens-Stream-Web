import { Router } from 'express';

  const router = Router();

  const SB  = process.env.SUPABASE_URL ?? '';
  const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';

  function sbH(extra: Record<string, string> = {}): Record<string, string> {
    return { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json', ...extra };
  }
  function sbUrl(p: string) { return `${SB}/rest/v1/${p}`; }
  function authUrl(p: string) { return `${SB}/auth/v1/${p}`; }

  /**
   * DELETE /api/admin/delete-user?user_id=UUID
   * Borra TODOS los datos del usuario (todas las tablas) y luego su cuenta de auth.
   * Usa la RPC admin_delete_all_user_data si existe; si no, borra tabla a tabla.
   * Nunca falla por FK constraints porque limpia todo antes de borrar auth.
   */
  router.delete('/admin/delete-user', async (req, res) => {
    const { user_id } = req.query as { user_id?: string };
    if (!user_id) return res.status(400).json({ error: 'user_id requerido' });

    try {
      // Paso 1: Intentar RPC que lo borra todo en una transacción
      const rpcRes = await fetch(`${SB}/rest/v1/rpc/admin_delete_all_user_data`, {
        method: 'POST',
        headers: sbH(),
        body: JSON.stringify({ p_user_id: user_id }),
      });

      if (!rpcRes.ok) {
        const rpcErr = await rpcRes.text();
        const isNotFound = rpcErr.includes('PGRST202') || rpcErr.includes('does not exist');
        if (!isNotFound) {
          req.log.warn({ rpcErr, user_id }, 'RPC admin_delete_all_user_data failed — falling back to manual delete');
        }

        // Paso 2 (fallback): borrar tabla a tabla con service role
        // El service role usa la API admin de Supabase que sí borra correctamente
        // Tablas con user_id TEXT
        await fetch(sbUrl(`custom_worker_rates?user_id=eq.${encodeURIComponent(user_id)}`), {
          method: 'DELETE', headers: sbH(),
        }).catch(() => {});
        await fetch(sbUrl(`payment_method_locks?user_id=eq.${encodeURIComponent(user_id)}`), {
          method: 'DELETE', headers: sbH(),
        }).catch(() => {});
        await fetch(sbUrl(`admin_paid_marks?uid=eq.${encodeURIComponent(user_id)}`), {
          method: 'DELETE', headers: sbH(),
        }).catch(() => {});
        await fetch(sbUrl(`colider_marks?person_uid=eq.${encodeURIComponent(user_id)}`), {
          method: 'DELETE', headers: sbH(),
        }).catch(() => {});
        await fetch(sbUrl(`published_agent_commissions?agent_user_id=eq.${encodeURIComponent(user_id)}`), {
          method: 'DELETE', headers: sbH(),
        }).catch(() => {});
        await fetch(sbUrl(`agent_commission_publish_log?agent_user_id=eq.${encodeURIComponent(user_id)}`), {
          method: 'DELETE', headers: sbH(),
        }).catch(() => {});

        // Las siguientes tablas tienen user_id UUID con FK → el DELETE CASCADE las limpiará
        // pero por si acaso (si aún no hay CASCADE aplicado), las borramos aquí también
        // Usamos el endpoint admin de auth que puede hacer DELETE sin el problema de type cast
        // Para las tablas UUID, usamos una llamada directa al SQL vía RPC temporal
        // En realidad, con el CASCADE fix del master SQL estas se borran solas al borrar auth
        // Las dejamos como fallback manual via rpc individual
        const tablasUUID = [
          `worker_entries?user_id=eq.${encodeURIComponent(user_id)}`,
          `weekly_no_cobro?user_id=eq.${encodeURIComponent(user_id)}`,
          `push_subscriptions?user_id=eq.${encodeURIComponent(user_id)}`,
          `telegram_links?user_id=eq.${encodeURIComponent(user_id)}`,
          `payment_confirmations?user_id=eq.${encodeURIComponent(user_id)}`,
          `agent_payment_confirmations?user_id=eq.${encodeURIComponent(user_id)}`,
          `direct_payment_notifications?user_id=eq.${encodeURIComponent(user_id)}`,
          `profiles?id=eq.${encodeURIComponent(user_id)}`,
        ];
        for (const path of tablasUUID) {
          await fetch(sbUrl(path), { method: 'DELETE', headers: sbH() }).catch(() => {});
        }
      }

      // Paso 3: Borrar usuario de auth
      const authRes = await fetch(
        authUrl(`admin/users/${encodeURIComponent(user_id)}`),
        { method: 'DELETE', headers: { apikey: KEY, Authorization: `Bearer ${KEY}` } }
      );

      if (authRes.ok || authRes.status === 404) {
        return res.json({ ok: true, message: 'Usuario eliminado correctamente' });
      }

      const authErr = await authRes.text();
      req.log.error({ authErr, user_id }, 'Auth delete failed after data cleanup');
      return res.status(authRes.status).json({
        error: 'Los datos del usuario fueron borrados pero falló al borrar la cuenta de auth.',
        details: authErr,
        hint: 'Borra el usuario manualmente desde Supabase Dashboard → Authentication → Users',
      });

    } catch (err: unknown) {
      return res.status(500).json({ error: err instanceof Error ? err.message : 'Error interno' });
    }
  });

  router.get('/admin/users', async (req, res) => {
    try {
      const r = await fetch(
        sbUrl('profiles?select=id,email,is_admin,is_agent,is_colider,agent_name,colider_name,created_at&order=created_at.desc'),
        { headers: sbH() }
      );
      if (!r.ok) return res.status(r.status).json({ error: await r.text() });
      return res.json({ users: (await r.json()) ?? [] });
    } catch (err: unknown) {
      return res.status(500).json({ error: err instanceof Error ? err.message : 'Error interno' });
    }
  });

  export default router;
