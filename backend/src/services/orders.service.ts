import { prisma } from "../lib/prisma";
import {
  notifyOrderDeliveryChanged,
  notifyOrderPreparationChanged,
} from "./orderEvents.service";
import {
  cancelUnclaimedPreparationOrder,
  clearOrderExpiration,
} from "./orderExpiration.service";
import {
  awardLoyaltyPointsForCompletedOrder,
  capLoyaltyPoints,
} from "./loyalty.service";
import { notifyUserCreditChanged } from "./creditEvents.service";
import { notifyUserLoyaltyPointsChanged } from "./loyaltyEvents.service";
import { STALLED_ORDER_TIMEOUT_MS } from "../config/order.config";

export class OrderRequestError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

/**
 * Configuration des relations à charger pour les requêtes commandes
 * Inclut les détails complets : utilisateur, articles avec produits, livreur et préparateur
 */
const orderInclude = {
  transaction: {
    include: {
      user: true,
      items: {
        include: {
          product: true,
        },
      },
    },
  },
  livreur: true,
  preparateur: true,
};

/** État d'une commande prête à être retirée (PICKUP) */
const READY_FOR_PICKUP = "READY_FOR_PICKUP" as const;

/** État d'une commande de livraison prête à être assignée à un livreur */
const READY_FOR_DELIVERY = "READY_FOR_DELIVERY" as const;

/**
 * getAllPickupOrders
 *
 * Récupère toutes les commandes de type PICKUP (retrait sur place)
 *
 * Fonctionnalité:
 * - Récupère l'intégralité des commandes avec type "PICKUP"
 * - Inclut les relations complètes (utilisateur, articles, produits, livreur, préparateur)
 * - Trie les résultats par date de création décroissante (plus récentes d'abord)
 *
 * @returns {Promise<Commande[]>} Liste des commandes PICKUP avec toutes les relations
 * @note Utile pour l'interface d'admin/gestionnaire pour voir tous les retraits
 * @performance Pas de pagination - attention si le nombre de commandes grandit
 */
export const getAllPickupOrders = async () => {
  return await prisma.commande.findMany({
    where: { type: "PICKUP" },
    include: orderInclude,
    orderBy: { createdAt: "desc" },
  });
};

/**
 * getAllLivraisonOrders
 *
 * Récupère toutes les commandes de type LIVRAISON (à domicile)
 *
 * Fonctionnalité:
 * - Récupère l'intégralité des commandes avec type "LIVRAISON"
 * - Inclut les relations complètes (utilisateur, articles, produits, livreur, préparateur)
 * - Trie les résultats par date de création décroissante (plus récentes d'abord)
 *
 * @returns {Promise<Commande[]>} Liste des commandes LIVRAISON avec toutes les relations
 * @note Utile pour l'interface d'admin/gestionnaire pour voir toutes les livraisons
 * @performance Pas de pagination - attention si le nombre de commandes grandit
 */
export const getAllLivraisonOrders = async () => {
  return await prisma.commande.findMany({
    where: { type: "LIVRAISON" },
    include: orderInclude,
    orderBy: { createdAt: "desc" },
  });
};

/**
 * triggerReadyForPickup
 *
 * Marque une commande comme prête à être retirée/livrée après la préparation
 *
 * Processus:
 * - Vérifie que la commande existe et est en état "EN_PREPARATION"
 * - Valide que c'est la plus ancienne commande en préparation (ordre FIFO)
 * - Met à jour l'état (READY_FOR_PICKUP ou READY_FOR_DELIVERY selon type)
 * - Enregistre l'horodatage readyForPickupAt
 * - Optionnellement associe le préparateur responsable
 * - Notifie les observateurs du changement
 *
 * @param {number} commandeId - ID de la commande à marquer prête
 * @param {string | null | undefined} preparateurId - ID du préparateur (optionnel)
 * @returns {Promise<Commande>} La commande mise à jour avec toutes ses relations
 * @throws OrderRequestError si commande introuvable, pas en préparation, ou pas la plus vieille
 * @note Garantit un ordre FIFO strict des préparations pour éviter les doublons
 * @note Le timestamp readyForPickupAt est défini côté serveur (UTC recommandé)
 */
