import { API_URL } from "../config";

type PushSubscriptionJson = {
  endpoint?: string;
  expirationTime?: number | null;
  keys?: {
    p256dh?: string;
    auth?: string;
  };
};

type LocalNotificationPayload = {
  title: string;
  body: string;
  url: string;
  tag: string;
};

const DELIVERY_READY_NOTIFICATION_KEY = "deliveryReadyNotificationExpiresAt";
const LOCAL_SUBSCRIPTION_DURATION_MS = 60 * 60 * 1000;

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, "+")
    .replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; i += 1) {
    outputArray[i] = rawData.charCodeAt(i);
  }

  return outputArray;
}

async function getVapidPublicKey() {
  const response = await fetch(
    `${API_URL}/api/notifications/vapid-public-key`,
    {
      credentials: "include",
    },
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || "Cle publique VAPID introuvable");
  }

  const data = await response.json();
  return data.publicKey as string;
}

async function getRegistration() {
  if (!("serviceWorker" in navigator)) {
    throw new Error("Les service workers ne sont pas supportes");
  }

  const registration = await navigator.serviceWorker.register(
    "/mobile-notifications-sw.js",
  );
  await registration.update().catch(() => undefined);

  return registration;
}

async function showLocalNotification(payload: LocalNotificationPayload) {
  if (!("Notification" in window)) {
    throw new Error("Les notifications ne sont pas supportees");
  }

  if (!window.isSecureContext) {
    throw new Error("Les notifications demandent HTTPS ou localhost");
  }

  const permission =
    Notification.permission === "granted"
      ? "granted"
      : await Notification.requestPermission();

  if (permission !== "granted") {
    throw new Error("Permission de notification refusee");
  }

  const options: NotificationOptions = {
    body: payload.body,
    icon: "/Images/logo-transparent.png",
    badge: "/Images/logo-transparent.png",
    tag: payload.tag,
    requireInteraction: false,
    data: {
      url: payload.url,
    },
  };

  try {
    if ("serviceWorker" in navigator) {
      await getRegistration();
      const readyRegistration = await navigator.serviceWorker.ready;
      await readyRegistration.showNotification(payload.title, options);
      return;
    }
  } catch (error) {
    console.warn("Notification via service worker impossible:", error);
  }

  const notification = new Notification(payload.title, options);
  notification.onclick = () => {
    window.focus();
    window.location.assign(payload.url);
    notification.close();
  };
}

export const mobileNotificationsService = {
  isSupported() {
    return (
      "Notification" in window &&
      "PushManager" in window &&
      "serviceWorker" in navigator
    );
  },

  async subscribe() {
    if (!this.isSupported()) {
      throw new Error("Les notifications push ne sont pas supportees");
    }

    const permission = await Notification.requestPermission();

    if (permission !== "granted") {
      throw new Error("Permission de notification refusee");
    }

    const [registration, publicKey] = await Promise.all([
      getRegistration(),
      getVapidPublicKey(),
    ]);

    const existingSubscription =
      await registration.pushManager.getSubscription();
    const subscription =
      existingSubscription ??
      (await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      }));

    const response = await fetch(`${API_URL}/api/notifications/subscribe`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        subscription: subscription.toJSON() as PushSubscriptionJson,
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.message || "Abonnement notification impossible");
    }

    return response.json();
  },

  async unsubscribe() {
    const registration = await getRegistration();
    const subscription = await registration.pushManager.getSubscription();

    if (!subscription) {
      return { removed: false };
    }

    const endpoint = subscription.endpoint;
    await subscription.unsubscribe();

    const response = await fetch(`${API_URL}/api/notifications/subscribe`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ endpoint }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.message || "Desabonnement notification impossible");
    }

    return response.json();
  },

  async sendTest() {
    const response = await fetch(`${API_URL}/api/notifications/test`, {
      method: "POST",
      credentials: "include",
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.message || "Notification de test impossible");
    }

    return response.json() as Promise<{ sent: number; failed: number }>;
  },

  async showLocalTest() {
    return showLocalNotification({
      title: "Notification mobile test",
      body: "Si tu vois ceci, les notifications fonctionnent sur cet appareil.",
      tag: "monpetituber-test",
      url: "/accueil",
    });
  },

  async enablePreparationNotifications() {
    await this.subscribe();

    await showLocalNotification({
      title: "Notifications préparation activees",
      body: "Tu recevras une notification quand une nouvelle commande arrive.",
      tag: "monpetituber-preparation-enabled",
      url: "/preparateur/preparation",
    }).catch((error) => {
      console.warn("Notification de confirmation impossible:", error);
    });

    return { serverPushEnabled: true };
  },

  async showNewOrderNotification(order: {
    id: number;
    type: "LIVRAISON" | "PICKUP";
    customerName?: string;
    itemsCount?: number;
  }) {
    const orderType =
      order.type === "LIVRAISON" ? "livraison" : "ramassage";
    const details = [
      order.customerName,
      typeof order.itemsCount === "number"
        ? `${order.itemsCount} article(s)`
        : null,
    ].filter(Boolean);

    return showLocalNotification({
      title: "Nouvelle commande",
      body: `Commande #${order.id} en ${orderType}${
        details.length > 0 ? ` - ${details.join(" - ")}` : ""
      }`,
      tag: `monpetituber-order-${order.id}`,
      url: "/preparateur",
    });
  },

  async enableDeliveryReadyNotifications() {
    await this.subscribe();
    const expiresAt = Date.now() + LOCAL_SUBSCRIPTION_DURATION_MS;
    localStorage.setItem(DELIVERY_READY_NOTIFICATION_KEY, String(expiresAt));

    await showLocalNotification({
      title: "Notifications livraison activees",
      body: "Tu recevras une notification quand une commande sera prête pour livraison.",
      tag: "monpetituber-delivery-ready-enabled",
      url: "/livraison",
    }).catch((error) => {
      console.warn("Notification de confirmation impossible:", error);
    });

    return { expiresAt, serverPushEnabled: true };
  },

  isDeliveryReadyNotificationEnabled() {
    const expiresAt = Number(
      localStorage.getItem(DELIVERY_READY_NOTIFICATION_KEY) ?? 0,
    );

    if (!expiresAt || expiresAt <= Date.now()) {
      localStorage.removeItem(DELIVERY_READY_NOTIFICATION_KEY);
      return false;
    }

    return true;
  },

  async showDeliveryReadyNotification(count: number) {
    return showLocalNotification({
      title: "Livraison disponible",
      body: `${count} commande${count > 1 ? "s" : ""} prête${
        count > 1 ? "s" : ""
      } pour livraison.`,
      tag: "monpetituber-delivery-ready",
      url: "/livraison",
    });
  },
};
