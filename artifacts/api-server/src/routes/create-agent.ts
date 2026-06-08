import { Router } from 'express';

  const router = Router();

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
  function sbAuthUrl(path: string) {
    return `${process.env.SUPABASE_URL}/auth/v1/${path}`;
  }

  // POST /api/create-agent
  // Creates an agent account using the Supabase service role (bypasses RLS)
  // Body: { email, password, agent_name }
  router.post('/create-agent', async (req, res) => {
    const { email, password, agent_name } = req.body as { email: string; password: string; agent_name: string };

    if (!email?.trim() || !password?.trim() || !agent_name?.trim()) {
      return res.status(400).json({ error: 'email, password y agent_name son requeridos.' });
    }

    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
    const supabaseUrl = process.env.SUPABASE_URL ?? '';

    try {
      // Step 1: Create auth user via Admin API (service role)
      const authRes = await fetch(`${supabaseUrl}/auth/v1/admin/users`, {
        method: 'POST',
        headers: {
          apikey: serviceKey,
          Authorization: `Bearer ${serviceKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email.trim(),
          password: password.trim(),
          email_confirm: true,
        }),
      });

      if (!authRes.ok) {
        const errText = await authRes.text();
        req.log.warn({ status: authRes.status, errText }, 'create-agent auth failed');
        return res.status(authRes.status).json({ error: errText });
      }

      const authData = await authRes.json() as { id: string; email: string };
      const userId = authData.id;

      // Step 2: Generate agent code
      const nameKey = agent_name.trim().toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8) || 'AGENT';
      const existingRes = await fetch(
        sbUrl(`profiles?select=agent_code&agent_code=not.is.null`),
        { headers: sbHeaders() as Record<string, string> }
      );
      const existingCodes = existingRes.ok ? await existingRes.json() as { agent_code: string }[] : [];
      const samePrefixCount = existingCodes.filter(p => p.agent_code?.startsWith(nameKey + '-')).length;
      const agentCode = `${nameKey}-${String(samePrefixCount + 1).padStart(3, '0')}`;

      // Step 3: Upsert profile with is_agent=true (service role bypasses RLS)
      const profileRes = await fetch(
        sbUrl('profiles?on_conflict=id'),
        {
          method: 'POST',
          headers: sbHeaders('resolution=merge-duplicates,return=representation') as Record<string, string>,
          body: JSON.stringify({
            id: userId,
            email: email.trim(),
            is_agent: true,
            is_admin: false,
            agent_name: agent_name.trim(),
            agent_code: agentCode,
          }),
        }
      );

      if (!profileRes.ok) {
        const errText = await profileRes.text();
        req.log.warn({ status: profileRes.status, errText }, 'create-agent profile upsert failed');
        return res.status(profileRes.status).json({ error: errText });
      }

      req.log.info({ userId, email, agentCode }, 'Agent created successfully');
      return res.json({ ok: true, agent_code: agentCode, user_id: userId });

    } catch (err) {
      req.log.error(err, 'create-agent unexpected error');
      return res.status(500).json({ error: 'Error interno del servidor.' });
    }
  });

  export default router;
  