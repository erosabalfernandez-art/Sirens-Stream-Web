import { Router } from 'express';
import webPush from 'web-push';

const VAPID_PUBLIC  = process.env.VAPID_PUBLIC_KEY  ?? '';
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY ?? '';
const VAPID_SUBJECT = process.env.VAPID_SUBJECT     ?? 'mailto:eclipse_angels@outlook.com';
const SUPABASE_URL  = process.env.SUPABASE_URL      ?? '';
const SERVICE_KEY   = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';

if (VAPID_PUBLIC && VAPID_PRIVATE) {
  webPush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE);
}

const router = Router();

async function deleteSubscription(userId: string) {
  try {
    await fetch(
      `${SUPABASE_URL}/rest/v1/push_subscriptions?user_id=eq.${encodeURIComponent(userId)}`,
      { method: 'DELETE', headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` } }
    );
  } catch { /* ignore cleanup errors */ }
}

// POST /api/push/notify — send push to list of user IDs
router.post('/push/notify', async (req, res) => {
  if (!VAPID_PUBLIC || !VAPID_PRIVATE || !SUPABASE_URL || !SERVICE_KEY) {
    res.status(503).json({ error: 'Push not configured', debug: { vapid: !!VAPID_PUBLIC && !!VAPID_PRIVATE, supabase: !!SUPABASE_URL && !!SERVICE_KEY } });
    return;
  }
  const { userIds, title, body, url } = req.body as {
    userIds: string[];
    title: string;
    body: string;
    url: string;
  };
  if (!Array.isArray(userIds) || userIds.length === 0) {
    res.json({ sent: 0, debug: 'no userIds provided' });
    return;
  }

  // Fetch subscriptions from Supabase
  const subsRes = await fetch(
    `${SUPABASE_URL}/rest/v1/push_subscriptions?user_id=in.(${userIds.map(encodeURIComponent).join(',')})&select=user_id,subscription`,
    { headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` } }
  );
  const subsRaw = await subsRes.text();
  let subs: { user_id: string; subscription: PushSubscriptionJSON }[] = [];
  try { subs = JSON.parse(subsRaw); } catch { /* ignore */ }

  if (!Array.isArray(subs) || subs.length === 0) {
    res.json({ sent: 0, debug: `supabase returned: ${subsRaw.substring(0, 200)}` });
    return;
  }

  const payload = JSON.stringify({ title, body, url });
  let sent = 0;
  const errors: string[] = [];
  await Promise.allSettled(
    subs.map(async ({ user_id, subscription }) => {
      try {
        await webPush.sendNotification(subscription as Parameters<typeof webPush.sendNotification>[0], payload);
        sent++;
      } catch (err: any) {
        const status = err?.statusCode ?? 'unknown';
        const detail = err?.body ?? err?.message ?? String(err);
        errors.push(`user ${user_id.substring(0,8)}: HTTP ${status} — ${String(detail).substring(0, 200)}`);
        if (status === 410 || status === 404) {
          await deleteSubscription(user_id);
        }
      }
    })
  );

  res.json({ sent, errors });
});

export default router;
