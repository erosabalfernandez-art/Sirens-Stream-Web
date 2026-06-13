import webPush, { PushSubscriptionJSON } from 'web-push';
  import { dispatchTelegram, dispatchTelegramAll, dispatchTelegramIndividual } from './telegram-dispatch';

  const VAPID_PUBLIC  = process.env.VAPID_PUBLIC_KEY  ?? '';
  const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY ?? '';
  const VAPID_SUBJECT = process.env.VAPID_SUBJECT     ?? 'mailto:eclipse_angels@outlook.com';

  let vapidReady = false;
  export function ensureVapid() {
    if (!vapidReady && VAPID_PUBLIC && VAPID_PRIVATE) {
      try {
        webPush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE);
        vapidReady = true;
      } catch (e) {
        console.error('[push] ensureVapid failed:', e instanceof Error ? e.message : e);
      }
    }
    return vapidReady;
  }

  function sbUrl(path: string) {
    return `${process.env.SUPABASE_URL}/rest/v1/${path}`;
  }
  function sbHeaders() {
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
    return { apikey: key, Authorization: `Bearer ${key}` };
  }

  async function writeInApp(title: string, body: string): Promise<void> {
    try {
      const supaKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
      await fetch(
        (process.env.SUPABASE_URL ?? '') + '/rest/v1/channel_messages',
        {
          method: 'POST',
          headers: {
            apikey: supaKey, Authorization: 'Bearer ' + supaKey,
            'Content-Type': 'application/json', Prefer: 'return=minimal',
          },
          body: JSON.stringify({ app_name: 'sistema', content: title + ' — ' + body }),
        }
      );
    } catch { /* fire-and-forget */ }
  }

  export async function deleteSubscription(userId: string) {
    try {
      await fetch(
        sbUrl(`push_subscriptions?user_id=eq.${encodeURIComponent(userId)}`),
        { method: 'DELETE', headers: sbHeaders() }
      );
    } catch { /* ignore */ }
  }

  async function sendOne(
    user_id: string, subscription: PushSubscriptionJSON, payload: string
  ): Promise<'sent' | 'expired' | string> {
    try {
      await webPush.sendNotification(
        subscription as Parameters<typeof webPush.sendNotification>[0],
        payload, { TTL: 604800 }
      );
      return 'sent';
    } catch (err: unknown) {
      const e = err as { statusCode?: number; message?: string; body?: string };
      const code = e?.statusCode ?? 0;
      console.error(`[push] sendNotification failed user=${user_id} status=${code}`);
      if (code === 410 || code === 404) { await deleteSubscription(user_id); return 'expired'; }
      return `error:${code}`;
    }
  }

  export async function dispatchPush(
    userIds: string[], title: string, body: string, url: string
  ): Promise<number> {
    // Always try Telegram first (works in Cuba and everywhere)
    void dispatchTelegram(userIds, title, body).catch(() => {});

    if (!ensureVapid() || !process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) return 0;
    if (userIds.length === 0) return 0;

    const subsRes = await fetch(
      sbUrl(`push_subscriptions?user_id=in.(${userIds.map(encodeURIComponent).join(',')})&select=user_id,subscription`),
      { headers: sbHeaders() }
    );
    if (!subsRes.ok) return 0;
    const subs = (await subsRes.json()) as { user_id: string; subscription: PushSubscriptionJSON }[];
    if (!Array.isArray(subs) || subs.length === 0) return 0;

    void writeInApp(title, body);
    const payload = JSON.stringify({ title, body, url });
    const results = await Promise.allSettled(
      subs.map(({ user_id, subscription }) => sendOne(user_id, subscription, payload))
    );
    return results.filter(r => r.status === 'fulfilled' && (r as PromiseFulfilledResult<string>).value === 'sent').length;
  }

  export async function dispatchPushAll(
    title: string, body: string, url: string
  ): Promise<number> {
    // Always try Telegram (works in Cuba and everywhere)
    void dispatchTelegramAll(title, body).catch(() => {});

    if (!ensureVapid() || !process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) return 0;
    const subsRes = await fetch(
      sbUrl('push_subscriptions?select=user_id,subscription'), { headers: sbHeaders() }
    );
    if (!subsRes.ok) return 0;
    const subs = (await subsRes.json()) as { user_id: string; subscription: PushSubscriptionJSON }[];
    if (!Array.isArray(subs) || subs.length === 0) return 0;
    const payload = JSON.stringify({ title, body, url });
    const results = await Promise.allSettled(
      subs.map(({ user_id, subscription }) => sendOne(user_id, subscription, payload))
    );
    return results.filter(r => r.status === 'fulfilled' && (r as PromiseFulfilledResult<string>).value === 'sent').length;
  }

  export async function dispatchPushIndividual(
    items: { userId: string; title: string; body: string; url: string }[]
  ): Promise<number> {
    // Always try Telegram (works in Cuba and everywhere)
    void dispatchTelegramIndividual(items.map(i => ({ userId: i.userId, title: i.title, body: i.body }))).catch(() => {});

    if (!ensureVapid() || !process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) return 0;
    if (items.length === 0) return 0;

    const userIds = [...new Set(items.map(i => i.userId))];
    const subsRes = await fetch(
      sbUrl(`push_subscriptions?user_id=in.(${userIds.map(encodeURIComponent).join(',')})&select=user_id,subscription`),
      { headers: sbHeaders() }
    );
    const subs = (await subsRes.json()) as { user_id: string; subscription: PushSubscriptionJSON }[];
    if (!Array.isArray(subs) || subs.length === 0) return 0;

    const subMap = new Map(subs.map(s => [s.user_id, s.subscription]));
    let sent = 0;
    await Promise.allSettled(
      items.map(async (item) => {
        const sub = subMap.get(item.userId);
        if (!sub) return;
        const payload = JSON.stringify({ title: item.title, body: item.body, url: item.url });
        const result = await sendOne(item.userId, sub, payload);
        if (result === 'sent') sent++;
      })
    );
    return sent;
  }
  