export const triggerReadyForPickup = async (
  commandeId: number,
  preparateurId?: string | null,
) => {
  const commande = await prisma.commande.findUnique({
    where: { id: commandeId },
  });

  if (!commande) {
    throw new OrderRequestError(404, "Commande introuvable");
  }

  if (commande.etat !== "EN_PREPARATION") {
    throw new OrderRequestError(
      409,
      "Seule une commande en préparation peut être marquée prête",
    );
  }

  const oldestCommande = await prisma.commande.findFirst({
    where: { etat: "EN_PREPARATION" },
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });

  if (!oldestCommande) {
    throw new OrderRequestError(404, "Aucune commande à préparer");
  }

  if (oldestCommande.id !== commandeId) {
    throw new OrderRequestError(
      409,
      `Vous devez compléter la plus vieille en premier (#${oldestCommande.id}).`,
    );
  }

  const readyState =
    commande.type === "LIVRAISON" ? READY_FOR_DELIVERY : READY_FOR_PICKUP;

  const order = await prisma.commande.update({
    where: { id: commandeId },
    data: {
      etat: readyState,
      readyForPickupAt: new Date(),
      ...(preparateurId !== undefined && { preparateurId }),
    },
    include: orderInclude,
  });

  notifyOrderPreparationChanged();
  clearOrderExpiration(commandeId);

  if (commande.type === "LIVRAISON") {
    notifyOrderDeliveryChanged();
  }

  return order;
};

/**
 * Récupère la commande active la plus récente d'un utilisateur donné.
 * Une commande est considérée "active" si son état n'est ni `COMPLETEE` ni `ANNULEE`.
 * Si l'utilisateur possède plusieurs commandes actives, seule la plus récemment créée est retournée.
 * @param userId
 * @returns
 */
export const getActiveOrderByUser = async (userId: string) => {
  return await prisma.commande.findFirst({
    where: {
      transaction: { userId },
      etat: { notIn: ["COMPLETEE", "ANNULEE"] },
    },
    include: orderInclude,
    orderBy: { createdAt: "desc" },
  });
};

export const cancelActiveOrderByUser = async (
  commandeId: number,
  userId: string,
) => {
  const result = await cancelUnclaimedPreparationOrder(
    commandeId,
    "Annulation manuelle par le client",
    { userId },
  );

  if (!result) {
    throw new OrderRequestError(
      409,
      "Cette commande ne peut plus être annulée.",
    );
  }

  return result;
};

/**
 * Change une commande de LIVRAISON à PICKUP (Takeout)
 * Uniquement si la commande est en attente de livreur (READY_FOR_DELIVERY)
 */
export const switchOrderToTakeout = async (
  commandeId: number,
  userId: string,
) => {
  const commande = await prisma.commande.findUnique({
    where: { id: commandeId },
    include: { transaction: true },
  });

  if (!commande) throw new OrderRequestError(404, "Commande introuvable");
  if (commande.transaction.userId !== userId)
    throw new OrderRequestError(403, "Non autorisé");
  if (commande.etat !== "READY_FOR_DELIVERY") {
    throw new OrderRequestError(
      400,
      "Seule une commande en attente de livreur peut être passée en takeout",
    );
  }

  const updated = await prisma.commande.update({
    where: { id: commandeId },
    data: {
      type: "PICKUP",
      etat: "READY_FOR_PICKUP",
    },
    include: orderInclude,
  });

  notifyOrderDeliveryChanged();
  notifyOrderPreparationChanged();

  return updated;
};

/**
 * Annule une commande bloquée (stalled) sans livreur depuis 15min.
 * Uniquement si aucun produit n'est cuisiné/cuit.
 */
