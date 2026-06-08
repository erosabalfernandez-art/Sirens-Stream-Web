import webPush, { PushSubscriptionJSON } from 'web-push';

  const VAPID_PUBLIC  = process.env.VAPID_PUBLIC_KEY  ?? '';
  const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY ?? '';
  const VAPID_SUBJECT = process.env.VAPID_SUBJECT     ?? 'mailto:eclipse_angels@outlook.com';

  let vapidReady = false;
  export function ensureVapid() {
    if (!vapidReady && VAPID_PUBLIC && VAPID_PRIVATE) {
      webPush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE);
      vapidReady = true;
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

  export async function deleteSubscription(userId: string) {
    try {
      await fetch(
        sbUrl(`push_subscriptions?user_id=eq.${encodeURIComponent(userId)}`),
        { method: 'DELETE', headers: sbHeaders() }
      );
    } catch { /* ignore */ }
  }

  /** Send the same message to many users. Returns how many were delivered. */
  export async function dispatchPush(
    userIds: string[],
    title: string,
    body: string,
    url: string
  ): Promise<number> {
    if (!ensureVapid() || !process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) return 0;
    if (userIds.length === 0) return 0;

    const subsRes = await fetch(
      sbUrl(`push_subscriptions?user_id=in.(${userIds.map(encodeURIComponent).join(',')})&select=user_id,subscription`),
      { headers: sbHeaders() }
    );
    const subs = (await subsRes.json()) as { user_id: string; subscription: PushSubscriptionJSON }[];
    if (!Array.isArray(subs) || subs.length === 0) return 0;

    const payload = JSON.stringify({ title, body, url });
    let sent = 0;
    await Promise.allSettled(
      subs.map(async ({ user_id, subscription }) => {
        try {
          await webPush.sendNotification(subscription as Parameters<typeof webPush.sendNotification>[0], payload);
          sent++;
        } catch (err: unknown) {
          const e = err as { statusCode?: number };
          if (e?.statusCode === 410 || e?.statusCode === 404) await deleteSubscription(user_id);
        }
      })
    );
    return sent;
  }

  /** Send personalized messages — one per (userId, title, body) tuple. */
  export async function dispatchPushIndividual(
    items: { userId: string; title: string; body: string; url: string }[]
  ): Promise<number> {
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
        try {
          await webPush.sendNotification(sub as Parameters<typeof webPush.sendNotification>[0], payload);
          sent++;
        } catch (err: unknown) {
          const e = err as { statusCode?: number };
          if (e?.statusCode === 410 || e?.statusCode === 404) await deleteSubscription(item.userId);
        }
      })
    );
    return sent;
  }
  