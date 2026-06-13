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

  const ALL_APPS = ['Waha', 'Layla', 'Howdy'];

  // GET /api/channel-access?user_id=X
  router.get('/channel-access', async (req, res) => {
    const user_id = req.query.user_id as string | undefined;
    if (!user_id) return res.status(400).json({ error: 'user_id requerido' });
    try {
      // Check user role — agents/coliders/admins get auto-access to all channels by role
      const profileRes = await fetch(sbUrl(`profiles?id=eq.${encodeURIComponent(user_id)}&select=is_admin,is_agent,is_colider&limit=1`), { headers: sbH() });
      const profiles: {is_admin:boolean;is_agent:boolean;is_colider:boolean}[] = profileRes.ok ? await profileRes.json() : [];
      const p = profiles[0];

      // Only admins get auto-access to all channels
      if (p?.is_admin) {
        return res.json({
          requests: ALL_APPS.map(app => ({ app_name: app, status: 'approved' })),
        });
      }

      // Agents and coliders: check channel_requests — admin assigns via dar-canales button
      if (p?.is_agent || p?.is_colider) {
        const crRes = await fetch(sbUrl(`channel_requests?user_id=eq.${encodeURIComponent(user_id)}&select=app_name,status`), { headers: sbH() });
        const requests: { app_name: string; status: string }[] = crRes.ok ? await crRes.json() : [];
        return res.json({ requests });
      }
      // Workers: cross-reference with worker_entries so they only see channels
      // for apps they are actually registered on (prevents stale/orphaned approvals)
      const [crRes, weRes] = await Promise.all([
        fetch(sbUrl(`channel_requests?user_id=eq.${encodeURIComponent(user_id)}&select=app_name,status`), { headers: sbH() }),
        fetch(sbUrl(`worker_entries?user_id=eq.${encodeURIComponent(user_id)}&select=app_name`), { headers: sbH() }),
      ]);
      const allReqs: { app_name: string; status: string }[] = crRes.ok ? await crRes.json() : [];
      const workerApps = new Set<string>((weRes.ok ? await weRes.json() : []).map((w: { app_name: string }) => w.app_name));
      // Only surface requests for apps the worker is currently registered on
      const requests = allReqs.filter(r => workerApps.has(r.app_name));
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

      // Notify users with approved channel_requests for this app + all admins
      const [usersR, adminsR] = await Promise.all([
        fetch(sbUrl(`channel_requests?app_name=eq.${encodeURIComponent(app_name)}&status=eq.approved&select=user_id`), { headers: sbH() }),
        fetch(sbUrl(`profiles?is_admin=eq.true&select=id`), { headers: sbH() }),
      ]);
      const usersRows: { user_id: string }[] = usersR.ok ? await usersR.json() : [];
      const adminRows: { id: string }[] = adminsR.ok ? await adminsR.json() : [];
      const idsSet = new Set<string>([
        ...usersRows.map((u) => u.user_id),
        ...adminRows.map((r) => r.id),
      ]);
      // Exclude the sender; admins always receive even when they wrote the message
      if (created_by) idsSet.delete(created_by);
      if (created_by && adminRows.some(r => r.id === created_by)) idsSet.add(created_by);
      const ids = [...idsSet].filter(Boolean);

      // Send push notifications to all eligible users (fire-and-forget)
      setImmediate(async () => {
        try {
          const preview = content?.trim().slice(0, 80) ?? '📷 Imagen';
          if (ids.length > 0) {
            await dispatchPush(ids, `📢 Nuevo comunicado — ${app_name}`, `Se ha publicado un nuevo comunicado en el canal ${app_name}.`, '/canales');
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
    // Admins, agents and coliders see ALL messages without needing channel_requests entries.
    router.get('/channel-messages', async (req, res) => {
      const user_id = req.query.user_id as string | undefined;
      if (!user_id) return res.status(400).json({ error: 'user_id requerido' });
      try {
        // Check role — admins/agents/coliders see all channel messages automatically
        const profileR = await fetch(
          sbUrl(`profiles?id=eq.${encodeURIComponent(user_id)}&select=is_admin,is_agent,is_colider&limit=1`),
          { headers: sbH() }
        );
        const profiles: { is_admin: boolean; is_agent: boolean; is_colider: boolean }[] = profileR.ok ? await profileR.json() : [];
        const prof = profiles[0];
        if (prof?.is_admin) {
          const allMsgsR = await fetch(
            sbUrl('channel_messages?select=*&order=created_at.desc'),
            { headers: sbH() }
          );
          if (!allMsgsR.ok) return res.status(allMsgsR.status).json({ error: await allMsgsR.text() });
          return res.json({ messages: await allMsgsR.json() });
        }
        // Workers: filter by approved channel_requests
        const accessR = await fetch(
          sbUrl(`channel_requests?user_id=eq.${encodeURIComponent(user_id)}&status=eq.approved&select=app_name`),
          { headers: sbH() }
        );
        if (!accessR.ok) return res.status(accessR.status).json({ error: await accessR.text() });
        const approvedApps: { app_name: string }[] = await accessR.json();
        if (approvedApps.length === 0) return res.json({ messages: [] });
        const appNames = approvedApps.map(a => a.app_name);
        const msgsR = await fetch(
          sbUrl(`channel_messages?app_name=in.(${appNames.join(',')})&select=*&order=created_at.desc`),
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
        // Always grant all 3 app channels — admin assigns directly, no need for messages to exist yet
        const appNames = ['Waha', 'Layla', 'Howdy'];

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


    // POST /api/channel-request-submitted — notify all admins about a new pending channel request
    router.post('/channel-request-submitted', async (req, res) => {
      try {
        const { user_id, app_name } = req.body as { user_id: string; app_name: string };
        if (!user_id || !app_name)
          return res.status(400).json({ error: 'Missing fields' });

        const h = sbH();
        const admRes = await fetch(sbUrl('profiles?is_admin=eq.true&select=id'), { headers: h });
        if (admRes.ok) {
          const admins = await admRes.json() as Array<{ id: string }>;
          const adminIds = admins.map(a => a.id);
          if (adminIds.length) {
            setImmediate(() => {
              dispatchPush(
                adminIds,
                '📋 Nueva solicitud de canal',
                `Una trabajadora solicitó acceso al canal de ${app_name}.`,
                '/admin'
              ).catch(() => {});
            });
          }
        }
        return res.json({ ok: true });
      } catch (e: unknown) {
        return res.status(500).json({ error: e instanceof Error ? e.message : 'error' });
      }
    });

  
  // POST /api/upload-channel-image
  // Body: { base64: string, mime: string, filename: string }
  router.post('/upload-channel-image', async (req, res) => {
    const { base64, mime, filename } = req.body as { base64?: string; mime?: string; filename?: string }
    if (!base64 || !mime || !filename) {
      return res.status(400).json({ error: 'base64, mime y filename son requeridos' })
    }
    const ALLOWED = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
    if (!ALLOWED.includes(mime)) {
      return res.status(400).json({ error: 'Tipo no permitido. Usa JPEG, PNG, GIF o WebP.' })
    }
    try {
      const buffer = Buffer.from(base64, 'base64')
      if (buffer.length > 15 * 1024 * 1024) {
        return res.status(400).json({ error: 'Imagen demasiado grande (máx 15MB)' })
      }
      const ext = mime.split('/')[1].replace('jpeg', 'jpg')
      const safeName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
      const SUPABASE_URL = process.env.SUPABASE_URL ?? ''
      const BUCKET = 'channel-images'
      const bucketKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''
      const storageH: Record<string, string> = {
        apikey: bucketKey,
        Authorization: `Bearer ${bucketKey}`,
      }
      // Ensure bucket exists (ignore 409 if already exists)
      await fetch(`${SUPABASE_URL}/storage/v1/bucket`, {
        method: 'POST',
        headers: { ...storageH, 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: BUCKET, name: BUCKET, public: true }),
      }).catch(() => {})
      // Upload the image
      const uploadRes = await fetch(`${SUPABASE_URL}/storage/v1/object/${BUCKET}/${safeName}`, {
        method: 'POST',
        headers: { ...storageH, 'Content-Type': mime, 'Cache-Control': '3600' },
        body: buffer,
      })
      if (!uploadRes.ok) {
        const errText = await uploadRes.text()
        req.log.warn({ status: uploadRes.status, errText }, 'Supabase storage upload failed')
        return res.status(uploadRes.status).json({ error: `Error al subir: ${errText.slice(0, 200)}` })
      }
      const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${safeName}`
      return res.json({ ok: true, url: publicUrl })
    } catch (e: unknown) {
      req.log.error({ err: e }, 'upload-channel-image error')
      return res.status(500).json({ error: e instanceof Error ? e.message : 'error desconocido' })
    }
  })

  
  // POST /api/channel-reaction — toggle a reaction (heart or like) on a message
  router.post('/channel-reaction', async (req, res) => {
    const { message_id, user_id, reaction_type } = req.body as {
      message_id: string; user_id: string; reaction_type: 'heart' | 'like';
    };
    if (!message_id || !user_id || !reaction_type) return res.status(400).json({ error: 'Missing fields' });
    try {
      // Check if reaction exists
      const existsRes = await fetch(
        sbUrl(`channel_reactions?message_id=eq.${encodeURIComponent(message_id)}&user_id=eq.${encodeURIComponent(user_id)}&reaction_type=eq.${reaction_type}&select=id`),
        { headers: sbH() }
      );
      const existing: { id: string }[] = existsRes.ok ? await existsRes.json() : [];
      if (Array.isArray(existing) && existing.length > 0) {
        // Toggle off — delete
        await fetch(
          sbUrl(`channel_reactions?message_id=eq.${encodeURIComponent(message_id)}&user_id=eq.${encodeURIComponent(user_id)}&reaction_type=eq.${reaction_type}`),
          { method: 'DELETE', headers: sbH() }
        );
      } else {
        // Toggle on — insert
        await fetch(sbUrl('channel_reactions'), {
          method: 'POST',
          headers: { ...sbH(), Prefer: 'return=minimal' },
          body: JSON.stringify({ message_id, user_id, reaction_type }),
        });
      }
      // Return updated summary for this message
      const summaryRes = await fetch(
        sbUrl(`channel_reactions?message_id=eq.${encodeURIComponent(message_id)}&select=reaction_type,user_id`),
        { headers: sbH() }
      );
      const all: { reaction_type: string; user_id: string }[] = summaryRes.ok ? await summaryRes.json() : [];
      return res.json({
        ok: true,
        summary: {
          heart: all.filter(r => r.reaction_type === 'heart').length,
          like: all.filter(r => r.reaction_type === 'like').length,
          user_heart: all.some(r => r.reaction_type === 'heart' && r.user_id === user_id),
          user_like: all.some(r => r.reaction_type === 'like' && r.user_id === user_id),
        },
      });
    } catch (e: unknown) {
      return res.status(500).json({ error: e instanceof Error ? e.message : 'error' });
    }
  });

  // GET /api/channel-reactions-bulk?message_ids=id1,id2,...&user_id=X
  router.get('/channel-reactions-bulk', async (req, res) => {
    const rawIds = req.query.message_ids as string | undefined;
    const user_id = req.query.user_id as string | undefined;
    if (!rawIds) return res.json({ reactions: {} });
    const messageIds = rawIds.split(',').filter(Boolean);
    if (messageIds.length === 0) return res.json({ reactions: {} });
    try {
      const encodedIds = messageIds.map(encodeURIComponent).join(',');
      const r = await fetch(
        sbUrl(`channel_reactions?message_id=in.(${encodedIds})&select=message_id,reaction_type,user_id`),
        { headers: sbH() }
      );
      const all: { message_id: string; reaction_type: string; user_id: string }[] = r.ok ? await r.json() : [];
      const result: Record<string, { heart: number; like: number; user_heart: boolean; user_like: boolean }> = {};
      for (const msgId of messageIds) {
        const rows = all.filter(r => r.message_id === msgId);
        result[msgId] = {
          heart: rows.filter(r => r.reaction_type === 'heart').length,
          like: rows.filter(r => r.reaction_type === 'like').length,
          user_heart: rows.some(r => r.reaction_type === 'heart' && r.user_id === user_id),
          user_like: rows.some(r => r.reaction_type === 'like' && r.user_id === user_id),
        };
      }
      return res.json({ reactions: result });
    } catch (e: unknown) {
      return res.status(500).json({ error: e instanceof Error ? e.message : 'error' });
    }
  });

  // GET /api/payment-stickers?app_name=X
  router.get('/payment-stickers', async (req, res) => {
    const app_name = req.query.app_name as string | undefined;
    if (!app_name) return res.status(400).json({ error: 'app_name requerido' });
    try {
      const r = await fetch(
        sbUrl(`payment_sticker_events?app_name=eq.${encodeURIComponent(app_name)}&order=created_at.asc&limit=200&select=*`),
        { headers: sbH() }
      );
      if (!r.ok) return res.status(r.status).json({ error: await r.text() });
      const events = await r.json();
      return res.json({ events: Array.isArray(events) ? events : [] });
    } catch (e: unknown) {
      return res.status(500).json({ error: e instanceof Error ? e.message : 'error' });
    }
  });

  // POST /api/payment-sticker — called when a worker/agent marks payment received
  router.post('/payment-sticker', async (req, res) => {
    const { user_id, app_name, nombre_en_app, sticker_index } = req.body as {
      user_id: string; app_name: string; nombre_en_app?: string; sticker_index?: number;
    };
    if (!user_id || !app_name) return res.status(400).json({ error: 'user_id y app_name requeridos' });
    try {
      const idx = sticker_index !== undefined ? sticker_index : Math.floor(Math.random() * 3);
      const r = await fetch(sbUrl('payment_sticker_events'), {
        method: 'POST',
        headers: { ...sbH(), Prefer: 'return=minimal' },
        body: JSON.stringify({ user_id, app_name, nombre_en_app: nombre_en_app ?? null, sticker_index: idx }),
      });
      if (!r.ok) return res.status(r.status).json({ error: await r.text() });
        // Notify all admins (fire-and-forget)
        setImmediate(async () => {
          try {
            const admRes2 = await fetch(sbUrl('profiles?is_admin=eq.true&select=id'), { headers: sbH() });
            const admins2: Array<{ id: string }> = admRes2.ok ? await admRes2.json() : [];
            const adminIds2 = admins2.map((a) => a.id);
            if (adminIds2.length > 0) {
              const displayName = nombre_en_app ?? 'Una trabajadora';
              await dispatchPush(
                adminIds2,
                '💸 Pago recibido',
                `${displayName} marcó que recibió su pago en ${app_name}.`,
                '/canales'
              );
            }
          } catch { /* fire-and-forget */ }
        });
        return res.json({ ok: true });
      } catch (e: unknown) {
        return res.status(500).json({ error: e instanceof Error ? e.message : 'error' });
      }
    });


  export default router;
