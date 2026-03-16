import { supabase } from "@/integrations/supabase/client";

type PushPayload = {
  title: string;
  body: string;
  url?: string;
  userIds?: string[];
};

const MAX_TITLE = 50;
const MAX_BODY = 120;

function toUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i);
  return outputArray;
}

function supportsWebPush() {
  return typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
}

async function getFunctionHeaders() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) return null;

  return {
    Authorization: `Bearer ${session.access_token}`,
  };
}

async function getServiceWorkerRegistration() {
  if (!("serviceWorker" in navigator)) return null;

  const existing = await navigator.serviceWorker.getRegistration();
  if (existing) return existing;

  const registration = await navigator.serviceWorker.register("/sw.js");
  await navigator.serviceWorker.ready;
  return registration;
}

export async function enablePushNotifications(userId: string) {
  try {
    if (!supportsWebPush()) return false;

    const headers = await getFunctionHeaders();
    if (!headers) return false;

    let permission = Notification.permission;
    if (permission !== "granted") {
      permission = await Notification.requestPermission();
    }
    if (permission !== "granted") return false;

    const registration = await getServiceWorkerRegistration();
    if (!registration) return false;

    const config = await supabase.functions.invoke("push-config", { body: {}, headers });
    if (config.error || !config.data?.publicKey) return false;

    let subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: toUint8Array(config.data.publicKey),
      });
    }

    const payload = {
      action: "subscribe",
      userId,
      subscription: subscription.toJSON(),
      userAgent: navigator.userAgent,
      platform: navigator.platform,
    };

    const { error } = await supabase.functions.invoke("push-subscribe", { body: payload, headers });
    return !error;
  } catch (error) {
    console.error("Erro ao ativar notificações push:", error);
    return false;
  }
}

export async function disablePushNotifications(userId: string) {
  try {
    if (!supportsWebPush()) return;

    const headers = await getFunctionHeaders();
    if (!headers) return;

    const registration = await getServiceWorkerRegistration();
    const subscription = await registration?.pushManager.getSubscription();
    const endpoint = subscription?.endpoint;

    if (subscription) await subscription.unsubscribe();

    await supabase.functions.invoke("push-subscribe", {
      body: { action: "unsubscribe", userId, endpoint },
      headers,
    });
  } catch (error) {
    console.error("Erro ao desativar notificações push:", error);
  }
}

export async function syncPushSubscriptionIfNeeded(userId: string) {
  if (!supportsWebPush() || Notification.permission !== "granted") return false;
  return enablePushNotifications(userId);
}

export async function sendPushNotification(payload: PushPayload) {
  try {
    const headers = await getFunctionHeaders();
    if (!headers) return false;

    const title = payload.title.trim().slice(0, MAX_TITLE);
    const body = payload.body.trim().slice(0, MAX_BODY);
    if (!title || !body) return false;

    const { error } = await supabase.functions.invoke("push-send", {
      body: {
        title,
        body,
        url: payload.url ?? "/",
        userIds: payload.userIds,
      },
      headers,
    });

    return !error;
  } catch (error) {
    console.error("Erro ao enviar notificação push:", error);
    return false;
  }
}