export const cancelStalledOrder = async (
  commandeId: number,
  userId: string,
) => {
  const commande = await prisma.commande.findUnique({
    where: { id: commandeId },
    include: {
      transaction: {
        include: {
          items: {
            include: { product: true },
          },
        },
      },
    },
  });

  if (!commande) throw new OrderRequestError(404, "Commande introuvable");
  if (commande.transaction.userId !== userId)
    throw new OrderRequestError(403, "Non autorisé");

  if (commande.etat !== "READY_FOR_DELIVERY") {
    throw new OrderRequestError(
      400,
      "La commande n'est pas dans un état permettant cette annulation",
    );
  }

  // Vérification des 15 minutes
  const readyAt = commande.readyForPickupAt?.getTime() || 0;
  if (Date.now() - readyAt < STALLED_ORDER_TIMEOUT_MS) {
    throw new OrderRequestError(
      400,
      "Veuillez attendre 15 minutes avant d'annuler",
    );
  }

  // Vérification isCooked
  const hasCookedItems = commande.transaction.items.some(
    (item) => item.product.isCooked,
  );
  if (hasCookedItems) {
    throw new OrderRequestError(
      400,
      "Cette commande contient des produits cuisinés et ne peut être annulée",
    );
  }

  // Logique d'annulation (Remboursement + Stock)
  // On utilise une transaction Prisma pour garantir l'atomicité
  const result = await prisma.$transaction(async (tx) => {
    // 1. Passer en ANNULEE
    await tx.commande.update({
      where: { id: commandeId },
      data: {
        etat: "ANNULEE",
        cancelledAt: new Date(),
        cancelReason: "Annulation par le client (pas de livreur après 15min)",
      },
    });

    // 2. Rembourser le crédit et les points
    const user = await tx.user.findUnique({
      where: { id: userId },
      select: { loyaltyPoints: true, creditBalance: true },
    });

    const loyaltyPointsUsed = commande.transaction.loyaltyPointsUsed ?? 0;
    const loyaltyDiscount = commande.transaction.loyaltyDiscount ?? 0;
    const totalToRefund = commande.transaction.total - loyaltyDiscount;

    await tx.user.update({
      where: { id: userId },
      data: {
        creditBalance: { increment: totalToRefund },
        ...(loyaltyPointsUsed > 0 && {
          loyaltyPoints: capLoyaltyPoints(
            (user?.loyaltyPoints ?? 0) + loyaltyPointsUsed,
          ),
        }),
      },
    });

    // 3. Remettre en stock
    await Promise.all(
      commande.transaction.items.map((item) =>
        tx.product.update({
          where: { id: item.productId },
          data: { stock: { increment: item.quantity } },
        }),
      ),
    );

    return true;
  });

  if (result) {
    notifyOrderDeliveryChanged();
    notifyOrderPreparationChanged();
    notifyUserCreditChanged(userId);
    if (commande.transaction.loyaltyPointsUsed > 0) {
      notifyUserLoyaltyPointsChanged(userId);
    }
  }

  return result;
};

/**
 typescript/**
 * Confirme le code de retrait d'une commande et la marque comme complétée.
 * Vérifie que la commande existe, qu'elle est prête pour le ramassage (`READY_FOR_PICKUP`),
 * et que le code de confirmation fourni est correct. Si toutes les conditions sont remplies,
 * l'état de la commande est mis à jour vers `COMPLETEE`.
 * @param commandeId
 * @param code
 * @returns
 */
export const confirmOrderCode = async (commandeId: number, code: string) => {
  const commande = await prisma.commande.findUnique({
    where: { id: commandeId },
  });

  if (!commande) {
    throw new OrderRequestError(404, "Commande introuvable");
  }

  if (commande.etat !== "READY_FOR_PICKUP" && commande.etat !== "IN_DELIVERY") {
    throw new OrderRequestError(
      409,
      "Cette commande n'est pas prête pour ramassage",
    );
  }

  if (commande.codeConfirmation !== code) {
    throw new OrderRequestError(400, "Code incorrect");
  }

  const completedOrder = await prisma.commande.update({
    where: { id: commandeId },
    data: { etat: "COMPLETEE" },
    include: orderInclude,
  });

  // Ajuste les points de fidélité du client pour la commande complétée.
  await awardLoyaltyPointsForCompletedOrder(commandeId);

  return completedOrder;
};

/// DTO avec les informations de commandes à afficher pour l'histori de commandes
export type CommandeHistoryDTO = {
  id: number;
  type: string;
  local?: string | null;
  etat: string;
  createdAt: Date;
  updatedAt: Date;
  readyForPickupAt: Date | null;
  deliveryPickedUpAt: Date | null;
  codeConfirmation?: string | null;

  // CLIENT
  client: {
    id: string;
    name: string | null;
    email?: string | null;
  };

  // LIVREUR
  livreur: {
    id: string;
    name: string | null;
  } | null;

  // ITEMS
  items: {
    id: number;
    imageUrl: string;
    productId: number;
    productName: string;
    quantity: number;
    price: number;
  }[];

  // 📊 META
  itemsCount: number;
  total: number;
};

