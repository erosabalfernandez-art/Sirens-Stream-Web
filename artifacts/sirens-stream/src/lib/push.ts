import { supabase } from '@/lib/supabase';

export const VAPID_PUBLIC_KEY = 'BBdr3GZcSw_p6_54VakfGxtgou8XSB1mJBV0btx_aHxpXHI3FZsRaGPd6Fex1fvW7aplnZbCpFow0gdxskYk-S8';

const UNSUB_KEY = 'ea_push_unsubscribed';

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

/** Returns true if the user was found in push_subscriptions table */
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

/** Returns true if the user manually unsubscribed (localStorage flag) */
export function wasManuallyUnsubscribed(): boolean {
  try { return !!localStorage.getItem(UNSUB_KEY); } catch { return false; }
}

/** Subscribe to push notifications. Clears the manual-unsubscribe flag. */
export async function subscribeToPush(userId: string): Promise<'granted' | 'denied' | 'error'> {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) return 'error';
  try {
    // Clear unsubscribe flag — user is actively subscribing
    try { localStorage.removeItem(UNSUB_KEY); } catch {}

    await navigator.serviceWorker.register("/sw.js");
    const reg = await withTimeout(navigator.serviceWorker.ready, 8000);
    const permission = await Notification.requestPermission();
    if (permission !== "granted") return 'denied';

    const existing = await reg.pushManager.getSubscription();
    if (existing) await existing.unsubscribe();

    const subscription = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    });
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
    return 'granted';
  } catch (e) {
    console.error("Push registration failed:", e);
    if (typeof Notification !== 'undefined' && Notification.permission === 'denied') return 'denied';
    return 'error';
  }
}

/** Unsubscribe from push notifications. Sets the manual-unsubscribe flag so
 *  auto-refresh on login does not re-register this device. */
export async function unsubscribeFromPush(userId: string): Promise<boolean> {
  try {
    // Mark as manually unsubscribed to prevent auto-refresh on login
    try { localStorage.setItem(UNSUB_KEY, '1'); } catch {}

    // Unsubscribe browser push manager
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      try {
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.getSubscription();
        if (sub) await sub.unsubscribe();
      } catch { /* ignore browser-level errors */ }
    }

    // Delete from Supabase (RLS allows users to delete their own row)
    await supabase.from('push_subscriptions').delete().eq('user_id', userId);
    return true;
  } catch {
    return false;
  }
}

// fire=true → la API responde 202 inmediatamente y envía en background
// fire=false (default) → espera todos los envíos y devuelve { sent: N }
export async function sendPushViaApi(
  userIds: string[],
  title: string,
  body: string,
  url: string,
  fire = false
): Promise<{ sent: number; error?: string }> {
  try {
    const apiBase = (
      (import.meta.env.VITE_API_URL as string | undefined) ?? ""
    ).replace(/\/$/, "");
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
