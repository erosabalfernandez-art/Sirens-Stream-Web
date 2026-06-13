import { Router } from 'express';
  import { logger } from '../lib/logger';

  const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN ?? '';
  const BOT_USERNAME = 'Eclipse_Angels_Notify_bot';
  const TG_API = `https://api.telegram.org/bot${BOT_TOKEN}`;

  function sbUrl(path: string) { return `${process.env.SUPABASE_URL}/rest/v1/${path}`; }
  function sbH(prefer?: string): Record<string, string> {
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
    return {
      apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json',
      ...(prefer ? { Prefer: prefer } : {}),
    };
  }

  function genCode(): string {
    return 'EA-' + Math.random().toString(36).slice(2, 8).toUpperCase();
  }

  async function tgSend(chatId: string | number, text: string) {
    await fetch(`${TG_API}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text }),
    }).catch(() => {});
  }

  const router = Router();

  // POST /api/telegram/link/init — generates one-time link code for a user
  router.post('/telegram/link/init', async (req, res) => {
    const { userId } = req.body as { userId?: string };
    if (!userId) return res.status(400).json({ error: 'userId requerido' });
    if (!BOT_TOKEN || !process.env.SUPABASE_URL) return res.status(503).json({ error: 'No configurado' });

    const code = genCode();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

    // Delete old codes for this user
    await fetch(sbUrl(`telegram_link_codes?user_id=eq.${userId}`), {
      method: 'DELETE', headers: sbH(),
    }).catch(() => {});

    // Insert new code
    const r = await fetch(sbUrl('telegram_link_codes'), {
      method: 'POST',
      headers: sbH('return=minimal'),
      body: JSON.stringify({ code, user_id: userId, expires_at: expiresAt }),
    });

    if (!r.ok) {
      const errText = await r.text();
      logger.error({ errText }, '[telegram] Failed to create link code');
      return res.status(500).json({ error: 'Error al generar código' });
    }

    return res.json({ code, botUsername: BOT_USERNAME });
  });

  // GET /api/telegram/status/:userId — check if user has linked Telegram
  router.get('/telegram/status/:userId', async (req, res) => {
    const { userId } = req.params;
    if (!process.env.SUPABASE_URL) return res.json({ linked: false });

    const r = await fetch(
      sbUrl(`telegram_links?user_id=eq.${userId}&select=chat_id,username,first_name,linked_at`),
      { headers: sbH() }
    );
    if (!r.ok) return res.json({ linked: false });
    const rows = (await r.json()) as { chat_id: string; username?: string; first_name?: string; linked_at: string }[];
    if (!rows.length) return res.json({ linked: false });
    const { username, first_name, linked_at } = rows[0];
    return res.json({ linked: true, username, first_name, linked_at });
  });

  // DELETE /api/telegram/link/:userId — unlink Telegram account
  router.delete('/telegram/link/:userId', async (req, res) => {
    const { userId } = req.params;
    if (!process.env.SUPABASE_URL) return res.status(503).json({ error: 'No configurado' });
    await fetch(sbUrl(`telegram_links?user_id=eq.${userId}`), {
      method: 'DELETE', headers: sbH(),
    });
    return res.json({ ok: true });
  });

  // POST /api/telegram/webhook — receives all updates from Telegram
  router.post('/telegram/webhook', async (req, res) => {
    // Respond immediately so Telegram doesn't retry
    res.json({ ok: true });

    const update = req.body as any;
    const message = update.message || update.edited_message;
    if (!message) return;

    const chatId: number = message.chat.id;
    const text: string = (message.text ?? '').trim();
    const firstName: string = message.from?.first_name ?? 'Usuario';
    const username: string | null = message.from?.username ?? null;

    // Extract link code from "/start EA-XXXXXX" or bare "EA-XXXXXX"
    let code: string | null = null;
    if (text.startsWith('/start ')) {
      code = text.replace('/start ', '').trim().toUpperCase();
    } else if (/^EA-[A-Z0-9]{6}$/i.test(text)) {
      code = text.toUpperCase();
    }

    if (!code) {
      await tgSend(chatId,
        '👋 Hola! Para vincular tu cuenta de Eclipse Angels Agency, ve a tu perfil en la web y haz clic en "Conectar con Telegram".'
      );
      return;
    }

    if (!process.env.SUPABASE_URL) return;

    // Validate code (not used, not expired)
    const now = new Date().toISOString();
    const codeRes = await fetch(
      sbUrl(`telegram_link_codes?code=eq.${code}&used=eq.false&expires_at=gt.${encodeURIComponent(now)}&select=user_id`),
      { headers: sbH() }
    );
    if (!codeRes.ok) return;
    const codeRows = (await codeRes.json()) as { user_id: string }[];

    if (!codeRows.length) {
      await tgSend(chatId, '❌ El código es inválido o ya expiró. Ve a tu perfil en la web y genera un nuevo enlace.');
      return;
    }

    const userId = codeRows[0].user_id;

    // Upsert telegram_links
    const upsertRes = await fetch(sbUrl('telegram_links?on_conflict=user_id'), {
      method: 'POST',
      headers: sbH('resolution=merge-duplicates,return=minimal'),
      body: JSON.stringify({
        user_id: userId,
        chat_id: String(chatId),
        username,
        first_name: firstName,
        linked_at: new Date().toISOString(),
      }),
    });

    // Mark code as used
    await fetch(sbUrl(`telegram_link_codes?code=eq.${code}`), {
      method: 'PATCH',
      headers: sbH('return=minimal'),
      body: JSON.stringify({ used: true }),
    }).catch(() => {});

    if (upsertRes.ok) {
      await tgSend(chatId,
        `✅ ¡Cuenta vinculada correctamente, ${firstName}!\n\nAhora recibirás aquí en Telegram todas las notificaciones de Eclipse Angels Agency:\n• 💰 Salarios publicados\n• 📢 Comunicados y anuncios\n• ⚠️ Alertas importantes\n\nYa puedes cerrar esta ventana y seguir usando la web con normalidad.`
      );
      logger.info({ userId, chatId }, '[telegram] Account linked successfully');
    } else {
      await tgSend(chatId, '❌ Hubo un error al vincular tu cuenta. Intenta de nuevo desde tu perfil en la web.');
    }
  });

  export default router;
  