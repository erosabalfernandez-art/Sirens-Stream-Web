import { supabase } from '@/lib/supabase'

export const VAPID_PUBLIC_KEY = 'BEhnTkLFnoYNJbNeYr8o99S-3btodcrcNVSqr5vRPsr7clamME7SNthwaUsve0ADxFT9kU5kujf2nBlcPR8_rVI';

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

export async function subscribeToPush(userId: string): Promise<boolean> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return false;
  try {
    await navigator.serviceWorker.register('/sw.js');
    const reg = await withTimeout(navigator.serviceWorker.ready, 8000);
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return false;
    const existing = await reg.pushManager.getSubscription();
    const subscription = existing ?? await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    });
    const subJson = subscription.toJSON();
    await supabase.from('push_subscriptions').upsert(
      { user_id: userId, subscription: subJson },
      { onConflict: 'user_id' }
    );
    return true;
  } catch (e) {
    console.error('Push registration failed:', e);
    return false;
  }
}

export async function sendPushViaApi(userIds: string[], title: string, body: string, url: string): Promise<{ sent: number; error?: string }> {
  try {
    const apiBase = ((import.meta.env.VITE_API_URL as string | undefined) ?? '').replace(/\/$/, '');
    const res = await fetch(`${apiBase}/api/push/notify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userIds, title, body, url }),
    });
    if (!res.ok) return { sent: 0, error: `HTTP ${res.status}` };
    const data = await res.json() as { sent: number };
    return { sent: data.sent ?? 0 };
  } catch (e) {
    return { sent: 0, error: String(e) };
  }
}

