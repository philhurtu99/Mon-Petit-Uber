import { getRequiredEnv } from "../utils/env";
import { prisma } from "../lib/prisma";

export type WebPushSubscription = {
  endpoint: string;
  expirationTime?: number | null;
  keys: {
    p256dh: string;
    auth: string;
  };
};

type MobileNotificationPayload = {
  title: string;
  body: string;
  url?: string;
};

const subscriptionsByUser = new Map<string, WebPushSubscription[]>();
const deliveryReadySubscribers = new Map<string, number>();
let isSendingDeliveryReadyNotifications = false;
let lastDeliveryReadyCount = 0;
const DELIVERY_READY_SUBSCRIPTION_DURATION_MS = 60 * 60 * 1000;

/**
 * Charge web-push seulement au moment de l'utiliser.
 * Cela évite de bloquer le démarrage du serveur si la configuration VAPID
 * n'est pas encore présente dans l'environnement.
 */
function getWebPush() {
  return require("web-push") as typeof import("web-push");
}

/**
 * Lit et valide la configuration VAPID nécessaire aux notifications Web Push.
 * La cle publique est transmise au navigateur, tandis que la cle privee reste
 * cote serveur pour signer les envois.
 */
function getVapidConfig() {
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject =
    process.env.VAPID_SUBJECT ||
    `mailto:${getRequiredEnv("NOTIFICATION_EMAIL")}`;

  if (!publicKey || !privateKey) {
    throw new Error(
      "VAPID_PUBLIC_KEY et VAPID_PRIVATE_KEY doivent être configurées",
    );
  }

  return { publicKey, privateKey, subject };
}

/**
 * Configure web-push avec les identifiants VAPID avant chaque envoi.
 * La configuration est relue depuis l'environnement pour garder ce service
 * independant d'un etat global initialise au demarrage.
 */
function configureWebPush() {
  const { publicKey, privateKey, subject } = getVapidConfig();
  const webPush = getWebPush();
  webPush.setVapidDetails(subject, publicKey, privateKey);

  return webPush;
}

/**
 * Compare deux abonnements par endpoint, l'identifiant unique fourni par le
 * navigateur pour une souscription Web Push.
 */
function isSameEndpoint(
  stored: WebPushSubscription,
  subscription: WebPushSubscription,
) {
  return stored.endpoint === subscription.endpoint;
}

/**
 * Retourne la cle publique VAPID que le frontend utilise pour creer une
 * souscription push depuis le service worker du navigateur.
 */
export function getMobileNotificationsPublicKey() {
  return getVapidConfig().publicKey;
}

/**
 * Enregistre une souscription Web Push pour un utilisateur.
 * Les doublons sont ignores afin qu'un meme navigateur ne recoive pas plusieurs
 * fois la meme notification.
 */
export function saveMobileNotificationSubscription(
  userId: string,
  subscription: WebPushSubscription,
) {
  const userSubscriptions = subscriptionsByUser.get(userId) ?? [];
  const alreadySubscribed = userSubscriptions.some((stored) =>
    isSameEndpoint(stored, subscription),
  );

  if (!alreadySubscribed) {
    userSubscriptions.push(subscription);
  }

  subscriptionsByUser.set(userId, userSubscriptions);

  return {
    alreadySubscribed,
    totalSubscriptions: userSubscriptions.length,
  };
}

/**
 * Supprime une souscription precise pour un utilisateur, generalement quand le
 * navigateur se desabonne ou quand l'endpoint n'est plus valide.
 */
export function deleteMobileNotificationSubscription(
  userId: string,
  endpoint: string,
) {
  const userSubscriptions = subscriptionsByUser.get(userId) ?? [];
  const nextSubscriptions = userSubscriptions.filter(
    (subscription) => subscription.endpoint !== endpoint,
  );

  if (nextSubscriptions.length === 0) {
    subscriptionsByUser.delete(userId);
  } else {
    subscriptionsByUser.set(userId, nextSubscriptions);
  }

  return {
    removed: userSubscriptions.length !== nextSubscriptions.length,
    totalSubscriptions: nextSubscriptions.length,
  };
}

/**
 * Envoie une notification Web Push a toutes les souscriptions connues d'un
 * utilisateur et retire les endpoints expires ou introuvables.
 */
export async function sendMobileNotificationToUser(
  userId: string,
  payload: MobileNotificationPayload,
) {
  const userSubscriptions = subscriptionsByUser.get(userId) ?? [];

  if (userSubscriptions.length === 0) {
    return { sent: 0, failed: 0 };
  }

  const webPush = configureWebPush();
  let sent = 0;
  let failed = 0;
  const subscriptionsToDelete: string[] = [];

  await Promise.all(
    userSubscriptions.map(async (subscription) => {
      try {
        await webPush.sendNotification(subscription, JSON.stringify(payload));
        sent += 1;
      } catch (error: any) {
        failed += 1;

        if (error?.statusCode === 404 || error?.statusCode === 410) {
          subscriptionsToDelete.push(subscription.endpoint);
        } else {
          console.error("Erreur notification mobile:", error);
        }
      }
    }),
  );

  for (const endpoint of subscriptionsToDelete) {
    deleteMobileNotificationSubscription(userId, endpoint);
  }

  return { sent, failed };
}

