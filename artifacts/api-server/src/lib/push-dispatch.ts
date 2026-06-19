import { dispatchTelegram, dispatchTelegramAll, dispatchTelegramIndividual } from './telegram-dispatch';

/** Web push removed — Telegram is the only notification channel now. */

export function ensureVapid(): boolean {
  return true;
}

export async function deleteSubscription(_userId: string): Promise<void> {
  // no-op: web push subscriptions no longer used
}

export async function dispatchPush(
  userIds: string[], title: string, body: string, _url: string
): Promise<number> {
  return dispatchTelegram(userIds, title, body).catch(() => 0);
}

export async function dispatchPushAll(
  title: string, body: string, _url: string
): Promise<number> {
  return dispatchTelegramAll(title, body).catch(() => 0);
}

export async function dispatchPushIndividual(
  items: { userId: string; title: string; body: string; url: string }[]
): Promise<number> {
  return dispatchTelegramIndividual(
    items.map(i => ({ userId: i.userId, title: i.title, body: i.body }))
  ).catch(() => 0);
}
