import { beforeEach, describe, expect, it, jest } from "@jest/globals";

jest.mock("../../lib/prisma", () => ({
  prisma: {
    commande: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      count: jest.fn(),
      updateMany: jest.fn(),
    },
  },
}));

jest.mock("../../services/orderEvents.service", () => ({
  notifyOrderDeliveryChanged: jest.fn(),
  notifyOrderPreparationChanged: jest.fn(),
}));

jest.mock("../../services/orders.service", () => {
  class MockOrderRequestError extends Error {
    status: number;

    constructor(status: number, message: string) {
      super(message);
      this.status = status;
    }
  }

  return {
    OrderRequestError: MockOrderRequestError,
  };
});

jest.mock("../../services/loyalty.service", () => ({
  awardLoyaltyPointsForCompletedOrder: jest.fn(),
}));

import { prisma } from "../../lib/prisma";
import {
  notifyOrderDeliveryChanged,
  notifyOrderPreparationChanged,
} from "../../services/orderEvents.service";
import { OrderRequestError } from "../../services/orders.service";
import { awardLoyaltyPointsForCompletedOrder } from "../../services/loyalty.service";
import {
  completeCurrentLivraisonForLivreur,
  getCurrentLivraisonForLivreur,
  getLivraisonAvailability,
  getLivraisonsAvailableForAssignment,
  requestLivraisonOrder,
  requestOldestLivraisonForLivreur,
} from "../../services/livraison.service";

// ============================================================================
// Helpers - mocks typés
// ============================================================================

type PrismaCommande = (typeof prisma)["commande"];

const mockedFindMany = prisma.commande.findMany as unknown as jest.MockedFunction<
  PrismaCommande["findMany"]
>;
const mockedFindFirst = prisma.commande.findFirst as unknown as jest.MockedFunction<
  PrismaCommande["findFirst"]
>;
const mockedFindUnique = prisma.commande.findUnique as unknown as jest.MockedFunction<
  PrismaCommande["findUnique"]
>;
const mockedCount = prisma.commande.count as unknown as jest.MockedFunction<
  PrismaCommande["count"]
>;
const mockedUpdateMany = prisma.commande.updateMany as unknown as jest.MockedFunction<
  PrismaCommande["updateMany"]
>;

const mockedNotifyOrderDeliveryChanged =
  notifyOrderDeliveryChanged as unknown as jest.MockedFunction<
    typeof notifyOrderDeliveryChanged
  >;
const mockedNotifyOrderPreparationChanged =
  notifyOrderPreparationChanged as unknown as jest.MockedFunction<
    typeof notifyOrderPreparationChanged
  >;

// ============================================================================
// Factories
// ============================================================================

const makeCommande = (overrides: any = {}) => ({
  id: overrides.id ?? 1,
  type: "LIVRAISON",
  etat: overrides.etat ?? "READY_FOR_DELIVERY",
  livreurId: overrides.livreurId ?? null,
  deliveryPickedUpAt: overrides.deliveryPickedUpAt ?? null,
  readyForPickupAt:
    overrides.readyForPickupAt ?? new Date("2026-05-06T10:00:00Z"),
  createdAt: overrides.createdAt ?? new Date("2026-05-06T09:00:00Z"),
  transaction: {
    user: { id: "user_1", email: "client@test.com" },
    items: [{ id: 1, quantity: 2, price: 10.5 }],
  },
  livreur: null,
  preparateur: null,
  ...overrides,
});

// ============================================================================
// Tests
// ============================================================================

