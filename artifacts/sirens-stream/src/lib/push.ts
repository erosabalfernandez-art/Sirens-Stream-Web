/** Web push removed — all functions are stubs. Telegram handles notifications. */

export const VAPID_PUBLIC_KEY = '';

export async function checkPushInDB(_userId: string): Promise<boolean> {
  return false;
}

export async function checkPushEndpointInDB(_userId: string): Promise<boolean> {
  return false;
}

export function wasManuallyUnsubscribed(_userId: string): boolean {
  return false;
}

export async function subscribeToPush(
  _userId: string
): Promise<'granted' | 'denied' | 'error'> {
  return 'error';
}

export async function unsubscribeFromPush(_userId: string): Promise<boolean> {
  return true;
}

export async function sendPushViaApi(
  _userIds: string[],
  _title: string,
  _body: string,
  _url: string,
  _fire = false
): Promise<{ sent: number; error?: string }> {
  return { sent: 0 };
}
