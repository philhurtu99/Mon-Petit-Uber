import { prisma } from "../lib/prisma";
import {
  notifyOrderDeliveryChanged,
  notifyOrderPreparationChanged,
} from "./orderEvents.service";
import { OrderRequestError } from "./orders.service";
import { awardLoyaltyPointsForCompletedOrder } from "./loyalty.service";

/**
 * Configuration des données à inclure lors de la récupération d'une commande
 * Inclut les détails de la transaction, l'utilisateur, les articles et les produits
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

/** États de livraison constants */
const READY_FOR_DELIVERY = "READY_FOR_DELIVERY" as const;
const IN_DELIVERY = "IN_DELIVERY" as const;
const COMPLETED = "COMPLETEE" as const;
const CLOSED_DELIVERY_STATES = ["COMPLETEE", "ANNULEE"] as const;

/**
 * Critères pour trouver les livraisons disponibles (non assignées et prêtes)
 */
const availableLivraisonWhere = {
  type: "LIVRAISON" as const,
  etat: READY_FOR_DELIVERY,
  livreurId: null,
};

/**
 * Critères pour trouver les livraisons actives d'un livreur
 * @param livreurId - ID du livreur
 */
const activeLivraisonWhere = (livreurId: string) => ({
  type: "LIVRAISON" as const,
  livreurId,
  etat: { notIn: [...CLOSED_DELIVERY_STATES] },
});

/**
 * Récupère toutes les livraisons disponibles pour assignation
 * Triées par date de prêt, puis par date de création
 */
export const getLivraisonsAvailableForAssignment = async () => {
  return await prisma.commande.findMany({
    where: availableLivraisonWhere,
    include: orderInclude,
    orderBy: [{ readyForPickupAt: "asc" }, { createdAt: "asc" }],
  });
};

/**
 * Vérifie la disponibilité des livraisons
 * @returns Objet avec la disponibilité (booléen) et le nombre de livraisons disponibles
 */
export const getLivraisonAvailability = async () => {
  const count = await prisma.commande.count({
    where: availableLivraisonWhere,
  });

  return {
    available: count > 0,
    count,
  };
};

/**
 * Récupère la livraison active du livreur
 * @param livreurId - ID du livreur
 * @throws OrderRequestError si le livreur n'est pas authentifié
 */
export const getCurrentLivraisonForLivreur = async (livreurId: string) => {
  if (!livreurId) {
    throw new OrderRequestError(401, "Livreur non authentifié");
  }

  return await prisma.commande.findFirst({
    where: activeLivraisonWhere(livreurId),
    include: orderInclude,
    orderBy: [{ readyForPickupAt: "asc" }, { createdAt: "asc" }],
  });
};

/**
 * Récupère une commande formatée pour la réponse API
 * @param id - ID de la commande
 */
async function getCommandeForResponse(id: number) {
  return await prisma.commande.findUnique({
    where: { id },
    include: orderInclude,
  });
}

/**
 * Vérifie qu'un livreur peut recevoir une nouvelle livraison
 * Lève une erreur s'il en a déjà une en cours
 * @param livreurId - ID du livreur
 * @throws OrderRequestError si le livreur a déjà une livraison active
 */
async function ensureLivreurCanReceiveLivraison(livreurId: string) {
  const activeLivraison = await prisma.commande.findFirst({
    where: activeLivraisonWhere(livreurId),
    select: { id: true },
  });

  if (activeLivraison) {
    throw new OrderRequestError(
      409,
      `Livreur déjà assigné à une livraison (#${activeLivraison.id})`,
    );
  }
}

/**
 * Explique pourquoi une commande n'est pas disponible pour assignation
 * Lance une exception avec le motif détaillé
 * @param id - ID de la commande
 * @throws OrderRequestError avec le motif d'indisponibilité
 */
async function explainUnavailableCommande(id: number): Promise<never> {
  const commande = await prisma.commande.findUnique({ where: { id } });

  if (!commande) {
    throw new OrderRequestError(404, "Commande introuvable");
  }

  if (commande.type !== "LIVRAISON") {
    throw new OrderRequestError(400, "Cette commande n'est pas une livraison");
  }

  if (commande.livreurId) {
    throw new OrderRequestError(409, "Commande déjà assignée à un livreur");
  }

  if (commande.etat !== READY_FOR_DELIVERY) {
    throw new OrderRequestError(
      409,
      "Commande pas encore prête à être récupérée par un livreur",
    );
  }

  throw new OrderRequestError(
    409,
    "Commande non disponible pour une demande livreur",
  );
}

