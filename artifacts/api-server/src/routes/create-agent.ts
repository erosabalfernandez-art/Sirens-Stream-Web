import { Router } from 'express';

    const router = Router();

    const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

    function generateAgentCode(): string {
      let code = 'EA-';
      for (let i = 0; i < 8; i++) code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
      return code;
    }

    function sbHeaders(prefer?: string) {
      const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
      return {
        apikey: key,
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
        Prefer: prefer ?? 'return=representation',
      };
    }
    function sbUrl(path: string) {
      return `${process.env.SUPABASE_URL}/rest/v1/${path}`;
    }

    // POST /api/create-agent
    router.post('/create-agent', async (req, res) => {
      const { email, password, agent_name, phone } = req.body as { email: string; password: string; agent_name: string; phone?: string };

      if (!email?.trim() || !password?.trim() || !agent_name?.trim()) {
        return res.status(400).json({ error: 'email, password y agent_name son requeridos.' });
      }

      const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
      const supabaseUrl = process.env.SUPABASE_URL ?? '';

      try {
        const authRes = await fetch(`${supabaseUrl}/auth/v1/admin/users`, {
          method: 'POST',
          headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: email.trim(), password: password.trim(), email_confirm: true }),
        });

        if (!authRes.ok) {
          const errText = await authRes.text();
          req.log.warn({ status: authRes.status, errText }, 'create-agent auth failed');
          return res.status(authRes.status).json({ error: errText });
        }

        const authData = await authRes.json() as { id: string; email: string };
        const userId = authData.id;

        // Generate unique encrypted code
        let agentCode = generateAgentCode();
        for (let i = 0; i < 10; i++) {
          const checkRes = await fetch(sbUrl(`profiles?agent_code=eq.${agentCode}&select=id&limit=1`), { headers: sbHeaders() as Record<string, string> });
          const existing = checkRes.ok ? await checkRes.json() as unknown[] : [];
          if (existing.length === 0) break;
          agentCode = generateAgentCode();
        }

        const profilePayload: Record<string, unknown> = {
          id: userId,
          email: email.trim(),
          is_agent: true,
          is_admin: false,
          agent_name: agent_name.trim(),
          agent_code: agentCode,
        };
        if (phone?.trim()) profilePayload.phone = phone.trim();

        const profileRes = await fetch(sbUrl('profiles?on_conflict=id'), {
          method: 'POST',
          headers: sbHeaders('resolution=merge-duplicates,return=representation') as Record<string, string>,
          body: JSON.stringify(profilePayload),
        });

        if (!profileRes.ok) {
          const errText = await profileRes.text();
          return res.status(profileRes.status).json({ error: errText });
        }

        req.log.info({ userId, email, agentCode }, 'Agent created');
          return res.json({ ok: true, agent_code: agentCode, user_id: userId });
      } catch (err) {
        req.log.error(err, 'create-agent error');
        return res.status(500).json({ error: 'Error interno del servidor.' });
      }
    });


      // POST /api/grant-agent-channels — grant all-app channel access to an existing agent
      router.post('/grant-agent-channels', async (req, res) => {
        const { user_id } = req.body as { user_id: string };
        if (!user_id) return res.status(400).json({ error: 'user_id requerido' });
        const APPS = ['Layla', 'Waha', 'Howdy'];
        const rows = APPS.map(app => ({
          user_id, app_name: app, status: 'approved',
        }));
        try {
          const r = await fetch(sbUrl('channel_requests?on_conflict=user_id,app_name'), {
            method: 'POST',
            headers: sbHeaders('resolution=merge-duplicates,return=minimal') as Record<string, string>,
            body: JSON.stringify(rows),
          });
          if (!r.ok) { const e = await r.text(); return res.status(r.status).json({ error: e }); }
          return res.json({ ok: true, granted: APPS });
        } catch (e: unknown) {
          return res.status(500).json({ error: e instanceof Error ? e.message : 'unknown' });
        }
      });

      export default router;
    