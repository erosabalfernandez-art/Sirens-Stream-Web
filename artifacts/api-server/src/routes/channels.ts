import { Router } from 'express';
  import { dispatchPush, dispatchPushIndividual } from '../lib/push-dispatch';

  const router = Router();

  function sbH(): Record<string, string> {
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
    return { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' };
  }
  function sbUrl(p: string) {
    return `${process.env.SUPABASE_URL}/rest/v1/${p}`;
  }

  // GET /api/channel-access?user_id=X
  router.get('/channel-access', async (req, res) => {
    const user_id = req.query.user_id as string | undefined;
    if (!user_id) return res.status(400).json({ error: 'user_id requerido' });
    try {
      // Check if user is agent or colider — only return admin-granted (approved) channels
      const profileRes = await fetch(sbUrl(`profiles?id=eq.${encodeURIComponent(user_id)}&select=is_agent,is_colider&limit=1`), { headers: sbH() });
      const profiles: {is_agent:boolean;is_colider:boolean}[] = profileRes.ok ? await profileRes.json() : [];
      const p = profiles[0];
      const isAgentOrColider = p?.is_agent || p?.is_colider;
      const filter = isAgentOrColider
        ? `channel_requests?user_id=eq.${encodeURIComponent(user_id)}&status=eq.approved&select=app_name,status`
        : `channel_requests?user_id=eq.${encodeURIComponent(user_id)}&select=app_name,status`;
      const r = await fetch(sbUrl(filter), { headers: sbH() });
      if (!r.ok) return res.status(r.status).json({ error: await r.text() });
      const requests = await r.json();
      return res.json({ requests });
    } catch (e: unknown) {
      return res.status(500).json({ error: e instanceof Error ? e.message : 'error' });
    }
  });

  // GET /api/channel-approved-users?app=X
  router.get('/channel-approved-users', async (req, res) => {
    const app = req.query.app as string | undefined;
    if (!app) return res.status(400).json({ error: 'app requerido' });
    try {
      const r = await fetch(
        sbUrl(`channel_requests?app_name=eq.${encodeURIComponent(app)}&status=eq.approved&select=user_id`),
        { headers: sbH() }
      );
      if (!r.ok) return res.status(r.status).json({ error: await r.text() });
      const rows: { user_id: string }[] = await r.json();
      return res.json({ user_ids: rows.map((row) => row.user_id) });
    } catch (e: unknown) {
      return res.status(500).json({ error: e instanceof Error ? e.message : 'error' });
    }
  });

  // POST /api/post-channel-message
  router.post('/post-channel-message', async (req, res) => {
    const { app_name, content, image_url, created_by } = req.body as {
      app_name?: string; content?: string; image_url?: string; created_by?: string;
    };
    if (!app_name) return res.status(400).json({ error: 'app_name requerido' });
    if (!content?.trim() && !image_url?.trim()) return res.status(400).json({ error: 'content o image_url requerido' });
    try {
      // Insert message via service role
      const msgR = await fetch(sbUrl('channel_messages'), {
        method: 'POST',
        headers: { ...sbH(), Prefer: 'return=representation' },
        body: JSON.stringify({
          app_name,
          content: content?.trim() ?? null,
          image_url: image_url?.trim() ?? null,
          created_by: created_by ?? null,
        }),
      });
      if (!msgR.ok) return res.status(msgR.status).json({ error: await msgR.text() });
      const [msg] = await msgR.json();

      // Get all approved users (service role — bypasses RLS)
      const usersR = await fetch(
        sbUrl(`channel_requests?app_name=eq.${encodeURIComponent(app_name)}&status=eq.approved&select=user_id`),
        { headers: sbH() }
      );
      const usersRows: { user_id: string }[] = usersR.ok ? await usersR.json() : [];
      const ids = usersRows.map((u) => u.user_id).filter(Boolean);

      // Send push notifications to workers + agents (fire-and-forget)
      // Send push notifications only to users with approved channel access (fire-and-forget)
      setImmediate(async () => {
        try {
          const preview = content?.trim().slice(0, 80) ?? '📷 Imagen';
          if (ids.length > 0) {
            await dispatchPush(ids, `📢 Nuevo comunicado — ${app_name}`, preview, '/canales');
          }
        } catch {}
      });

      return res.json({ ok: true, message: msg, notified: ids.length });
    } catch (e: unknown) {
      return res.status(500).json({ error: e instanceof Error ? e.message : 'error' });
    }
  });

  // GET /api/channel-messages?user_id=X
  // Fetches messages the user is allowed to see (via service role, bypasses RLS).
  router.get('/channel-messages', async (req, res) => {
    const user_id = req.query.user_id as string | undefined;
    if (!user_id) return res.status(400).json({ error: 'user_id requerido' });
    try {
      // Get approved apps for this user
      const accessR = await fetch(
        sbUrl(`channel_requests?user_id=eq.${encodeURIComponent(user_id)}&status=eq.approved&select=app_name`),
        { headers: sbH() }
      );
      if (!accessR.ok) return res.status(accessR.status).json({ error: await accessR.text() });
      const approvedApps: { app_name: string }[] = await accessR.json();
      if (approvedApps.length === 0) return res.json({ messages: [] });
      const appNames = approvedApps.map(a => a.app_name);
      const msgsR = await fetch(
        sbUrl(`channel_messages?app_name=in.(${appNames.map(encodeURIComponent).join(',')})&select=*&order=created_at.desc`),
        { headers: sbH() }
      );
      if (!msgsR.ok) return res.status(msgsR.status).json({ error: await msgsR.text() });
      const messages = await msgsR.json();
      return res.json({ messages });
    } catch (e: unknown) {
      return res.status(500).json({ error: e instanceof Error ? e.message : 'error' });
    }
  });

  
    // POST /api/grant-agent-channels
    // Grants access to all channels (all distinct app_names in channel_messages) for a given user
    router.post('/grant-agent-channels', async (req, res) => {
      const { user_id } = req.body as { user_id?: string };
      if (!user_id) return res.status(400).json({ error: 'user_id requerido' });
      try {
        // Get all distinct channel apps from channel_messages
        const appsRes = await fetch(sbUrl('channel_messages?select=app_name'), { headers: sbH() });
        const allMsgs: { app_name: string }[] = appsRes.ok ? await appsRes.json() : [];
        const appNames = [...new Set(allMsgs.map((m) => m.app_name).filter(Boolean))];
        if (appNames.length === 0) return res.json({ ok: true, granted: 0, apps: [] });

        // Get existing channel_requests for this user
        const existingRes = await fetch(
          sbUrl(`channel_requests?user_id=eq.${encodeURIComponent(user_id)}&select=id,app_name,status`),
          { headers: sbH() }
        );
        const existing: { id: string; app_name: string; status: string }[] = existingRes.ok ? await existingRes.json() : [];
        const existingMap = new Map(existing.map((e) => [e.app_name, e]));

        const toInsert: string[] = [];
        const toUpdate: string[] = []; // app_names already in DB (update to approved)

        for (const app_name of appNames) {
          if (existingMap.has(app_name)) {
            const entry = existingMap.get(app_name)!;
            if (entry.status !== 'approved') toUpdate.push(app_name);
          } else {
            toInsert.push(app_name);
          }
        }

        // Update pending/rejected entries to approved
        if (toUpdate.length > 0) {
          await fetch(
            sbUrl(`channel_requests?user_id=eq.${encodeURIComponent(user_id)}&app_name=in.(${toUpdate.map(encodeURIComponent).join(',')})`),
            {
              method: 'PATCH',
              headers: { ...sbH(), Prefer: 'return=minimal' },
              body: JSON.stringify({ status: 'approved', resolved_at: new Date().toISOString() }),
            }
          );
        }

        // Insert brand-new approved entries
        if (toInsert.length > 0) {
          await fetch(sbUrl('channel_requests'), {
            method: 'POST',
            headers: { ...sbH(), Prefer: 'return=minimal' },
            body: JSON.stringify(
              toInsert.map((app_name) => ({ user_id, app_name, status: 'approved' }))
            ),
          });
        }

        // Notify the user that channels were granted (fire-and-forget)
          if (appNames.length > 0) {
            setImmediate(() => {
              dispatchPushIndividual([{
                userId: user_id,
                title: '📢 Acceso a canales activado',
                body: `Tienes acceso a ${appNames.length} canal${appNames.length !== 1 ? 'es' : ''}. ¡Entra a revisar los comunicados!`,
                url: '/canales',
              }]).catch(() => {});
            });
          }
          return res.json({ ok: true, granted: appNames.length, apps: appNames });
      } catch (e: unknown) {
        return res.status(500).json({ error: e instanceof Error ? e.message : 'error' });
      }
    });

  export default router;
  