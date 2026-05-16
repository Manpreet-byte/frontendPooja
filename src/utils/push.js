import { api } from '../api/client';

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i += 1) outputArray[i] = rawData.charCodeAt(i);
  return outputArray;
}

export async function ensurePushSubscribed({ token }) {
  const publicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
  if (!publicKey) return { ok: false, reason: 'missing_public_key' };
  if (typeof window === 'undefined') return { ok: false };
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return { ok: false, reason: 'unsupported' };
  // Push requires a secure context (HTTPS), except for localhost.
  const host = window.location.hostname;
  const isLocalhost = host === 'localhost' || host === '127.0.0.1' || host === '[::1]';
  if (!isLocalhost && window.location.protocol !== 'https:') return { ok: false, reason: 'insecure_context' };

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return { ok: false, reason: 'denied' };

  const reg = await navigator.serviceWorker.ready;
  const existing = await reg.pushManager.getSubscription();
  const sub =
    existing ??
    (await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    }));

  await api.user.pushSubscribe(token, sub.toJSON());
  return { ok: true };
}