describe("LivraisonServiceTests", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockedFindMany.mockReset();
    mockedFindFirst.mockReset();
    mockedFindUnique.mockReset();
    mockedCount.mockReset();
    mockedUpdateMany.mockReset();

    mockedNotifyOrderDeliveryChanged.mockReset();
    mockedNotifyOrderPreparationChanged.mockReset();
  });

  describe("getLivraisonsAvailableForAssignment", () => {
    it("ShouldReturnAvailableLivraisonsOrderedByReadyTimeAndCreatedAt", async () => {
      const commandes = [
        makeCommande({ id: 1, readyForPickupAt: new Date("2026-05-06T10:00:00Z") }),
        makeCommande({ id: 2, readyForPickupAt: new Date("2026-05-06T09:00:00Z") }),
      ];

      mockedFindMany.mockResolvedValue(commandes as any);

      const result = await getLivraisonsAvailableForAssignment();

      expect(prisma.commande.findMany).toHaveBeenCalledWith({
        where: {
          type: "LIVRAISON",
          etat: "READY_FOR_DELIVERY",
          livreurId: null,
        },
        include: expect.any(Object),
        orderBy: [{ readyForPickupAt: "asc" }, { createdAt: "asc" }],
      });
      expect(result).toEqual(commandes);
    });

    it("ShouldReturnEmptyArrayWhenNoLivraisonsAvailable", async () => {
      mockedFindMany.mockResolvedValue([] as any);

      const result = await getLivraisonsAvailableForAssignment();

      expect(result).toEqual([]);
    });
  });

  describe("getLivraisonAvailability", () => {
    it("ShouldReturnAvailableTrueWithCount", async () => {
      mockedCount.mockResolvedValue(3 as any);

      await expect(getLivraisonAvailability()).resolves.toEqual({
        available: true,
        count: 3,
      });
    });

    it("ShouldReturnAvailableFalseWhenNoLivraisonsAvailable", async () => {
      mockedCount.mockResolvedValue(0 as any);

      await expect(getLivraisonAvailability()).resolves.toEqual({
        available: false,
        count: 0,
      });
    });
  });

  describe("getCurrentLivraisonForLivreur", () => {
    it("ShouldReturnCurrentLivraisonForLivreur", async () => {
      const commande = makeCommande({
        id: 5,
        etat: "IN_DELIVERY",
        livreurId: "livreur_1",
      });

      mockedFindFirst.mockResolvedValue(commande as any);

      const result = await getCurrentLivraisonForLivreur("livreur_1");

      expect(prisma.commande.findFirst).toHaveBeenCalledWith({
        where: {
          type: "LIVRAISON",
          livreurId: "livreur_1",
          etat: { notIn: ["COMPLETEE", "ANNULEE"] },
        },
        include: expect.any(Object),
        orderBy: [{ readyForPickupAt: "asc" }, { createdAt: "asc" }],
      });
      expect(result).toEqual(commande);
    });

    it("ShouldThrowErrorWhenLivreurIdNotProvided", async () => {
      await expect(getCurrentLivraisonForLivreur("")).rejects.toThrow(
        expect.objectContaining({
          message: "Livreur non authentifié",
          status: 401,
        }),
      );
    });

    it("ShouldReturnNullWhenNoActiveLivraisonForLivreur", async () => {
      mockedFindFirst.mockResolvedValue(null as any);

      await expect(getCurrentLivraisonForLivreur("livreur_2")).resolves.toBeNull();
    });
  });

  describe("requestLivraisonOrder", () => {
    it("ShouldThrowErrorWhenLivreurIdNotProvided", async () => {
      await expect(requestLivraisonOrder("")).rejects.toThrow(
        expect.objectContaining({
          message: "Livreur non authentifié",
          status: 401,
        }),
      );
    });

    it("ShouldThrowErrorWhenLivreurAlreadyHasActiveLivraison", async () => {
      const existingLivraison = makeCommande({ id: 1, livreurId: "livreur_1" });

      mockedFindFirst
        .mockResolvedValueOnce(existingLivraison as any) // active livraison
        .mockResolvedValueOnce(null as any); // next available

      await expect(requestLivraisonOrder("livreur_1")).rejects.toThrow(
        expect.objectContaining({
          message: expect.stringContaining("déjà assigné à une livraison"),
          status: 409,
        }),
      );
    });

    it("ShouldAssignSpecificCommandeWhenIdProvided", async () => {
      const commande = makeCommande({ id: 42 });

      mockedFindFirst.mockResolvedValueOnce(null as any); // no active
      mockedUpdateMany.mockResolvedValueOnce({ count: 1 } as any);
      mockedFindUnique.mockResolvedValueOnce(commande as any);

      const result = await requestLivraisonOrder("livreur_1", 42);

      expect(prisma.commande.updateMany).toHaveBeenCalledWith({
        where: {
          id: 42,
          type: "LIVRAISON",
          etat: "READY_FOR_DELIVERY",
          livreurId: null,
        },
        data: {
          livreurId: "livreur_1",
          etat: "IN_DELIVERY",
          deliveryPickedUpAt: expect.any(Date),
        },
      });
      expect(notifyOrderDeliveryChanged).toHaveBeenCalled();
      expect(result).toEqual(commande);
    });

    it("ShouldThrowErrorWhenSpecificCommandeNotAvailable", async () => {
      mockedFindFirst.mockResolvedValueOnce(null as any);
      mockedUpdateMany.mockResolvedValueOnce({ count: 0 } as any);
      mockedFindUnique.mockResolvedValueOnce(null as any);

      await expect(requestLivraisonOrder("livreur_1", 999)).rejects.toThrow(
        expect.objectContaining({
          message: "Commande introuvable",
          status: 404,
        }),
      );
    });

    it("ShouldAssignOldestAvailableCommandeWhenNoIdProvided", async () => {
      const nextCommande = makeCommande({ id: 10 });

      mockedFindFirst
        .mockResolvedValueOnce(null as any) // no active
        .mockResolvedValueOnce({ id: 10 } as any); // next

      mockedUpdateMany.mockResolvedValueOnce({ count: 1 } as any);
      mockedFindUnique.mockResolvedValueOnce(nextCommande as any);

      const result = await requestLivraisonOrder("livreur_1");

      expect(notifyOrderDeliveryChanged).toHaveBeenCalled();
      expect(notifyOrderPreparationChanged).toHaveBeenCalled();
      expect(result).toEqual(nextCommande);
    });

    it("ShouldReturnNullWhenNoAvailableCommande", async () => {
      mockedFindFirst
        .mockResolvedValueOnce(null as any) // no active
        .mockResolvedValueOnce(null as any); // no next

      await expect(requestLivraisonOrder("livreur_1")).resolves.toBeNull();
    });

    it("ShouldRetryOnRaceConditionUntilSuccess", async () => {
      const commande = makeCommande({ id: 11 });

      mockedFindFirst
        .mockResolvedValueOnce(null as any)
        .mockResolvedValueOnce({ id: 11 } as any)
        .mockResolvedValueOnce({ id: 11 } as any)
        .mockResolvedValueOnce({ id: 11 } as any);

      mockedUpdateMany
        .mockResolvedValueOnce({ count: 0 } as any)
        .mockResolvedValueOnce({ count: 0 } as any)
        .mockResolvedValueOnce({ count: 1 } as any);

      mockedFindUnique.mockResolvedValueOnce(commande as any);

      const result = await requestLivraisonOrder("livreur_1");

      expect(result).toEqual(commande);
      expect(prisma.commande.updateMany).toHaveBeenCalledTimes(3);
    });

    it("ShouldThrowErrorAfter3FailedRetries", async () => {
      mockedFindFirst
        .mockResolvedValueOnce(null as any)
        .mockResolvedValueOnce({ id: 12 } as any)
        .mockResolvedValueOnce({ id: 12 } as any)
        .mockResolvedValueOnce({ id: 12 } as any);

      mockedUpdateMany
        .mockResolvedValueOnce({ count: 0 } as any)
        .mockResolvedValueOnce({ count: 0 } as any)
        .mockResolvedValueOnce({ count: 0 } as any);

      await expect(requestLivraisonOrder("livreur_1")).rejects.toThrow(
        expect.objectContaining({
          message: "Impossible d'assigner une commande pour le moment",
          status: 409,
        }),
      );
    });
  });

  describe("requestOldestLivraisonForLivreur", () => {
    it("ShouldCallRequestLivraisonOrderWithoutCommandeId", async () => {
      const commande = makeCommande({ id: 5 });

      mockedFindFirst
        .mockResolvedValueOnce(null as any)
        .mockResolvedValueOnce({ id: 5 } as any);
      mockedUpdateMany.mockResolvedValueOnce({ count: 1 } as any);
      mockedFindUnique.mockResolvedValueOnce(commande as any);

      const result = await requestOldestLivraisonForLivreur("livreur_1");

      expect(result).toEqual(commande);
    });
  });

  describe("completeCurrentLivraisonForLivreur", () => {

    it("ShouldThrowErrorWhenLivreurIdNotProvided", async () => {
      await expect(completeCurrentLivraisonForLivreur("", "")).rejects.toThrow(
        expect.objectContaining({
          message: "Livreur non authentifié",
          status: 401,

        }),
      );
    });

    it("ShouldThrowErrorWhenNoActiveLivraisonFound", async () => {
      mockedFindFirst.mockResolvedValueOnce(null as any);

      await expect(completeCurrentLivraisonForLivreur("livreur_1", "4321")).rejects.toThrow(
        expect.objectContaining({
          message: "Aucune livraison en cours",
          status: 404,
        }),
      );
    });

    it("ShouldCompleteCurrentLivraisonAndNotify", async () => {
      const commande = makeCommande({
        id: 15,
        etat: "IN_DELIVERY",
        livreurId: "livreur_1",
      });

      mockedFindFirst.mockResolvedValueOnce({ id: 15, codeConfirmation: "4321" } as any);
      mockedUpdateMany.mockResolvedValueOnce({ count: 1 } as any);
      mockedFindUnique.mockResolvedValueOnce(commande as any);

      const result = await completeCurrentLivraisonForLivreur("livreur_1", "4321");

      expect(prisma.commande.updateMany).toHaveBeenCalledWith({
        where: {
          id: 15,
          livreurId: "livreur_1",
          type: "LIVRAISON",
          etat: { notIn: ["COMPLETEE", "ANNULEE"] },
        },
        data: {
          etat: "COMPLETEE",
          deliveredAt: expect.any(Date),
        },
      });
      expect(notifyOrderDeliveryChanged).toHaveBeenCalled();
      expect(notifyOrderPreparationChanged).toHaveBeenCalled();
      expect(awardLoyaltyPointsForCompletedOrder).toHaveBeenCalledWith(15);
      expect(result).toEqual(commande);
    });

    it("ShouldThrowErrorWhenAlreadyCompleted", async () => {
      mockedFindFirst.mockResolvedValueOnce({ id: 20, codeConfirmation: "4321" } as any);
      mockedUpdateMany.mockResolvedValueOnce({ count: 0 } as any);

      await expect(completeCurrentLivraisonForLivreur("livreur_1", "4321")).rejects.toThrow(
        expect.objectContaining({
          message: "Livraison déjà terminée ou indisponible",
          status: 409,
        }),
      );
    });

    it("ShouldThrowErrorWhenConfirmationCodeIsInvalid", async () => {
      mockedFindFirst.mockResolvedValueOnce({ id: 15, codeConfirmation: "9999" } as any);

      await expect(completeCurrentLivraisonForLivreur("livreur_1", "1234")).rejects.toThrow(
        expect.objectContaining({
          message: "Code de confirmation invalide",
          status: 400,
        }),
      );
    });
  });
});
