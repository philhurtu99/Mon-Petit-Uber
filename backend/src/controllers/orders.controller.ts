import { Request, Response } from "express";
import {
  cancelActiveOrderByUser,
  confirmOrderCode,
  getActiveOrderByUser,
  getAllActiveOrders,
  getAllFinishedOrders,
  getAllLivraisonOrders,
  getAllPickupOrders,
  OrderRequestError,
  triggerReadyForPickup,
  switchOrderToTakeout,
  cancelStalledOrder,
} from "../services/orders.service";

import {
  getLivraisonsAvailableForAssignment,
  requestLivraisonOrder,
} from "../services/livraison.service";
import { ORDER_EXPIRATION_MS } from "../config/order.config";
import {
  orderEvents,
  USER_ORDER_EXPIRED,
  type UserOrderExpiredPayload,
} from "../services/orderEvents.service";

function getLivreurId(req: Request) {
  return (
    ((req.session as any)?.userId as string | undefined) ??
    ((req.body as any)?.livreurId as string | undefined)
  );
}

function getPreparateurId(req: Request) {
  return (
    ((req.session as any)?.userId as string | undefined) ??
    ((req.body as any)?.preparateurId as string | undefined)
  );
}

export const getAllPickup = async (_req: Request, res: Response) => {
  try {
    const orders = await getAllPickupOrders();
    return res.status(200).json(orders);
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ message: "Erreur lors de la récupération des commandes pickup" });
  }
};

export const getAllLivraison = async (_req: Request, res: Response) => {
  try {
    const orders = await getAllLivraisonOrders();
    return res.status(200).json(orders);
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Erreur lors de la récupération des commandes livraison",
    });
  }
};

export const getAvailableLivraison = async (_req: Request, res: Response) => {
  try {
    const orders = await getLivraisonsAvailableForAssignment();
    return res.status(200).json(orders);
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message:
        "Erreur lors de la récupération des commandes livraison disponibles",
    });
  }
};