/**
 * Fonction permettant de convertir une Commande en DTO avec tou les info nécessaires
 * @param order commande à extraire l'information
 * @returns CommandeHistoryDTO avec les informations de la comamnde
 */
export function toCommandeDashboardDTO(order: any): CommandeHistoryDTO {
  return {
    id: order.id,

    type: order.type,
    ...(order.local ? { local: order.local } : {}),
    etat: order.etat,

    createdAt: order.createdAt,
    updatedAt: order.updatedAt,

    readyForPickupAt: order.readyForPickupAt,
    deliveryPickedUpAt: order.deliveryPickedUpAt,

    codeConfirmation: order.codeConfirmation,

    client: {
      id: order.transaction?.user?.id,
      name:
        order.transaction?.user?.firstName +
          (order.transaction?.user?.lastName !== undefined
            ? " " + order.transaction?.user?.lastName
            : "") || null,
      email: order.transaction?.user?.email || null,
    },

    livreur: order.livreur
      ? {
          id: order.livreur.id,
          name:
            order.livreur.firstName +
              (order.livreur.lastName !== undefined
                ? " " + order.livreur.lastName
                : "") || null,
        }
      : null,

    items:
      order.transaction?.items?.map((item: any) => ({
        id: item.id,
        imageUrl: item.product?.imageUrl,
        productId: item.productId,
        productName: item.product?.name || "Unknown",
        quantity: item.quantity,
        price: item.price,
      })) || [],

    itemsCount: order.transaction?.items?.length || 0,

    total: order.transaction?.total || 0,
  };
}

/**
 * Fonction permettant de convertir une liste de commandes dans une liste de DTO
 * @param orders lsite de commandes à convertir
 * @returns CommandeHistoryDTO avec les informations de la liste de comamndes
 */
export function toCommandeDashboardDTOList(
  orders: any[],
): CommandeHistoryDTO[] {
  return orders.map(toCommandeDashboardDTO);
}

/**
 * getAllFinishedOrders
 *
 * Récupère toutes les commandes qui sont déjà terminés (état = COMPLETEE, ANNULEE)
 *
 * Fonctionnalité:
 * - Récupère l'intégralité des commandes avec état "COMPLETEE" ou "ANNULEE"
 * - Inclut les relations complètes (utilisateur, articles, produits, livreur, préparateur)
 * - Trie les résultats par date de création décroissante (plus récentes d'abord)
 *
 * @returns {Promise<Commande[]>} Liste des commandes "COMPLETEE" ou "ANNULEE" avec toutes les relations
 * @note Utile pour l'interface d'admin/gestionnaire pour voir l'historique de commandes déjà terminés
 * @performance Pas de pagination - attention si le nombre de commandes grandit
 */
export const getAllFinishedOrders = async () => {
  let commandes = await prisma.commande.findMany({
    where: { etat: { in: ["COMPLETEE", "ANNULEE"] } },
    include: orderInclude,
    orderBy: { createdAt: "desc" },
  });

  return toCommandeDashboardDTOList(commandes);
};

/**
 * getAllActiveOrders
 *
 * Récupère toutes les commandes qui sont encore actives (EN_PREPARATION, READY_FOR_PICKUP, READY_FOR_DELIVERY, IN_DELIVERY)
 *
 * Fonctionnalité:
 * - Récupère l'intégralité des commandes actives (pas terminées ou annulées)
 * - Inclut les relations complètes (utilisateur, articles, produits, livreur, préparateur)
 * - Trie les résultats par date de création décroissante (plus récentes d'abord)
 *
 * @returns {Promise<Commande[]>} Liste des commandes encore actives avec toutes les relations
 * @note Utile pour l'interface d'admin/gestionnaire pour voir l'historique de commandes encore actives
 * @performance Pas de pagination - attention si le nombre de commandes grandit
 */
export const getAllActiveOrders = async () => {
  let commandes = await prisma.commande.findMany({
    where: { etat: { notIn: ["COMPLETEE", "ANNULEE"] } },
    include: orderInclude,
    orderBy: { createdAt: "desc" },
  });

  return toCommandeDashboardDTOList(commandes);
};
