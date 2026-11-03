import { Request, Response } from "express";
import {
  completeCurrentLivraisonForLivreur,
  getCurrentLivraisonForLivreur,
  getLivraisonAvailability,
  requestOldestLivraisonForLivreur,
} from "../services/livraison.service";
import {
  ORDER_DELIVERY_CHANGED,
  orderEvents,
} from "../services/orderEvents.service";
import {
  notifyDeliveryReadyEmailSubscribers,
  subscribeToDeliveryReadyEmail,
} from "../services/livraisonNotifications.service";
import {
  notifyDeliveryReadyMobileSubscribers,
  subscribeToDeliveryReadyMobileNotification,
} from "../services/mobileNotifications.service";
import { OrderRequestError } from "../services/orders.service";

/**
 * Extrait l'ID du livreur depuis la session de la requête
 * @param req - Requête Express
 */
function getLivreurId(req: Request) {
  const session = req.session as any;
  return (
    (session?.user?.id as string | undefined) ??
    (session?.userId as string | undefined)
  );
}

/**
 * Extrait les infos utilisateur depuis la session de la requête
 * @param req - Requête Express
 */
function getSessionUser(req: Request) {
  return (req.session as any)?.user as
    | {
        id?: string;
        email?: string;
        firstName?: string;
        lastName?: string;
      }
    | undefined;
}

/**
 * Retourne l'état de disponibilité des livraisons
 * @route GET /livraison/status
 */
export const getLivraisonStatus = async (_req: Request, res: Response) => {
  try {
    const status = await getLivraisonAvailability();
    return res.status(200).json(status);
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Erreur lors de la vérification des livraisons disponibles",
    });
  }
};

/**
 * Stream Server-Sent Events pour surveiller la disponibilité des livraisons
 * Envoie une mise à jour à chaque changement d'état
 * @route GET /livraison/status/stream
 */
export const streamLivraisonStatus = async (_req: Request, res: Response) => {
  // Configuration des headers SSE
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders?.();
  res.write("retry: 5000\n\n");

  let closed = false;
  let lastPayload = "";

  const sendStatus = async () => {
    if (closed) return;

    try {
      const status = await getLivraisonAvailability();
      const payload = JSON.stringify(status);

      // Évite d'envoyer des messages identiques
      if (closed || payload === lastPayload) return;

      lastPayload = payload;
      res.write("event: availability\n");
      res.write(`data: ${payload}\n\n`);
    } catch (error) {
      if (closed) return;

      console.error(error);
      res.write("event: error\n");
      res.write(
        `data: ${JSON.stringify({
          message: "Erreur lors de la vérification des livraisons disponibles",
        })}\n\n`,
      );
    }
  };

  void sendStatus();
  
  // Heartbeat toutes les 30 secondes pour maintenir la connexion
  const heartbeatId = setInterval(() => {
    if (!closed) {
      res.write(": heartbeat\n\n");
    }
  }, 30000);

  // Écoute les changements de livraison
  orderEvents.on(ORDER_DELIVERY_CHANGED, sendStatus);

  // Nettoie les ressources lors de la fermeture
  _req.on("close", () => {
    closed = true;
    clearInterval(heartbeatId);
    orderEvents.off(ORDER_DELIVERY_CHANGED, sendStatus);
    res.end();
  });
};

/**
 * Récupère la livraison actuelle du livreur
 * @route GET /livraison/current
 */
export const getCurrentLivraison = async (req: Request, res: Response) => {
  try {
    const order = await getCurrentLivraisonForLivreur(getLivreurId(req) ?? "");

    return res.status(200).json({ order });
  } catch (error: any) {
    if (error instanceof OrderRequestError) {
      return res.status(error.status).json({ message: error.message });
    }

    console.error(error);
    return res.status(500).json({ message: "Erreur serveur" });
  }
};

/**
 * Stream Server-Sent Events pour surveiller la livraison actuelle du livreur
 * @route GET /livraison/current/stream
 */