/**
 * Notifie les employés abonnés quand une commande arrive en préparation.
 * Les abonnements sont gardés en mémoire, mais les rôles sont relus en base
 * pour éviter de pousser une notification après un changement de permissions.
 */
export async function sendNewOrderMobileNotification(order: {
  id: number;
  type: "LIVRAISON" | "PICKUP";
}) {
  const subscribedUserIds = [...subscriptionsByUser.keys()];

  if (subscribedUserIds.length === 0) {
    return { sent: 0, failed: 0 };
  }

  const recipients = await prisma.user.findMany({
    where: {
      id: { in: subscribedUserIds },
      role: { in: ["employe", "admin"] },
    },
    select: { id: true },
  });
  const orderType =
    order.type === "LIVRAISON" ? "livraison" : "ramassage";

  const results = await Promise.all(
    recipients.map((recipient) =>
      sendMobileNotificationToUser(recipient.id, {
        title: "Nouvelle commande",
        body: `Commande #${order.id} en ${orderType} à préparer.`,
        url: "/preparateur",
      }),
    ),
  );

  return results.reduce(
    (total, result) => ({
      sent: total.sent + result.sent,
      failed: total.failed + result.failed,
    }),
    { sent: 0, failed: 0 },
  );
}

/**
 * Active les notifications Web Push pour un livreur qui attend qu'une commande
 * passe en disponibilité livraison.
 */
export function subscribeToDeliveryReadyMobileNotification(userId: string) {
  const alreadySubscribed = isSubscribedToDeliveryReadyMobileNotification(userId);
  deliveryReadySubscribers.set(
    userId,
    Date.now() + DELIVERY_READY_SUBSCRIPTION_DURATION_MS,
  );
  lastDeliveryReadyCount = 0;

  return { alreadySubscribed };
}

function isSubscribedToDeliveryReadyMobileNotification(userId: string) {
  const expiresAt = deliveryReadySubscribers.get(userId);

  if (!expiresAt) return false;

  if (expiresAt <= Date.now()) {
    deliveryReadySubscribers.delete(userId);
    return false;
  }

  return true;
}

/**
 * Envoie une Web Push aux livreurs qui se sont abonnés quand une livraison
 * devient disponible. L'appelant fournit le compteur courant pour éviter une
 * dépendance circulaire vers le service livraison.
 */
export async function notifyDeliveryReadyMobileSubscribers(availability: {
  available: boolean;
  count: number;
}) {
  if (isSendingDeliveryReadyNotifications || deliveryReadySubscribers.size === 0) {
    return { sent: 0, failed: 0 };
  }

  isSendingDeliveryReadyNotifications = true;

  try {
    const now = Date.now();

    for (const [userId, expiresAt] of deliveryReadySubscribers) {
      if (expiresAt <= now) {
        deliveryReadySubscribers.delete(userId);
      }
    }

    const shouldNotify =
      availability.available && availability.count > lastDeliveryReadyCount;
    lastDeliveryReadyCount = availability.count;

    if (!shouldNotify || deliveryReadySubscribers.size === 0) {
      return { sent: 0, failed: 0 };
    }

    const recipients = await prisma.user.findMany({
      where: {
        id: { in: [...deliveryReadySubscribers.keys()] },
        role: { in: ["employe", "admin"] },
      },
      select: { id: true },
    });

    const results = await Promise.all(
      recipients.map((recipient) =>
        sendMobileNotificationToUser(recipient.id, {
          title: "Livraison disponible",
          body: `${availability.count} commande${
            availability.count > 1 ? "s" : ""
          } prête${availability.count > 1 ? "s" : ""} pour livraison.`,
          url: "/livraison",
        }),
      ),
    );

    return results.reduce(
      (total, result) => ({
        sent: total.sent + result.sent,
        failed: total.failed + result.failed,
      }),
      { sent: 0, failed: 0 },
    );
  } finally {
    isSendingDeliveryReadyNotifications = false;
  }
}

/**
 * Envoie une notification de validation pour confirmer que l'utilisateur peut
 * recevoir des notifications mobiles depuis le site web.
 */
export async function sendTestMobileNotification(userId: string) {
  return sendMobileNotificationToUser(userId, {
    title: "Notifications activees",
    body: "Ton application web peut maintenant recevoir des notifications mobile.",
    url: "/",
  });
}
