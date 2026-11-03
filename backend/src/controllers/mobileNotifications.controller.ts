import { Request, Response } from "express";
import {
  deleteMobileNotificationSubscription,
  getMobileNotificationsPublicKey,
  saveMobileNotificationSubscription,
  sendMobileNotificationToUser,
  sendTestMobileNotification,
} from "../services/mobileNotifications.service";
import type { WebPushSubscription } from "../services/mobileNotifications.service";

type PushSubscriptionBody = {
  subscription?: {
    endpoint?: string;
    keys?: {
      p256dh?: string;
      auth?: string;
    };
  };
};

type UnsubscribeBody = {
  endpoint?: string;
};

type SendNotificationBody = {
  userId?: string;
  title?: string;
  body?: string;
  url?: string;
};

/**
 * Recupere l'identifiant de l'utilisateur connecte depuis la session Express.
 */
function getSessionUserId(req: Request) {
  return (req.session as any)?.user?.id as string | undefined;
}

/**
 * Verifie que la souscription recue contient les champs requis par Web Push.
 */
function isValidPushSubscription(
  subscription: PushSubscriptionBody["subscription"],
) : subscription is WebPushSubscription {
  return (
    typeof subscription?.endpoint === "string" &&
    typeof subscription.keys?.p256dh === "string" &&
    typeof subscription.keys.auth === "string"
  );
}

/**
 * Retourne la cle publique VAPID a utiliser par le navigateur pour creer une
 * souscription aux notifications Web Push.
 */
export const getVapidPublicKey = (_req: Request, res: Response) => {
  try {
    return res.status(200).json({
      publicKey: getMobileNotificationsPublicKey(),
    });
  } catch (error: any) {
    return res.status(500).json({
      message: error.message || "Configuration notifications invalide",
    });
  }
};

/**
 * Enregistre la souscription Web Push du navigateur pour l'utilisateur courant.
 */
export const subscribeToMobileNotifications = (req: Request, res: Response) => {
  try {
    const userId = getSessionUserId(req);

    if (!userId) {
      return res.status(401).json({ message: "Non authentifie" });
    }

    const { subscription } = req.body as PushSubscriptionBody;

    if (!isValidPushSubscription(subscription)) {
      return res.status(400).json({ message: "Abonnement push invalide" });
    }

    const result = saveMobileNotificationSubscription(userId, subscription);

    return res.status(result.alreadySubscribed ? 200 : 201).json({
      message: result.alreadySubscribed
        ? "Notification mobile deja active"
        : "Notification mobile activee",
      ...result,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Erreur serveur" });
  }
};

/**
 * Supprime la souscription Web Push de l'utilisateur courant a partir de son
 * endpoint navigateur.
 */
export const unsubscribeFromMobileNotifications = (
  req: Request,
  res: Response,
) => {
  try {
    const userId = getSessionUserId(req);

    if (!userId) {
      return res.status(401).json({ message: "Non authentifie" });
    }

    const { endpoint } = req.body as UnsubscribeBody;

    if (!endpoint) {
      return res.status(400).json({ message: "Endpoint requis" });
    }

    const result = deleteMobileNotificationSubscription(userId, endpoint);

    return res.status(200).json({
      message: result.removed
        ? "Notification mobile desactivee"
        : "Aucun abonnement trouve",
      ...result,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Erreur serveur" });
  }
};

/**
 * Envoie une notification de test a l'utilisateur connecte.
 */
export const sendTestNotification = async (req: Request, res: Response) => {
  try {
    const userId = getSessionUserId(req);

    if (!userId) {
      return res.status(401).json({ message: "Non authentifie" });
    }

    const result = await sendTestMobileNotification(userId);

    return res.status(200).json({
      message: "Notification de test envoyee",
      ...result,
    });
  } catch (error: any) {
    console.error(error);
    return res.status(500).json({
      message: error.message || "Erreur lors de l'envoi de la notification",
    });
  }
};

/**
 * Envoie une notification personnalisee a un utilisateur cible.
 * Cette route est protegee cote routes par le guard admin.
 */
export const sendNotificationToUser = async (req: Request, res: Response) => {
  try {
    const { userId, title, body, url } = req.body as SendNotificationBody;

    if (!userId || !title || !body) {
      return res.status(400).json({
        message: "userId, title et body sont requis",
      });
    }

    const result = await sendMobileNotificationToUser(userId, {
      title,
      body,
      ...(url && { url }),
    });

    return res.status(200).json({
      message: "Notification envoyee",
      ...result,
    });
  } catch (error: any) {
    console.error(error);
    return res.status(500).json({
      message: error.message || "Erreur lors de l'envoi de la notification",
    });
  }
};
