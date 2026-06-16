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
   * DELETE /api/admin/delete-user?user_id=UUID
   * Deletes a user completely: worker_entries, profile, and auth account.
   * Requires running supabase-cleanup-and-cascade-fix.sql first.
   */
  router.delete('/admin/delete-user', async (req, res) => {
    const { user_id } = req.query as { user_id?: string };
    if (!user_id) return res.status(400).json({ error: 'user_id requerido' });

    try {
      const supabaseUrl = process.env.SUPABASE_URL ?? '';
      const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';

      const rpcRes = await fetch(`${supabaseUrl}/rest/v1/rpc/admin_delete_all_user_data`, {
        method: 'POST',
        headers: sbH(),
        body: JSON.stringify({ p_user_id: user_id }),
      });

      if (!rpcRes.ok) {
        const rpcErr = await rpcRes.text();
        if (!(rpcErr.includes('PGRST202') || rpcErr.includes('does not exist'))) {
          req.log.error({ rpcErr, user_id }, 'RPC admin_delete_all_user_data failed');
        }
        await fetch(sbUrl(`profiles?id=eq.${encodeURIComponent(user_id)}`), {
          method: 'DELETE', headers: sbH(),
        }).catch(() => {});
      }

      const authRes = await fetch(
        `${supabaseUrl}/auth/v1/admin/users/${encodeURIComponent(user_id)}`,
        { method: 'DELETE', headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` } }
      );

      if (authRes.ok || authRes.status === 404) {
        return res.json({ ok: true, message: 'Usuario eliminado correctamente' });
      }

      const authErr = await authRes.text();
      if (authErr.includes('Database error') || authErr.includes('foreign key')) {
        return res.status(500).json({
          error: 'FK constraint activo. Ejecuta primero supabase-cleanup-and-cascade-fix.sql en Supabase SQL Editor.',
          details: authErr,
        });
      }
      return res.status(authRes.status).json({ error: authErr });
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
  