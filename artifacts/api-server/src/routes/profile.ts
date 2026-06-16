import { Router } from 'express';

    const router = Router();

    function sbH(): Record<string, string> {
      const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
      return { apikey: key, Authorization: `Bearer ${key}` };
    }
    function sbUrl(p: string) {
      return `${process.env.SUPABASE_URL}/rest/v1/${p}`;
    }
    function authUrl(p: string) {
      return `${process.env.SUPABASE_URL}/auth/v1/${p}`;
    }

    // POST /api/agent/ensure-code
    router.post('/agent/ensure-code', async (req, res) => {
      const { user_id } = req.body as { user_id?: string }
      if (!user_id) return res.status(400).json({ error: 'user_id requerido' })
      try {
        const checkR = await fetch(
          sbUrl(`profiles?id=eq.${encodeURIComponent(user_id)}&select=agent_code&limit=1`),
          { headers: sbH() }
        )
        if (!checkR.ok) return res.status(checkR.status).json({ error: await checkR.text() })
        const rows = await checkR.json() as { agent_code: string | null }[]
        const existing = rows[0]?.agent_code
        if (existing) return res.json({ agent_code: existing })

        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
        let code = ''
        for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)]

        const patchR = await fetch(
          sbUrl(`profiles?id=eq.${encodeURIComponent(user_id)}`),
          {
            method: 'PATCH',
            headers: { ...sbH(), 'Content-Type': 'application/json', Prefer: 'return=minimal' },
            body: JSON.stringify({ agent_code: code }),
          }
        )
        if (!patchR.ok) return res.status(patchR.status).json({ error: await patchR.text() })
        return res.json({ agent_code: code })
      } catch (e: unknown) {
        return res.status(500).json({ error: e instanceof Error ? e.message : 'error' })
      }
    })

    // GET /api/profile?user_id=UUID
    // Returns the user's profile. If profile exists but auth user was deleted → kicks them out (404).
    // AUTO-CREATES profile if auth user exists but has no profile yet.
    router.get('/profile', async (req, res) => {
      const user_id = req.query.user_id as string | undefined;
      if (!user_id) return res.status(400).json({ error: 'user_id requerido' });

      const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
      const supabaseUrl = process.env.SUPABASE_URL ?? '';

      try {
        // 1. Fetch existing profile
        const r = await fetch(
          sbUrl(`profiles?id=eq.${encodeURIComponent(user_id)}&select=id,email,is_admin,is_agent,is_colider,agent_name,agent_code,colider_name,phone,telefono,created_at&limit=1`),
          { headers: sbH() }
        );
        if (!r.ok) return res.status(r.status).json({ error: await r.text() });
        const rows = await r.json() as unknown[];

        if (Array.isArray(rows) && rows.length > 0) {
          // 2. Profile found — verify auth user still exists (catches deleted-user sessions)
          const authCheck = await fetch(
            `${supabaseUrl}/auth/v1/admin/users/${encodeURIComponent(user_id)}`,
            { headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` } }
          );
          if (!authCheck.ok) {
            // Auth user was deleted but profile remained — clean up orphan and kick out
            req.log.warn({ user_id }, 'Orphan profile detected — auth user deleted. Cleaning up.');
            await fetch(sbUrl(`profiles?id=eq.${encodeURIComponent(user_id)}`), {
              method: 'DELETE', headers: { ...sbH(), 'Content-Type': 'application/json' },
            }).catch(() => {});
            return res.status(404).json({ error: 'not found' });
          }
          return res.json(rows[0]);
        }

        // 3. Profile not found — check if auth user exists
        const authRes = await fetch(
          `${supabaseUrl}/auth/v1/admin/users/${encodeURIComponent(user_id)}`,
          { headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` } }
        );

        let userEmail: string | null = null;
        if (authRes.ok) {
          const authUser = await authRes.json() as { email?: string };
          userEmail = authUser.email ?? null;
        }

        if (!userEmail) {
          // User doesn't exist in auth — real 404
          return res.status(404).json({ error: 'not found' });
        }

        // 4. Auto-create minimal profile for this trabajadora
        const createRes = await fetch(sbUrl('profiles'), {
          method: 'POST',
          headers: {
            ...sbH(),
            'Content-Type': 'application/json',
            Prefer: 'return=representation',
          },
          body: JSON.stringify({
            id: user_id,
            email: userEmail,
            is_admin: false,
            is_agent: false,
            is_colider: false,
          }),
        });

        if (!createRes.ok) {
          const errText = await createRes.text();
          req.log.error({ errText }, 'profile auto-create failed');
          return res.status(createRes.status).json({ error: errText });
        }

        const created = await createRes.json() as unknown[];
        req.log.info({ user_id, userEmail }, 'Profile auto-created for new trabajadora');
        return res.json(Array.isArray(created) ? created[0] : created);

      } catch (e: unknown) {
        return res.status(500).json({ error: e instanceof Error ? e.message : 'error' });
      }
    });

    export default router;