export const requestNextLivraison = async (req: Request, res: Response) => {
  try {
    const livreurId = getLivreurId(req);

    const order = await requestLivraisonOrder(livreurId ?? "");

    if (!order) {
      return res
        .status(404)
        .json({ message: "Aucune commande livraison disponible" });
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

export const requestLivraisonById = async (req: Request, res: Response) => {
  try {
    const livreurId = getLivreurId(req);
    const order = await requestLivraisonOrder(
      livreurId ?? "",
      Number(req.params.id),
    );

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

export const triggerReady = async (req: Request, res: Response) => {
  try {
    const preparateurId = getPreparateurId(req);
    const order = await triggerReadyForPickup(
      Number(req.params.id),
      preparateurId,
    );

    return res.status(200).json({
      message: "Commande prête pour pickup",
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

export const getActiveOrder = async (req: Request, res: Response) => {
  try {
    const userId = (req.session as any)?.user?.id as string | undefined;

    if (!userId) {
      return res.status(401).json({ message: "Non authentifié" });
    }

    const commande = await getActiveOrderByUser(userId);

    if (!commande) {
      return res.status(404).json({ message: "Aucune commande active" });
    }

    return res.status(200).json({
      ...commande,
      preparationTimerLimitMs: ORDER_EXPIRATION_MS,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Erreur serveur" });
  }
};

export const streamActiveOrderEvents = async (req: Request, res: Response) => {
  const userId = (req.session as any)?.user?.id as string | undefined;

  if (!userId) {
    return res.status(401).json({ message: "Non authentifié" });
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders?.();
  res.write("retry: 5000\n\n");

  const handleOrderExpired = (payload: UserOrderExpiredPayload) => {
    if (payload.userId !== userId) return;

    res.write("event: order-expired\n");
    res.write(
      `data: ${JSON.stringify({
        orderId: payload.orderId,
        message: "Délais de commande expiré, transaction remboursée par crédit",
      })}\n\n`,
    );
  };

  const heartbeatId = setInterval(() => {
    res.write(": heartbeat\n\n");
  }, 30000);

  orderEvents.on(USER_ORDER_EXPIRED, handleOrderExpired);

  req.on("close", () => {
    clearInterval(heartbeatId);
    orderEvents.off(USER_ORDER_EXPIRED, handleOrderExpired);
    res.end();
  });
};

export const confirmCode = async (req: Request, res: Response) => {
  try {
    const commandeId = Number(req.params.id);
    const code = (req.body as any)?.code as string | undefined;

    if (!code) {
      return res.status(400).json({ message: "Code requis" });
    }

    const commande = await confirmOrderCode(commandeId, code);

    return res.status(200).json({
      message: "Commande confirmée",
      commande,
    });
  } catch (error: any) {
    if (error instanceof OrderRequestError) {
      return res.status(error.status).json({ message: error.message });
    }
    console.error(error);
    return res.status(500).json({ message: "Erreur serveur" });
  }
};

// Annule la commande active la plus récente d'un utilisateur.
export const cancelActiveOrder = async (req: Request, res: Response) => {
  try {
    const userId = (req.session as any)?.user?.id as string | undefined;

    if (!userId) {
      return res.status(401).json({ message: "Non authentifié" });
    }

    const commandeId = Number(req.params.id);

    if (!Number.isInteger(commandeId) || commandeId <= 0) {
      return res.status(400).json({ message: "Commande invalide" });
    }

    await cancelActiveOrderByUser(commandeId, userId);

    return res.status(200).json({
      message: "Commande annulée",
    });
  } catch (error: any) {
    if (error instanceof OrderRequestError) {
      return res.status(error.status).json({ message: error.message });
    }

    console.error(error);
    return res.status(500).json({ message: "Erreur serveur" });
  }
};

export const switchToTakeoutController = async (
  req: Request,
  res: Response,
) => {
  try {
    const userId = (req.session as any)?.user?.id as string | undefined;

    if (!userId) {
      return res.status(401).json({ message: "Non authentifié" });
    }

    const order = await switchOrderToTakeout(Number(req.params.id), userId);

    return res.status(200).json({
      message: "Commande passée en ramassage (Takeout)",
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

export const cancelStalledController = async (req: Request, res: Response) => {
  try {
    const userId = (req.session as any)?.user?.id as string | undefined;

    if (!userId) {
      return res.status(401).json({ message: "Non authentifié" });
    }

    await cancelStalledOrder(Number(req.params.id), userId);

    return res.status(200).json({
      message: "Commande annulée avec succès",
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
 * Récupère toutes les commandes terminées.
 *
 * Les commandes terminées correspondent aux commandes qui ne nécessitent
 * plus aucune action dans le système.
 *
 * Statuts inclus :
 * - COMPLETEE
 * - ANNULEE
 *
 * @route GET /orders/allFinished
 *
 * @param _req Requête HTTP Express (non utilisée).
 * @param res Réponse HTTP Express contenant :
 * - 200 : la liste des commandes terminées.
 * - 500 : une erreur lors de la récupération des commandes.
 *
 * @returns JSON contenant les commandes terminées.
 */
export const getAllFinished = async (_req: Request, res: Response) => {
  try {
    const orders = await getAllFinishedOrders();
    return res.status(200).json(orders);
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Erreur lors de la récupération des commandes terminées",
    });
  }
};

/**
 * Récupère toutes les commandes actuellement actives.
 *
 * Les commandes actives correspondent aux commandes qui ne sont pas encore terminées
 * ou archivées et qui sont encore en cours de traitement dans le système.
 *
 * Statuts inclus :
 * - EN_PREPARATION
 * - READY_FOR_PICKUP
 * - READY_FOR_DELIVERY
 * - IN_DELIVERY
 *
 * @route GET /orders/allActive
 *
 * @param _req Requête HTTP Express (non utilisée).
 * @param res Réponse HTTP Express contenant :
 * - 200 : la liste des commandes actives.
 * - 500 : une erreur lors de la récupération des commandes.
 *
 * @returns JSON contenant les commandes actives.
 */
export const getAllActive = async (_req: Request, res: Response) => {
  try {
    const orders = await getAllActiveOrders();
    return res.status(200).json(orders);
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Erreur lors de la récupération des commandes actives",
    });
  }
};
