import { supabase } from '../services/supabase';

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY;

// Base64 → Uint8Array (VAPID kalit uchun)
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

// Va'dani timeout bilan o'raymiz — hech qachon cheksiz osilib qolmasin.
function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`${label} (timeout ${ms}ms)`)), ms)
    ),
  ]);
}

// Service worker faollashishini kutamiz (timeout bilan — osilib qolmasligi uchun).
async function waitForServiceWorker(ms = 10000): Promise<ServiceWorkerRegistration> {
  return withTimeout(
    navigator.serviceWorker.ready,
    ms,
    'Service worker tayyor bo\'lmadi'
  );
}

// Push notification qo'llab-quvvatlanadimi
export function isPushSupported(): boolean {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

// Hozirgi permission holati
export function getNotificationPermission(): NotificationPermission {
  if (!('Notification' in window)) return 'denied';
  return Notification.permission;
}

// Shu qurilma allaqachon obuna bo'lganmi (permission + faol subscription)
export async function isCurrentlySubscribed(): Promise<boolean> {
  if (!isPushSupported() || Notification.permission !== 'granted') return false;
  try {
    const registration = await waitForServiceWorker();
    const subscription = await registration.pushManager.getSubscription();
    return !!subscription;
  } catch (err) {
    console.error('isCurrentlySubscribed xatosi:', err);
    return false;
  }
}

// Foydalanuvchini push ga obuna qilish
export async function subscribeUserToPush(userId: string): Promise<boolean> {
  try {
    if (!isPushSupported()) {
      console.warn('Push notifications qo\'llab-quvvatlanmaydi');
      return false;
    }

    if (!VAPID_PUBLIC_KEY) {
      console.error('VITE_VAPID_PUBLIC_KEY sozlanmagan');
      return false;
    }

    // Permission so'rash
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      console.warn('Notification permission rad etildi');
      return false;
    }

    // Service worker faollashuvini kutamiz (timeout bilan — osilmasin)
    const registration = await waitForServiceWorker();

    // Mavjud subscription bormi tekshirish
    let subscription = await registration.pushManager.getSubscription();

    if (!subscription) {
      // Yangi subscription yaratish (timeout bilan — push xizmati javob bermasa osilmasin)
      subscription = await withTimeout(
        registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as BufferSource,
        }),
        15000,
        'pushManager.subscribe javob bermadi'
      );
    }

    // DB'ga saqlash — jadval sxemasi: { user_id, subscription (jsonb) }.
    // endpoint — generated column (subscription->>'endpoint'), yozilmaydi.
    const { error } = await supabase
      .from('push_subscriptions')
      .upsert({
        user_id: userId,
        subscription: subscription.toJSON(),
      }, { onConflict: 'user_id,endpoint' });

    if (error) {
      console.error('Subscription saqlanmadi:', error);
      return false;
    }

    return true;
  } catch (err) {
    console.error('Push subscribe xatosi:', err);
    return false;
  }
}

// Obunani bekor qilish
export async function unsubscribeFromPush(): Promise<void> {
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    
    if (subscription) {
      await supabase
        .from('push_subscriptions')
        .delete()
        .eq('endpoint', subscription.endpoint);
      
      await subscription.unsubscribe();
    }
  } catch (err) {
    console.error('Unsubscribe xatosi:', err);
  }
}

// Edge Function chaqirish (sotuv/qaytarish/to'lov bo'lganda)
export async function sendNotification(title: string, body: string, data?: any): Promise<void> {
  try {
    await supabase.functions.invoke('send-push-notification', {
      body: { title, body, data }
    });
  } catch (err) {
    console.error('Notification yuborishda xato:', err);
    // Sotuvga ta'sir qilmasin — silent fail
  }
}