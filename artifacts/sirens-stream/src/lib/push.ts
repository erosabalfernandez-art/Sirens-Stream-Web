import { supabase } from '@/lib/supabase';

export const VAPID_PUBLIC_KEY = 'BBdr3GZcSw_p6_54VakfGxtgou8XSB1mJBV0btx_aHxpXHI3FZsRaGPd6Fex1fvW7aplnZbCpFow0gdxskYk-S8';

/** Per-user unsub flag — so one account's "desactivar" no bloquea a otra cuenta en el mismo dispositivo */
function unsubKey(userId: string) { return `ea_push_unsubscribed_${userId}`; }

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const output = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) output[i] = rawData.charCodeAt(i);
  return output;
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`Timed out after ${ms}ms`)), ms)
    ),
  ]);
}

/** Returns true if the user has a subscription row in DB */
export async function checkPushInDB(userId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('push_subscriptions')
      .select('user_id')
      .eq('user_id', userId)
      .maybeSingle();
    if (error) return false;
    return !!data;
  } catch {
    return false;
  }
}

/**
 * Returns true only if the browser's current push subscription endpoint
 * matches the one stored in Supabase — the reliable way to detect staleness.
 */
export async function checkPushEndpointInDB(userId: string): Promise<boolean> {
  try {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return false;
    const reg = await withTimeout(navigator.serviceWorker.ready, 5000);
    const browserSub = await reg.pushManager.getSubscription();
    if (!browserSub) return false;

    const { data, error } = await supabase
      .from('push_subscriptions')
      .select('subscription')
      .eq('user_id', userId)
      .maybeSingle();
    if (error || !data) return false;

    const dbEndpoint = (data.subscription as any)?.endpoint;
    return dbEndpoint === browserSub.endpoint;
  } catch {
    return false;
  }
}

/** Per-user check — cada cuenta tiene su propio estado de "desactivado manualmente" */
export function wasManuallyUnsubscribed(userId: string): boolean {
  try { return !!localStorage.getItem(unsubKey(userId)); } catch { return false; }
}

/**
 * Subscribe to push notifications.
 *
 * Reusa la suscripción existente del navegador si la hay (evita el dead-token bug).
 * Solo crea una nueva si el navegador no tiene ninguna suscripción activa.
 */
export async function subscribeToPush(userId: string): Promise<'granted' | 'denied' | 'error'> {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) return 'error';
  try {
    try { localStorage.removeItem(unsubKey(userId)); } catch {}

    await navigator.serviceWorker.register("/sw.js");
    const reg = await withTimeout(navigator.serviceWorker.ready, 8000);
    const permission = await Notification.requestPermission();
    if (permission !== "granted") return 'denied';

    let subscription = await reg.pushManager.getSubscription();
    if (!subscription) {
      subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });
    }

    const subJson = subscription.toJSON();
    const apiBase = ((import.meta.env.VITE_API_URL as string | undefined) ?? "").replace(/\/$/, "");
    const saveRes = await withTimeout(
      fetch(`${apiBase}/api/push/subscribe`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, subscription: subJson }),
      }),
      20000
    );
    if (!saveRes.ok) {
      console.error("Failed to save push subscription:", await saveRes.text());
      return 'error';
    }
    // Store user_id in SW (needed for pushsubscriptionchange auto-renewal)
      // Register Background Sync so device wakes SW when internet returns.
      try {
        const swReg = await navigator.serviceWorker.ready;
        swReg.active?.postMessage({ type: 'STORE_USER_ID', userId });
        await (swReg as any).sync.register('ea-reconnect-check');
      } catch { /* Background Sync not supported on all browsers */ }

      return 'granted';
    } catch (e) {
    console.error("Push registration failed:", e);
    if (typeof Notification !== 'undefined' && Notification.permission === 'denied') return 'denied';
    return 'error';
  }
}

export async function unsubscribeFromPush(userId: string): Promise<boolean> {
  try {
    try { localStorage.setItem(unsubKey(userId), '1'); } catch {}

    if ('serviceWorker' in navigator && 'PushManager' in window) {
      try {
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.getSubscription();
        if (sub) await sub.unsubscribe();
      } catch { /* ignore */ }
    }

    await supabase.from('push_subscriptions').delete().eq('user_id', userId);
    return true;
  } catch {
    return false;
  }
}

export async function sendPushViaApi(
  userIds: string[],
  title: string,
  body: string,
  url: string,
  fire = false
): Promise<{ sent: number; error?: string }> {
  try {
    const apiBase = ((import.meta.env.VITE_API_URL as string | undefined) ?? "").replace(/\/$/, "");
    const timeout = fire ? 5000 : 12000;
    const res = await withTimeout(
      fetch(`${apiBase}/api/push/notify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userIds, title, body, url, fire }),
      }),
      timeout
    );
    if (!res.ok) return { sent: 0, error: `HTTP ${res.status}` };
    const data = (await res.json()) as { sent?: number; queued?: number };
    return { sent: data.sent ?? data.queued ?? 0 };
  } catch (e) {
    return { sent: 0, error: String(e) };
  }
}