export const streamCurrentLivraison = async (req: Request, res: Response) => {
  // Configuration des headers SSE
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders?.();
  res.write("retry: 5000\n\n");

  let closed = false;
  let lastPayload = "";

  const sendCurrentLivraison = async () => {
    if (closed) return;

    try {
      const order = await getCurrentLivraisonForLivreur(getLivreurId(req) ?? "");
      const payload = JSON.stringify({ order });

      // Évite d'envoyer des messages identiques
      if (closed || payload === lastPayload) return;

      lastPayload = payload;
      res.write("event: current\n");
      res.write(`data: ${payload}\n\n`);
    } catch (error) {
      if (closed) return;

      if (error instanceof OrderRequestError) {
        res.write("event: error\n");
        res.write(
          `data: ${JSON.stringify({ message: error.message })}\n\n`,
        );
        return;
      }

      console.error(error);
      res.write("event: error\n");
      res.write(
        `data: ${JSON.stringify({ message: "Erreur serveur" })}\n\n`,
      );
    }
  };

  void sendCurrentLivraison();
  
  // Heartbeat toutes les 30 secondes
  const heartbeatId = setInterval(() => {
    if (!closed) {
      res.write(": heartbeat\n\n");
    }
  }, 30000);

  // Écoute les changements de livraison
  orderEvents.on(ORDER_DELIVERY_CHANGED, sendCurrentLivraison);

  // Nettoie les ressources lors de la fermeture
  req.on("close", () => {
    closed = true;
    clearInterval(heartbeatId);
    orderEvents.off(ORDER_DELIVERY_CHANGED, sendCurrentLivraison);
    res.end();
  });
};

/**
 * Assigne une livraison au livreur qui la demande
 * @route POST /livraison/request
 */
export const requestLivraison = async (req: Request, res: Response) => {
  try {
    const order = await requestOldestLivraisonForLivreur(
      getLivreurId(req) ?? "",
    );

    if (!order) {
      return res.status(404).json({
        message: "Aucune commande prête pour livraison disponible",
      });
    }

    return res.status(200).json({
      message: "Commande assignée au livreur",
      order,
    });
  } catch (error: any) {
    if (error instanceof OrderRequestError) {
      return res.status(error.status).json({ message: error.message });
    }

    console.error(error);
    return res.status(500).json({ message: "Erreur serveur" });
  }
};

/**
 * Permet au livreur de s'abonner à une notification email
 * quand une livraison sera disponible
 * @route POST /livraison/notifications/ready
 */
export const subscribeToLivraisonReadyNotification = async (
  req: Request,
  res: Response,
) => {
  try {
    const user = getSessionUser(req);
    const userId = getLivreurId(req);

    if (!userId || !user?.email) {
      return res.status(400).json({
        message: "Impossible de trouver l'adresse courriel du livreur.",
      });
    }

    const availability = await getLivraisonAvailability();

    // Si des livraisons sont déjà disponibles, pas besoin de s'abonner
    if (availability.available) {
      return res.status(200).json({
        message: "Une commande est déjà disponible pour livraison.",
        subscribed: false,
      });
    }

    const name = [user.firstName, user.lastName].filter(Boolean).join(" ");
    const { alreadySubscribed } = subscribeToDeliveryReadyEmail({
      userId,
      email: user.email,
      ...(name && { name }),
    });
    subscribeToDeliveryReadyMobileNotification(userId);

    return res.status(200).json({
      message: alreadySubscribed
        ? "La notification courriel est déjà activée pour 1 heure."
        : "Notification courriel activée pour 1 heure. Vous recevrez un courriel dès qu'une commande sera prête.",
      subscribed: true,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Erreur lors de l'activation de la notification courriel",
    });
  }
};

/**
 * Termine la livraison actuellement assignée au livreur
 * @route POST /livraison/complete
 */
export const completeLivraison = async (req: Request, res: Response) => {
  try {
    const code = (req.body as any)?.code as string | undefined;

    if (!code) {
      return res.status(400).json({ message: "Code requis" });
    }

    const order = await completeCurrentLivraisonForLivreur(
      getLivreurId(req) ?? "",
      code,
    );

    return res.status(200).json({
      message: "Livraison terminée",
      order,
    });
  } catch (error: any) {
    if (error instanceof OrderRequestError) {
      return res.status(error.status).json({ message: error.message });
    }

    console.error(error);
    return res.status(500).json({ message: "Erreur serveur" });
  }
};

/**
 * Émet des notifications email à tous les livreurs abonnés
 * quand une nouvelle livraison est disponible
 */
orderEvents.on(ORDER_DELIVERY_CHANGED, () => {
  void notifyDeliveryReadyEmailSubscribers();
  void getLivraisonAvailability()
    .then((availability) => notifyDeliveryReadyMobileSubscribers(availability))
    .catch((error) => {
      console.error("Erreur notification mobile livraison:", error);
    });
});
