import { logger } from './logger';

    const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN ?? '';
    const TG_API    = `https://api.telegram.org/bot${BOT_TOKEN}`;

    function sbUrl(path: string) {
      return `${process.env.SUPABASE_URL}/rest/v1/${path}`;
    }
    function sbH(): Record<string, string> {
      const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
      return { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' };
    }

    /** Formats the Telegram notification message */
    function buildTelegramText(title: string, body?: string): string {
      return body ? `${title}\n\n${body}` : title;
    }


    export async function sendTelegramMessage(chatId: string | number, text: string): Promise<boolean> {
      if (!BOT_TOKEN) return false;
      try {
        const res = await fetch(`${TG_API}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chat_id: chatId, text }),
        });
        if (!res.ok) {
          const errBody = await res.text();
          logger.warn({ chatId, status: res.status, body: errBody }, '[telegram] sendMessage failed');
        }
        return res.ok;
      } catch (e) {
        logger.warn({ chatId, err: String(e) }, '[telegram] sendMessage error');
        return false;
      }
    }

    async function getChatIdsForUsers(userIds: string[]): Promise<Map<string, string>> {
      if (!userIds.length || !process.env.SUPABASE_URL) return new Map();
      try {
        const ids = userIds.map(id => `"${id}"`).join(',');
        const res = await fetch(
          sbUrl(`telegram_links?user_id=in.(${ids})&select=user_id,chat_id`),
          { headers: sbH() }
        );
        if (!res.ok) return new Map();
        const rows = (await res.json()) as { user_id: string; chat_id: string }[];
        return new Map(rows.map(r => [r.user_id, r.chat_id]));
      } catch { return new Map(); }
    }

    async function getAllChatIds(): Promise<string[]> {
      if (!process.env.SUPABASE_URL) return [];
      try {
        const res = await fetch(sbUrl('telegram_links?select=chat_id'), { headers: sbH() });
        if (!res.ok) return [];
        const rows = (await res.json()) as { chat_id: string }[];
        return rows.map(r => r.chat_id);
      } catch { return []; }
    }

    /** Send Telegram to specific users by user_id */
    export async function dispatchTelegram(userIds: string[], title: string, body: string): Promise<number> {
      if (!BOT_TOKEN || !userIds.length) return 0;
      const chatMap = await getChatIdsForUsers(userIds);
      if (!chatMap.size) return 0;
      const text = buildTelegramText(title, body);
      const results = await Promise.allSettled(
        [...chatMap.values()].map(chatId => sendTelegramMessage(chatId, text))
      );
      const sent = results.filter(r => r.status === 'fulfilled' && (r as PromiseFulfilledResult<boolean>).value).length;
      logger.info({ sent, total: chatMap.size }, '[telegram] dispatchTelegram done');
      return sent;
    }

    /** Send Telegram to ALL linked users */
    export async function dispatchTelegramAll(title: string, body: string): Promise<number> {
      if (!BOT_TOKEN) return 0;
      const chatIds = await getAllChatIds();
      if (!chatIds.length) return 0;
      const text = buildTelegramText(title, body);
      const results = await Promise.allSettled(chatIds.map(id => sendTelegramMessage(id, text)));
      const sent = results.filter(r => r.status === 'fulfilled' && (r as PromiseFulfilledResult<boolean>).value).length;
      logger.info({ sent, total: chatIds.length }, '[telegram] dispatchTelegramAll done');
      return sent;
    }

    /** Send individual personalized Telegram messages */
    export async function dispatchTelegramIndividual(
      items: { userId: string; title: string; body: string }[]
    ): Promise<number> {
      if (!BOT_TOKEN || !items.length) return 0;
      const userIds = [...new Set(items.map(i => i.userId))];
      const chatMap = await getChatIdsForUsers(userIds);
      if (!chatMap.size) return 0;
      let sent = 0;
      await Promise.allSettled(
        items.map(async ({ userId, title, body }) => {
          const chatId = chatMap.get(userId);
          if (!chatId) return;
          const ok = await sendTelegramMessage(chatId, buildTelegramText(title, body));
          if (ok) sent++;
        })
      );
      logger.info({ sent, total: items.length }, '[telegram] dispatchTelegramIndividual done');
      return sent;
    }
  