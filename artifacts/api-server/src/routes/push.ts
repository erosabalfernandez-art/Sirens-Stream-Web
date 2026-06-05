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
    res.status(503).json({ error: 'Push not configured' });
    return;
  }
  const { userIds, title, body, url } = req.body as {
    userIds: string[];
    title: string;
    body: string;
    url: string;
  };
  if (!Array.isArray(userIds) || userIds.length === 0) {
    res.json({ sent: 0 });
    return;
  }

  // Fetch subscriptions from Supabase
  const subsRes = await fetch(
    `${SUPABASE_URL}/rest/v1/push_subscriptions?user_id=in.(${userIds.map(encodeURIComponent).join(',')})&select=user_id,subscription`,
    { headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` } }
  );
  const subs = (await subsRes.json()) as { user_id: string; subscription: PushSubscriptionJSON }[];
  if (!Array.isArray(subs) || subs.length === 0) {
    res.json({ sent: 0 });
    return;
  }

  const payload = JSON.stringify({ title, body, url });
  let sent = 0;
  await Promise.allSettled(
    subs.map(async ({ user_id, subscription }) => {
      try {
        await webPush.sendNotification(subscription as Parameters<typeof webPush.sendNotification>[0], payload);
        sent++;
      } catch (err: any) {
        // 410 Gone or 404 = subscription expired/invalid — delete it from DB
        if (err?.statusCode === 410 || err?.statusCode === 404) {
          await deleteSubscription(user_id);
        }
      }
    })
  );

  res.json({ sent });
});

export default router;

