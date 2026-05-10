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

// Push notification qo'llab-quvvatlanadimi
export function isPushSupported(): boolean {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

// Hozirgi permission holati
export function getNotificationPermission(): NotificationPermission {
  if (!('Notification' in window)) return 'denied';
  return Notification.permission;
}

// Foydalanuvchini push ga obuna qilish
export async function subscribeUserToPush(userId: string): Promise<boolean> {
  try {
    if (!isPushSupported()) {
      console.warn('Push notifications qo\'llab-quvvatlanmaydi');
      return false;
    }

    // Permission so'rash
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      console.warn('Notification permission rad etildi');
      return false;
    }

    // Service worker registration
    const registration = await navigator.serviceWorker.ready;

    // Mavjud subscription bormi tekshirish
    let subscription = await registration.pushManager.getSubscription();

    if (!subscription) {
      // Yangi subscription yaratish
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as BufferSource,
      });
    }

    // DB'ga saqlash
    const subJson = subscription.toJSON();
    const { error } = await supabase
      .from('push_subscriptions')
      .upsert({
        user_id: userId,
        endpoint: subscription.endpoint,
        p256dh: subJson.keys?.p256dh || '',
        auth: subJson.keys?.auth || '',
        user_agent: navigator.userAgent,
      }, { onConflict: 'endpoint' });

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