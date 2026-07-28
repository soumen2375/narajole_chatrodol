// Push Notification utility
// Handles browser push notification subscription
// Uses Web Push API

/**
 * Request permission and subscribe to push notifications
 * Returns the subscription object or null if denied/failed
 */
export async function subscribeToPush(): Promise<PushSubscription | null> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    console.warn('Push notifications not supported in this browser');
    return null;
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      console.info('Push notification permission denied');
      return null;
    }

    const registration = await navigator.serviceWorker.ready;
    
    // Check for existing subscription
    const existing = await registration.pushManager.getSubscription();
    if (existing) return existing;

    // Subscribe (VAPID key needed for production - using placeholder)
    const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY || '';
    
    if (!VAPID_PUBLIC_KEY) {
      // Fallback: just request permission for in-app notifications
      console.info('Push subscription requires VAPID key configuration');
      return null;
    }

    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as unknown as BufferSource,
    });

    return subscription;
  } catch (err) {
    console.error('Push subscription failed:', err);
    return null;
  }
}

/**
 * Check current notification permission status
 */
export function getNotificationPermission(): NotificationPermission | 'unsupported' {
  if (!('Notification' in window)) return 'unsupported';
  return Notification.permission;
}

/**
 * Show a local browser notification (no service worker needed)
 */
export async function showLocalNotification(title: string, options?: NotificationOptions): Promise<void> {
  if (!('Notification' in window)) return;
  if (Notification.permission !== 'granted') {
    const perm = await Notification.requestPermission();
    if (perm !== 'granted') return;
  }
  new Notification(title, options);
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  return new Uint8Array([...rawData].map((char) => char.charCodeAt(0)));
}
