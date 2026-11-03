import { prisma } from "../lib/prisma";
import { notifyUserLoyaltyPointsChanged } from "./loyaltyEvents.service";
import {
  LOYALTY_POINTS_PER_DOLLAR,
  LOYALTY_REDEMPTION_STEP_POINTS,
  LOYALTY_REDEMPTION_STEP_VALUE,
  LOYALTY_MAX_POINTS,
} from "../config/loyalty.config";

// Arrondit un montant à deux décimales
const roundMoney = (value: number) => Math.round(value * 100) / 100;

/**
 * Cap le nombre de points de fidélité à LOYALTY_MAX_POINTS
 * @param points - Nombre de points à cap
 * @returns Nombre de points capé
 */
export function capLoyaltyPoints(points: number) {
  return Math.min(Math.max(Math.trunc(points), 0), LOYALTY_MAX_POINTS);
}

/**
 * Calcule le nombre de points de fidélité restants avant le cap
 * @param currentPoints - Nombre de points actuel
 * @returns Nombre de points restants avant le cap
 */
export function getLoyaltyPointsUntilCap(currentPoints: number) {
  return Math.max(LOYALTY_MAX_POINTS - capLoyaltyPoints(currentPoints), 0);
}

/**
 * Calcule les points de fidélité à convertir en rabais sur une commande
 * @param availablePoints - Nombre de points disponibles
 * @param orderTotal - Total de la commande
 * @param requestedPoints - Nombre de points demandé par le client
 * @returns Points utilisés et rabais monétaire correspondant
 */
export function calculateLoyaltyRedemption(
  availablePoints: number,
  orderTotal: number,
  requestedPoints?: number,
) {
  const safePoints = capLoyaltyPoints(availablePoints);
  const safeTotal = Math.max(orderTotal, 0);
  const roundedRequestedPoints =
    requestedPoints === undefined
      ? safePoints
      : Math.round(
          Math.max(Math.trunc(requestedPoints), 0) /
            LOYALTY_REDEMPTION_STEP_POINTS,
        ) * LOYALTY_REDEMPTION_STEP_POINTS;
  const desiredPoints =
    requestedPoints === undefined
      ? safePoints
      : Math.min(roundedRequestedPoints, safePoints);

  const pointsByBalance =
    Math.floor(desiredPoints / LOYALTY_REDEMPTION_STEP_POINTS) *
    LOYALTY_REDEMPTION_STEP_POINTS;
  const pointsByTotal =
    Math.floor(safeTotal / LOYALTY_REDEMPTION_STEP_VALUE) *
    LOYALTY_REDEMPTION_STEP_POINTS;

  const pointsUsed = Math.min(pointsByBalance, pointsByTotal);

  return {
    pointsUsed,
    discount: roundMoney(
      (pointsUsed / LOYALTY_REDEMPTION_STEP_POINTS) *
        LOYALTY_REDEMPTION_STEP_VALUE,
    ),
  };
}

/**
 * Calcule les points de fidélité gagnés en fonction du total et des crédits utilisés
 * @param total - Total de la commande
 * @param creditUsed - Montant des crédits utilisés
 * @param loyaltyDiscount - Montant du remboursement de fidélité
 * @returns Nombre de points de fidélité gagnés
 */
export function calculateEarnedLoyaltyPoints(
  total: number,
  creditUsed = 0,
  loyaltyDiscount = 0,
) {
  const eligibleAmount = Math.max(total - creditUsed - loyaltyDiscount, 0);
  return Math.floor(roundMoney(eligibleAmount) * LOYALTY_POINTS_PER_DOLLAR);
}

/**
 * Récupère les points de fidélité d'un utilisateur
 * @param userId - ID de l'utilisateur
 * @returns Nombre de points de fidélité capé
 */
export async function getUserLoyaltyPoints(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { loyaltyPoints: true },
  });

  return user ? capLoyaltyPoints(user.loyaltyPoints) : null;
}

/**
 * Récompense les points de fidélité pour une commande complétée
 *
 * @param commandeId - ID de la commande
 * @returns Nombre de points de fidélité récompensés
 */
export async function awardLoyaltyPointsForCompletedOrder(commandeId: number) {
  const commande = await prisma.commande.findUnique({
    where: { id: commandeId },
    include: {
      transaction: {
        select: {
          id: true,
          userId: true,
          total: true,
          creditUsed: true,
          loyaltyDiscount: true,
        },
      },
    },
  });

  // Vérifie si la commande existe et est complétée
  if (!commande || commande.etat !== "COMPLETEE") return null;
  if (commande.loyaltyPointsAwarded) return null;

  // Calcule les points de fidélité gagnés avant le cap
  const earnedBeforeCap = calculateEarnedLoyaltyPoints(
    commande.transaction.total,
    commande.transaction.creditUsed,
    commande.transaction.loyaltyDiscount,
  );

  // Récompense les points de fidélité et met à jour la commande
  const awarded = await prisma.$transaction(async (tx) => {
    const updatedCommande = await tx.commande.updateMany({
      where: {
        id: commande.id,
        etat: "COMPLETEE",
        loyaltyPointsAwarded: false,
      },
      data: {
        loyaltyPointsAwarded: true,
      },
    });

    if (updatedCommande.count === 0) return null;

    // Récupère les points de fidélité de l'utilisateur
    const user = await tx.user.findUnique({
      where: { id: commande.transaction.userId },
      select: { loyaltyPoints: true },
    });
    // Calcule les points de fidélité à récompenser
    const pointsEarned = Math.min(
      earnedBeforeCap,
      getLoyaltyPointsUntilCap(user?.loyaltyPoints ?? LOYALTY_MAX_POINTS),
    );

    // Met à jour la transaction pour refléter les points de fidélité gagnés
    await tx.transaction.update({
      where: { id: commande.transaction.id },
      data: { loyaltyPointsEarned: pointsEarned },
    });

    if (pointsEarned > 0) {
      // Met à jour les points de fidélité de l'utilisateur
      await tx.user.update({
        where: { id: commande.transaction.userId },
        data: {
          loyaltyPoints: capLoyaltyPoints(
            (user?.loyaltyPoints ?? 0) + pointsEarned,
          ),
        },
      });
    }

    return {
      userId: commande.transaction.userId,
      pointsEarned,
    };
  });

  // Notifie l'utilisateur des changements de points de fidélité
  if (awarded) {
    notifyUserLoyaltyPointsChanged(awarded.userId);
  }

  return awarded;
}
