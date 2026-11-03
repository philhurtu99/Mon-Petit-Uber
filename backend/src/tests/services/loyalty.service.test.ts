import { prismaMock } from "../prismaMock";
import { beforeEach, describe, expect, it, jest } from "@jest/globals";

jest.mock("../../services/loyaltyEvents.service", () => ({
  notifyUserLoyaltyPointsChanged: jest.fn(),
}));

import {
  awardLoyaltyPointsForCompletedOrder,
  calculateEarnedLoyaltyPoints,
  calculateLoyaltyRedemption,
  getUserLoyaltyPoints,
} from "../../services/loyalty.service";
import { notifyUserLoyaltyPointsChanged } from "../../services/loyaltyEvents.service";
import { LOYALTY_MAX_POINTS } from "../../config/loyalty.config";

describe("LoyaltyServiceTests", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Vérifie que seuls les paliers complets de 1000 points peuvent être convertis en rabais.
  it("CalculateLoyaltyRedemption_UsesOnlyFullThousandPointSteps", () => {
    const result = calculateLoyaltyRedemption(2500, 8.75);

    expect(result).toEqual({
      pointsUsed: 2000,
      discount: 2,
    });
  });

  // Vérifie qu'un solde sous 1000 points ne donne aucun rabais utilisable.
  it("CalculateLoyaltyRedemption_WhenBelowMinimum_ReturnsZero", () => {
    const result = calculateLoyaltyRedemption(999, 20);

    expect(result).toEqual({
      pointsUsed: 0,
      discount: 0,
    });
  });

  // Vérifie que le rabais en points ne dépasse pas les dollars entiers du total de commande.
  it("CalculateLoyaltyRedemption_CapsByWholeDollarOrderTotal", () => {
    const result = calculateLoyaltyRedemption(5000, 2.75);

    expect(result).toEqual({
      pointsUsed: 2000,
      discount: 2,
    });
  });

  // Vérifie qu'un nombre de points demandé est arrondi à la tranche de 1000 la plus proche.
  it("CalculateLoyaltyRedemption_WhenRequestedPointsProvided_UsesRequestedStepAmount", () => {
    const result = calculateLoyaltyRedemption(5000, 10, 2500);

    expect(result).toEqual({
      pointsUsed: 3000,
      discount: 3,
    });
  });

  // Vérifie que les points gagnés sont calculés à 10 points par dollar admissible.
  it("CalculateEarnedLoyaltyPoints_ReturnsTenPointsPerEligibleDollar", () => {
    expect(calculateEarnedLoyaltyPoints(20, 5, 2)).toBe(130);
  });

  // Vérifie que le calcul des points gagnés ne retourne jamais une valeur négative.
  it("CalculateEarnedLoyaltyPoints_NeverReturnsNegativePoints", () => {
    expect(calculateEarnedLoyaltyPoints(10, 20, 5)).toBe(0);
  });

  // Vérifie que le solde de points enregistré est retourné pour l'utilisateur.
  it("GetUserLoyaltyPoints_ReturnsStoredPoints", async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      loyaltyPoints: 1250,
    } as any);

    const result = await getUserLoyaltyPoints("user_1");

    expect(result).toBe(1250);
    expect(prismaMock.user.findUnique).toHaveBeenCalledWith({
      where: { id: "user_1" },
      select: { loyaltyPoints: true },
    });
  });

  // Vérifie que le service retourne null quand l'utilisateur est introuvable.
  it("GetUserLoyaltyPoints_WhenUserMissing_ReturnsNull", async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);

    await expect(getUserLoyaltyPoints("missing")).resolves.toBeNull();
  });

  // Vérifie qu'aucun point n'est attribué si la commande est introuvable.
  it("AwardLoyaltyPointsForCompletedOrder_WhenOrderMissing_ReturnsNull", async () => {
    prismaMock.commande.findUnique.mockResolvedValue(null);

    await expect(awardLoyaltyPointsForCompletedOrder(1)).resolves.toBeNull();
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });

  // Vérifie qu'une commande non complétée ne déclenche pas l'attribution des points.
  it("AwardLoyaltyPointsForCompletedOrder_WhenOrderNotComplete_ReturnsNull", async () => {
    prismaMock.commande.findUnique.mockResolvedValue({
      id: 1,
      etat: "IN_DELIVERY",
      loyaltyPointsAwarded: false,
      transaction: {
        id: 10,
        userId: "user_1",
        total: 20,
        creditUsed: 0,
        loyaltyDiscount: 0,
      },
    } as any);

    await expect(awardLoyaltyPointsForCompletedOrder(1)).resolves.toBeNull();
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });

  // Vérifie qu'une commande déjà récompensée ne peut pas attribuer des points une deuxième fois.
  it("AwardLoyaltyPointsForCompletedOrder_WhenAlreadyAwarded_ReturnsNull", async () => {
    prismaMock.commande.findUnique.mockResolvedValue({
      id: 1,
      etat: "COMPLETEE",
      loyaltyPointsAwarded: true,
      transaction: {
        id: 10,
        userId: "user_1",
        total: 20,
        creditUsed: 0,
        loyaltyDiscount: 0,
      },
    } as any);

    await expect(awardLoyaltyPointsForCompletedOrder(1)).resolves.toBeNull();
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });

  // Vérifie que les points sont ajoutés au client et que la commande est marquée comme récompensée.
  it("AwardLoyaltyPointsForCompletedOrder_AwardsPointsAndMarksOrder", async () => {
    prismaMock.commande.findUnique.mockResolvedValue({
      id: 1,
      etat: "COMPLETEE",
      loyaltyPointsAwarded: false,
      transaction: {
        id: 10,
        userId: "user_1",
        total: 20,
        creditUsed: 5,
        loyaltyDiscount: 2,
      },
    } as any);

    const tx = {
      commande: {
        updateMany: jest.fn(async (_args?: unknown) => ({ count: 1 })),
      },
      transaction: {
        update: jest.fn(async (_args?: unknown) => ({})),
      },
      user: {
        findUnique: jest.fn(async (_args?: unknown) => ({ loyaltyPoints: 0 })),
        update: jest.fn(async (_args?: unknown) => ({})),
      },
    };

    prismaMock.$transaction.mockImplementation(async (callback: any) =>
      callback(tx),
    );

    const result = await awardLoyaltyPointsForCompletedOrder(1);

    expect(tx.commande.updateMany).toHaveBeenCalledWith({
      where: {
        id: 1,
        etat: "COMPLETEE",
        loyaltyPointsAwarded: false,
      },
      data: {
        loyaltyPointsAwarded: true,
      },
    });
    expect(tx.transaction.update).toHaveBeenCalledWith({
      where: { id: 10 },
      data: { loyaltyPointsEarned: 130 },
    });
    expect(tx.user.update).toHaveBeenCalledWith({
      where: { id: "user_1" },
      data: {
        loyaltyPoints: 130,
      },
    });
    expect(result).toEqual({ userId: "user_1", pointsEarned: 130 });
    expect(notifyUserLoyaltyPointsChanged).toHaveBeenCalledWith("user_1");
  });

  // Vérifie qu'une course concurrente perdue n'ajoute pas de points en double.
  it("AwardLoyaltyPointsForCompletedOrder_WhenRaceLost_ReturnsNull", async () => {
    prismaMock.commande.findUnique.mockResolvedValue({
      id: 1,
      etat: "COMPLETEE",
      loyaltyPointsAwarded: false,
      transaction: {
        id: 10,
        userId: "user_1",
        total: 20,
        creditUsed: 0,
        loyaltyDiscount: 0,
      },
    } as any);

    const tx = {
      commande: {
        updateMany: jest.fn(async () => ({ count: 0 })),
      },
      transaction: {
        update: jest.fn(async () => ({})),
      },
      user: {
        findUnique: jest.fn(async () => ({ loyaltyPoints: 0 })),
        update: jest.fn(async () => ({})),
      },
    };

    prismaMock.$transaction.mockImplementation(async (callback: any) =>
      callback(tx),
    );

    await expect(awardLoyaltyPointsForCompletedOrder(1)).resolves.toBeNull();
    expect(tx.transaction.update).not.toHaveBeenCalled();
    expect(tx.user.update).not.toHaveBeenCalled();
    expect(notifyUserLoyaltyPointsChanged).not.toHaveBeenCalled();
  });

  // Vérifie que les points de fidélité sont répartis correctement lors d'une commande complétée proche de la capacité maximale.
  it("AwardLoyaltyPointsForCompletedOrder_WhenNearCap_AwardsOnlyRemainingPoints", async () => {
    prismaMock.commande.findUnique.mockResolvedValue({
      id: 1,
      etat: "COMPLETEE",
      loyaltyPointsAwarded: false,
      transaction: {
        id: 10,
        userId: "user_1",
        total: 20,
        creditUsed: 0,
        loyaltyDiscount: 0,
      },
    } as any);

    const tx = {
      commande: {
        updateMany: jest.fn(async (_args?: unknown) => ({ count: 1 })),
      },
      transaction: {
        update: jest.fn(async (_args?: unknown) => ({})),
      },
      user: {
        findUnique: jest.fn(async (_args?: unknown) => ({
          loyaltyPoints: LOYALTY_MAX_POINTS - 50,
        })),
        update: jest.fn(async (_args?: unknown) => ({})),
      },
    };

    prismaMock.$transaction.mockImplementation(async (callback: any) =>
      callback(tx),
    );

    const result = await awardLoyaltyPointsForCompletedOrder(1);

    expect(tx.transaction.update).toHaveBeenCalledWith({
      where: { id: 10 },
      data: { loyaltyPointsEarned: 50 },
    });
    expect(tx.user.update).toHaveBeenCalledWith({
      where: { id: "user_1" },
      data: { loyaltyPoints: LOYALTY_MAX_POINTS },
    });
    expect(result).toEqual({ userId: "user_1", pointsEarned: 50 });
  });
});