/**
 * Demande l'assignation d'une livraison pour un livreur
 * Peut être pour une commande spécifique ou la plus ancienne disponible
 * 
 * @param livreurId - ID du livreur
 * @param commandeId - ID de la commande (optionnel)
 * @returns La commande assignée ou null si aucune disponible
 * @throws OrderRequestError en cas d'erreur d'authentification ou de validation
 */
export const requestLivraisonOrder = async (
  livreurId: string,
  commandeId?: number,
) => {
  if (!livreurId) {
    throw new OrderRequestError(401, "Livreur non authentifié");
  }

  await ensureLivreurCanReceiveLivraison(livreurId);

  // Si une commande spécifique est demandée
  if (commandeId) {
    const result = await prisma.commande.updateMany({
      where: {
        id: commandeId,
        ...availableLivraisonWhere,
      },
      data: {
        livreurId,
        etat: IN_DELIVERY,
        deliveryPickedUpAt: new Date(),
      },
    });

    if (result.count === 0) {
      await explainUnavailableCommande(commandeId);
    }

    notifyOrderDeliveryChanged();
    return await getCommandeForResponse(commandeId);
  }

  // Sinon, on cherche la plus ancienne commande disponible
  // Avec 3 tentatives pour gérer les conditions de concurrence
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const nextCommande = await prisma.commande.findFirst({
      where: availableLivraisonWhere,
      orderBy: [{ readyForPickupAt: "asc" }, { createdAt: "asc" }],
      select: { id: true },
    });

    if (!nextCommande) {
      return null;
    }

    const result = await prisma.commande.updateMany({
      where: {
        id: nextCommande.id,
        ...availableLivraisonWhere,
      },
      data: {
        livreurId,
        etat: IN_DELIVERY,
        deliveryPickedUpAt: new Date(),
      },
    });

    if (result.count === 1) {
      notifyOrderDeliveryChanged();
      notifyOrderPreparationChanged();
      return await getCommandeForResponse(nextCommande.id);
    }
  }

  throw new OrderRequestError(
    409,
    "Impossible d'assigner une commande pour le moment",
  );
};

/**
 * Demande la plus ancienne livraison disponible pour un livreur
 * @param livreurId - ID du livreur
 */
export const requestOldestLivraisonForLivreur = async (livreurId: string) => {
  return await requestLivraisonOrder(livreurId);
};

/**
 * Termine la livraison active du livreur
 * Marque la commande comme complétée et envoie les notifications
 * 
 * @param livreurId - ID du livreur
 * @returns La commande complétée
 * @throws OrderRequestError si aucune livraison en cours ou authentification manquante
 */
export const completeCurrentLivraisonForLivreur = async (livreurId: string, code: string) => {
  if (!livreurId) {
    throw new OrderRequestError(401, "Livreur non authentifié");
  }

  const currentLivraison = await prisma.commande.findFirst({
    where: activeLivraisonWhere(livreurId),
    select: { id: true, codeConfirmation: true },
    orderBy: [{ readyForPickupAt: "asc" }, { createdAt: "asc" }],
  });

  if (!currentLivraison) {
    throw new OrderRequestError(404, "Aucune livraison en cours");
  }

   if (currentLivraison.codeConfirmation !== code) {
    throw new OrderRequestError(400, "Code de confirmation invalide");
  }

  const result = await prisma.commande.updateMany({
    where: {
      id: currentLivraison.id,
      livreurId,
      type: "LIVRAISON",
      etat: { notIn: [...CLOSED_DELIVERY_STATES] },
    },
    data: {
      etat: COMPLETED,
      deliveredAt: new Date(),
    },
  });

  if (result.count === 0) {
    throw new OrderRequestError(409, "Livraison déjà terminée ou indisponible");
  }

  notifyOrderDeliveryChanged();
  notifyOrderPreparationChanged();

  await awardLoyaltyPointsForCompletedOrder(currentLivraison.id);

  return await getCommandeForResponse(currentLivraison.id);
};
