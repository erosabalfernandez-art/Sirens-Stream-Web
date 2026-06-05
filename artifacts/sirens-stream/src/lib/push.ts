import { supabase } from '@/lib/supabase'

  export const VAPID_PUBLIC_KEY = 'BJVSReXGLMUliG8Gue6XOpiQ4ucAZ4PS9eICjnoGhA9nJGJTdVJqZ2MAyBUmkfKsuAKUWA0Qa4EtpkhBBOgkH5E';

  function urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const output = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) output[i] = rawData.charCodeAt(i);
    return output;
  }

  export async function subscribeToPush(userId: string): Promise<boolean> {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return false;
    try {
      await navigator.serviceWorker.register('/sw.js');
      const reg = await navigator.serviceWorker.ready;
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

  export async function sendPushViaApi(userIds: string[], title: string, body: string, url: string) {
    try {
      const base = import.meta.env.BASE_URL ?? '/';
      await fetch(`${base}api/push/notify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userIds, title, body, url }),
      });
    } catch { /* push is optional, ignore errors */ }
  }
  