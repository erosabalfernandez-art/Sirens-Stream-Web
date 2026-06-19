import { Router } from 'express';
  import { logger } from '../lib/logger';

  const BOT_TOKEN    = process.env.TELEGRAM_BOT_TOKEN ?? '';
  const BOT_USERNAME = 'Eclipse_Angels_Notify_bot';
  const TG_API       = `https://api.telegram.org/bot${BOT_TOKEN}`;

  function sbUrl(p: string) { return `${process.env.SUPABASE_URL}/rest/v1/${p}`; }
  function sbH(prefer?: string): Record<string, string> {
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
    return {
      apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json',
      ...(prefer ? { Prefer: prefer } : {}),
    };
  }
  function genCode() { return 'EA-' + Math.random().toString(36).slice(2, 8).toUpperCase(); }
  async function tgSend(chatId: string | number, text: string) {
    await fetch(`${TG_API}/sendMessage`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text }),
    }).catch(() => {});
  }

  const router = Router();

  // POST /api/telegram/link/init
  router.post('/telegram/link/init', async (req, res) => {
    const { userId } = req.body as { userId?: string };
    if (!userId) return res.status(400).json({ error: 'userId requerido' });
    if (!BOT_TOKEN || !process.env.SUPABASE_URL) return res.status(503).json({ error: 'No configurado' });

    const code = genCode();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

    await fetch(sbUrl(`telegram_link_codes?user_id=eq.${userId}`), { method: 'DELETE', headers: sbH() }).catch(() => {});

    const r = await fetch(sbUrl('telegram_link_codes'), {
      method: 'POST', headers: sbH('return=minimal'),
      body: JSON.stringify({ code, user_id: userId, expires_at: expiresAt }),
    });
    if (!r.ok) return res.status(500).json({ error: 'Error al generar código' });

    return res.json({ code, botUsername: BOT_USERNAME });
  });

  // GET /api/telegram/status/:userId
  router.get('/telegram/status/:userId', async (req, res) => {
    const { userId } = req.params;
    if (!process.env.SUPABASE_URL) return res.json({ linked: false });
    const r = await fetch(
      sbUrl(`telegram_links?user_id=eq.${userId}&select=chat_id,username,first_name,linked_at`),
      { headers: sbH() }
    );
    if (!r.ok) return res.json({ linked: false });
    const rows = (await r.json()) as { username?: string; first_name?: string; linked_at: string }[];
    if (!rows.length) return res.json({ linked: false });
    return res.json({ linked: true, ...rows[0] });
  });

  // DELETE /api/telegram/link/:userId
  router.delete('/telegram/link/:userId', async (req, res) => {
    const { userId } = req.params;
    if (!process.env.SUPABASE_URL) return res.status(503).json({ error: 'No configurado' });
    await fetch(sbUrl(`telegram_links?user_id=eq.${userId}`), { method: 'DELETE', headers: sbH() });
    return res.json({ ok: true });
  });

  // POST /api/telegram/webhook
  router.post('/telegram/webhook', async (req, res) => {
    res.json({ ok: true }); // responder de inmediato a Telegram

    const update = req.body as any;
    const message = update.message || update.edited_message;
    if (!message) return;

    const chatId: number = message.chat.id;
    const text: string   = (message.text ?? '').trim();
    const firstName      = message.from?.first_name ?? 'Usuario';
    const username       = message.from?.username ?? null;

    let code: string | null = null;
    if (text.startsWith('/start ')) code = text.replace('/start ', '').trim().toUpperCase();
    else if (/^EA-[A-Z0-9]{6}$/i.test(text)) code = text.toUpperCase();

    if (!code) {
      await tgSend(chatId,
        '👋 Hola! Para vincular tu cuenta de Eclipse Angels Agency, ve a tu perfil en la web y haz clic en "Conectar con Telegram".'
      );
      return;
    }

    if (!process.env.SUPABASE_URL) return;

    const now = new Date().toISOString();
    const codeRes = await fetch(
      sbUrl(`telegram_link_codes?code=eq.${code}&used=eq.false&expires_at=gt.${encodeURIComponent(now)}&select=user_id`),
      { headers: sbH() }
    );
    if (!codeRes.ok) return;
    const codeRows = (await codeRes.json()) as { user_id: string }[];

    if (!codeRows.length) {
      await tgSend(chatId, '❌ El código es inválido o ya expiró. Ve a tu perfil y genera un nuevo enlace.');
      return;
    }

    const userId = codeRows[0].user_id;

    const upsertRes = await fetch(sbUrl('telegram_links?on_conflict=user_id'), {
      method: 'POST', headers: sbH('resolution=merge-duplicates,return=minimal'),
      body: JSON.stringify({ user_id: userId, chat_id: String(chatId), username, first_name: firstName, linked_at: new Date().toISOString() }),
    });

    await fetch(sbUrl(`telegram_link_codes?code=eq.${code}`), {
      method: 'PATCH', headers: sbH('return=minimal'), body: JSON.stringify({ used: true }),
    }).catch(() => {});

    if (upsertRes.ok) {
      logger.info({ userId, chatId }, '[telegram] account linked');
      await tgSend(chatId,
        `✅ ¡Cuenta vinculada correctamente, ${firstName}!

  Ahora recibirás aquí en Telegram todas las notificaciones de Eclipse Angels Agency:
  • 💰 Salarios publicados
  • 📢 Comunicados y anuncios
  • ⚠️ Alertas importantes

  Ya puedes cerrar esta ventana y seguir usando la web con normalidad.`
      );
    } else {
      await tgSend(chatId, '❌ Hubo un error al vincular tu cuenta. Intenta de nuevo desde tu perfil en la web.');
    }
  });


  // GET /api/telegram/admin/links  — lista todas las cuentas vinculadas (admin)
  router.get('/telegram/admin/links', async (_req, res) => {
    if (!process.env.SUPABASE_URL) return res.status(503).json({ error: 'No configurado' });
    const r = await fetch(
      sbUrl('telegram_links?select=user_id,chat_id,username,first_name,linked_at&order=linked_at.desc'),
      { headers: sbH() }
    );
    if (!r.ok) return res.status(500).json({ error: 'Error al obtener links' });
    const links = (await r.json()) as { user_id: string; chat_id: string; username: string | null; first_name: string | null; linked_at: string }[];

    if (!links.length) return res.json({ links: [] });

    const ids = links.map(l => l.user_id).join(',');
    const pr = await fetch(
      sbUrl(`profiles?id=in.(${ids})&select=id,email,display_name,is_admin,is_agent,is_colider`),
      { headers: sbH() }
    );
    const profiles = pr.ok ? (await pr.json()) as { id: string; email: string | null; display_name: string | null; is_admin: boolean; is_agent: boolean; is_colider: boolean }[] : [];
    const profileMap = new Map(profiles.map(p => [p.id, p]));

    return res.json({
      links: links.map(l => ({ ...l, profile: profileMap.get(l.user_id) ?? null }))
    });
  });

  export default router;
  