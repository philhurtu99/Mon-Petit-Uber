import { prisma } from "../lib/prisma";
import { ORDER_EXPIRATION_MINUTES } from "../config/order.config";
import {
  notifyOrderPreparationChanged,
  notifyUserOrderExpired,
} from "./orderEvents.service";
import { notifyUserCreditChanged } from "./creditEvents.service";
import { notifyUserLoyaltyPointsChanged } from "./loyaltyEvents.service";
import { capLoyaltyPoints } from "./loyalty.service";

const ORDER_EXPIRATION_CANCEL_REASON = `Expiration automatique après ${ORDER_EXPIRATION_MINUTES} minutes`;

// Expire une commande non traitée si elle n'a pas été préparée dans le temps
export async function cancelUnclaimedPreparationOrder(
  commandeId: number,
  cancelReason: string,
  options: {
    userId?: string;
    requireExpired?: boolean;
    notifyExpired?: boolean;
  } = {},
) {
  const commande = await prisma.commande.findUnique({
    where: { id: commandeId },
    include: {
      transaction: {
        include: {
          items: true,
        },
      },
    },
  });

  if (!commande) return null;

  if (commande.etat !== "EN_PREPARATION") return null;
  if (commande.preparateurId !== null) return null;

  if (options.userId && commande.transaction.userId !== options.userId) {
    return null;
  }

  if (
    options.requireExpired &&
    (!commande.expiresAt || commande.expiresAt > new Date())
  ) {
    return null;
  }

  const result = await prisma.$transaction(async (tx) => {
    const updated = await tx.commande.updateMany({
      where: {
        id: commande.id,
        etat: "EN_PREPARATION",
        preparateurId: null,
      },
      data: {
        etat: "ANNULEE",
        cancelledAt: new Date(),
        cancelReason,
      },
    });

    if (updated.count === 0) return null;

    const user = await tx.user.findUnique({
      where: { id: commande.transaction.userId },
      select: { loyaltyPoints: true },
    });
    const loyaltyPointsUsed = commande.transaction.loyaltyPointsUsed ?? 0;
    const loyaltyDiscount = commande.transaction.loyaltyDiscount ?? 0;

    await tx.user.update({
      where: { id: commande.transaction.userId },
      data: {
        creditBalance: {
          increment: commande.transaction.total - loyaltyDiscount,
        },
        ...(loyaltyPointsUsed > 0 && {
          loyaltyPoints: capLoyaltyPoints(
            (user?.loyaltyPoints ?? 0) + loyaltyPointsUsed,
          ),
        }),
      },
    });

    // Met à jour le stock des produits
    // HL3 Confirmed
    await Promise.all(
      commande.transaction.items.map((item) =>
        tx.product.update({
          where: { id: item.productId },
          data: {
            stock: {
              increment: item.quantity,
            },
          },
        }),
      ),
    );

    return commande.id;
  });

  if (result) {
    clearOrderExpiration(commande.id);
    notifyOrderPreparationChanged();
    notifyUserCreditChanged(commande.transaction.userId);
    if (commande.transaction.loyaltyPointsUsed > 0) {
      notifyUserLoyaltyPointsChanged(commande.transaction.userId);
    }
    if (options.notifyExpired) {
      notifyUserOrderExpired({
        userId: commande.transaction.userId,
        orderId: commande.id,
      });
    }
  }

  return result;
}

export async function expireOrderIfUnclaimed(commandeId: number) {
  return cancelUnclaimedPreparationOrder(
    commandeId,
    ORDER_EXPIRATION_CANCEL_REASON,
    { requireExpired: true, notifyExpired: true },
  );
}

// Gère les timers d'expiration des commandes
const timers = new Map<number, NodeJS.Timeout>();

// Planifie l'expiration d'une commande
export function scheduleOrderExpiration(commandeId: number, expiresAt: Date) {
  const delay = expiresAt.getTime() - Date.now();

  if (timers.has(commandeId)) {
    clearTimeout(timers.get(commandeId));
  }

  // Crée un nouveau timer pour l'expiration de la commande
  const timeout = setTimeout(
    async () => {
      timers.delete(commandeId);

      try {
        await expireOrderIfUnclaimed(commandeId);
      } catch (error) {
        console.error(`Erreur expiration commande #${commandeId}:`, error);
      }
    },
    Math.max(delay, 0),
  );

  timeout.unref?.();
  timers.set(commandeId, timeout);
}

// Annule l'expiration d'une commande
export function clearOrderExpiration(commandeId: number) {
  const timeout = timers.get(commandeId);

  if (!timeout) return;

  clearTimeout(timeout);
  timers.delete(commandeId);
}

// Planifie l'expiration des commandes existantes
export async function scheduleExistingOrderExpirations() {
  const commandes = await prisma.commande.findMany({
    where: {
      etat: "EN_PREPARATION",
      preparateurId: null,
      expiresAt: {
        not: null,
      },
    },
    select: {
      id: true,
      expiresAt: true,
    },
  });

  for (const commande of commandes) {
    if (commande.expiresAt) {
      scheduleOrderExpiration(commande.id, commande.expiresAt);
    }
  }
}
