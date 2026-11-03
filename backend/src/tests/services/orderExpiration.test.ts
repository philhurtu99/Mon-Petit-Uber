import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { prismaMock } from "../prismaMock";
import {
  cancelUnclaimedPreparationOrder,
  clearOrderExpiration,
  expireOrderIfUnclaimed,
  scheduleExistingOrderExpirations,
  scheduleOrderExpiration,
} from "../../services/orderExpiration.service";
import {
  notifyOrderPreparationChanged,
  notifyUserOrderExpired,
} from "../../services/orderEvents.service";
import { notifyUserCreditChanged } from "../../services/creditEvents.service";
import { notifyUserLoyaltyPointsChanged } from "../../services/loyaltyEvents.service";

jest.mock("../../services/orderEvents.service", () => ({
  notifyOrderPreparationChanged: jest.fn(),
  notifyUserOrderExpired: jest.fn(),
}));

jest.mock("../../services/creditEvents.service", () => ({
  notifyUserCreditChanged: jest.fn(),
}));

jest.mock("../../services/loyaltyEvents.service", () => ({
  notifyUserLoyaltyPointsChanged: jest.fn(),
}));

const mockedNotifyOrderPreparationChanged =
  notifyOrderPreparationChanged as jest.MockedFunction<
    typeof notifyOrderPreparationChanged
  >;
const mockedNotifyUserCreditChanged =
  notifyUserCreditChanged as jest.MockedFunction<typeof notifyUserCreditChanged>;
const mockedNotifyUserLoyaltyPointsChanged =
  notifyUserLoyaltyPointsChanged as jest.MockedFunction<
    typeof notifyUserLoyaltyPointsChanged
  >;
const mockedNotifyUserOrderExpired =
  notifyUserOrderExpired as jest.MockedFunction<typeof notifyUserOrderExpired>;

const makeExpiredCommande = (overrides: any = {}) => ({
  id: 10,
  etat: "EN_PREPARATION",
  preparateurId: null,
  expiresAt: new Date("2026-05-13T10:00:00Z"),
  transaction: {
    userId: "user_1",
    total: 42.5,
    loyaltyPointsUsed: 0,
    loyaltyDiscount: 0,
    items: [
      { productId: 1, quantity: 2 },
      { productId: 2, quantity: 3 },
    ],
  },
  ...overrides,
});

describe("OrderExpirationService", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2026-05-13T10:31:00Z").getTime());
    mockedNotifyOrderPreparationChanged.mockReset();
    mockedNotifyUserCreditChanged.mockReset();
    mockedNotifyUserLoyaltyPointsChanged.mockReset();
    mockedNotifyUserOrderExpired.mockReset();
  });

  // Vérifie qu'une commande expirée et non prise en charge est annulée, remboursée en crédit, puis remise en stock.
  it("expireOrderIfUnclaimed_WhenExpiredAndUnclaimed_CancelsOrderCreditsUserAndRestoresStock", async () => {
    const commande = makeExpiredCommande();
    const tx: any = {
      commande: { updateMany: jest.fn(async () => ({ count: 1 })) },
      user: {
        findUnique: jest.fn(async () => ({ loyaltyPoints: 0 })),
        update: jest.fn(async () => ({})),
      },
      product: { update: jest.fn(async () => ({})) },
    };

    prismaMock.commande.findUnique.mockResolvedValue(commande as any);
    prismaMock.$transaction.mockImplementation(async (callback: any) =>
      callback(tx),
    );

    const result = await expireOrderIfUnclaimed(commande.id);

    expect(result).toBe(commande.id);
    expect(tx.commande.updateMany).toHaveBeenCalledWith({
      where: {
        id: commande.id,
        etat: "EN_PREPARATION",
        preparateurId: null,
      },
      data: {
        etat: "ANNULEE",
        cancelledAt: expect.any(Date),
        cancelReason: "Expiration automatique après 30 minutes",
      },
    });
    expect(tx.user.update).toHaveBeenCalledWith({
      where: { id: "user_1" },
      data: { creditBalance: { increment: 42.5 } },
    });
    expect(tx.product.update).toHaveBeenCalledTimes(2);
    expect(tx.product.update).toHaveBeenNthCalledWith(1, {
      where: { id: 1 },
      data: { stock: { increment: 2 } },
    });
    expect(tx.product.update).toHaveBeenNthCalledWith(2, {
      where: { id: 2 },
      data: { stock: { increment: 3 } },
    });
    expect(mockedNotifyOrderPreparationChanged).toHaveBeenCalledTimes(1);
    expect(mockedNotifyUserCreditChanged).toHaveBeenCalledWith("user_1");
    expect(mockedNotifyUserLoyaltyPointsChanged).not.toHaveBeenCalled();
    expect(mockedNotifyUserOrderExpired).toHaveBeenCalledWith({
      userId: "user_1",
      orderId: commande.id,
    });
  });

  // Vérifie qu'une annulation manuelle d'une commande non prise en charge rembourse le client et restaure le stock.
  it("cancelUnclaimedPreparationOrder_WhenManualAndUnclaimed_CancelsOrderCreditsUserAndRestoresStock", async () => {
    const commande = makeExpiredCommande({
      expiresAt: new Date("2026-05-13T11:00:00Z"),
    });
    const tx: any = {
      commande: { updateMany: jest.fn(async () => ({ count: 1 })) },
      user: {
        findUnique: jest.fn(async () => ({ loyaltyPoints: 0 })),
        update: jest.fn(async () => ({})),
      },
      product: { update: jest.fn(async () => ({})) },
    };

    prismaMock.commande.findUnique.mockResolvedValue(commande as any);
    prismaMock.$transaction.mockImplementation(async (callback: any) =>
      callback(tx),
    );

    const result = await cancelUnclaimedPreparationOrder(
      commande.id,
      "Annulation manuelle par le client",
      { userId: "user_1" },
    );

    expect(result).toBe(commande.id);
    expect(tx.commande.updateMany).toHaveBeenCalledWith({
      where: {
        id: commande.id,
        etat: "EN_PREPARATION",
        preparateurId: null,
      },
      data: {
        etat: "ANNULEE",
        cancelledAt: expect.any(Date),
        cancelReason: "Annulation manuelle par le client",
      },
    });
    expect(tx.user.update).toHaveBeenCalledWith({
      where: { id: "user_1" },
      data: { creditBalance: { increment: 42.5 } },
    });
    expect(tx.product.update).toHaveBeenCalledTimes(2);
    expect(mockedNotifyOrderPreparationChanged).toHaveBeenCalledTimes(1);
    expect(mockedNotifyUserCreditChanged).toHaveBeenCalledWith("user_1");
    expect(mockedNotifyUserLoyaltyPointsChanged).not.toHaveBeenCalled();
    expect(mockedNotifyUserOrderExpired).not.toHaveBeenCalled();
  });

  // Vérifie que les points utilisés sont remis sur la carte de points lors d'une annulation.
  it("cancelUnclaimedPreparationOrder_WhenLoyaltyPointsWereUsed_RestoresPointsToCard", async () => {
    const commande = makeExpiredCommande({
      transaction: {
        userId: "user_1",
        total: 42.5,
        loyaltyPointsUsed: 2000,
        loyaltyDiscount: 2,
        items: [{ productId: 1, quantity: 2 }],
      },
    });
    const tx: any = {
      commande: { updateMany: jest.fn(async () => ({ count: 1 })) },
      user: {
        findUnique: jest.fn(async () => ({ loyaltyPoints: 1500 })),
        update: jest.fn(async () => ({})),
      },
      product: { update: jest.fn(async () => ({})) },
    };

    prismaMock.commande.findUnique.mockResolvedValue(commande as any);
    prismaMock.$transaction.mockImplementation(async (callback: any) =>
      callback(tx),
    );

    await expect(
      cancelUnclaimedPreparationOrder(
        commande.id,
        "Annulation manuelle par le client",
        { userId: "user_1" },
      ),
    ).resolves.toBe(commande.id);

    expect(tx.user.update).toHaveBeenCalledWith({
      where: { id: "user_1" },
      data: {
        creditBalance: { increment: 40.5 },
        loyaltyPoints: 3500,
      },
    });
    expect(mockedNotifyUserCreditChanged).toHaveBeenCalledWith("user_1");
    expect(mockedNotifyUserLoyaltyPointsChanged).toHaveBeenCalledWith("user_1");
  });

  // Vérifie qu'une commande payée seulement avec des points remet les points sans ajouter de crédit.
  it("cancelUnclaimedPreparationOrder_WhenPaidOnlyWithLoyaltyPoints_RestoresPointsWithoutCredit", async () => {
    const commande = makeExpiredCommande({
      transaction: {
        userId: "user_1",
        total: 2,
        creditUsed: 0,
        stripeAmountPaid: 0,
        loyaltyPointsUsed: 2000,
        loyaltyDiscount: 2,
        items: [{ productId: 1, quantity: 1 }],
      },
    });
    const tx: any = {
      commande: { updateMany: jest.fn(async () => ({ count: 1 })) },
      user: {
        findUnique: jest.fn(async () => ({ loyaltyPoints: 100 })),
        update: jest.fn(async () => ({})),
      },
      product: { update: jest.fn(async () => ({})) },
    };

    prismaMock.commande.findUnique.mockResolvedValue(commande as any);
    prismaMock.$transaction.mockImplementation(async (callback: any) =>
      callback(tx),
    );

    await cancelUnclaimedPreparationOrder(
      commande.id,
      "Annulation manuelle par le client",
      { userId: "user_1" },
    );

    expect(tx.user.update).toHaveBeenCalledWith({
      where: { id: "user_1" },
      data: {
        creditBalance: { increment: 0 },
        loyaltyPoints: 2100,
      },
    });
    expect(mockedNotifyUserLoyaltyPointsChanged).toHaveBeenCalledWith("user_1");
  });

  // Vérifie qu'une commande payée avec crédits et points remet les deux soldes correctement.
  it("cancelUnclaimedPreparationOrder_WhenPaidWithCreditAndLoyaltyPoints_RestoresBoth", async () => {
    const commande = makeExpiredCommande({
      transaction: {
        userId: "user_1",
        total: 10,
        creditUsed: 8,
        stripeAmountPaid: 0,
        loyaltyPointsUsed: 2000,
        loyaltyDiscount: 2,
        items: [{ productId: 1, quantity: 1 }],
      },
    });
    const tx: any = {
      commande: { updateMany: jest.fn(async () => ({ count: 1 })) },
      user: {
        findUnique: jest.fn(async () => ({ loyaltyPoints: 1500 })),
        update: jest.fn(async () => ({})),
      },
      product: { update: jest.fn(async () => ({})) },
    };

    prismaMock.commande.findUnique.mockResolvedValue(commande as any);
    prismaMock.$transaction.mockImplementation(async (callback: any) =>
      callback(tx),
    );

    await cancelUnclaimedPreparationOrder(
      commande.id,
      "Annulation manuelle par le client",
      { userId: "user_1" },
    );

    expect(tx.user.update).toHaveBeenCalledWith({
      where: { id: "user_1" },
      data: {
        creditBalance: { increment: 8 },
        loyaltyPoints: 3500,
      },
    });
  });

  // Vérifie qu'une commande payée par carte et points remet la portion carte en crédit et les points sur la carte.
  it("cancelUnclaimedPreparationOrder_WhenPaidWithCardAndLoyaltyPoints_RestoresCardAmountAsCreditAndPoints", async () => {
    const commande = makeExpiredCommande({
      transaction: {
        userId: "user_1",
        total: 10,
        creditUsed: 0,
        stripeAmountPaid: 8,
        loyaltyPointsUsed: 2000,
        loyaltyDiscount: 2,
        items: [{ productId: 1, quantity: 1 }],
      },
    });
    const tx: any = {
      commande: { updateMany: jest.fn(async () => ({ count: 1 })) },
      user: {
        findUnique: jest.fn(async () => ({ loyaltyPoints: 1500 })),
        update: jest.fn(async () => ({})),
      },
      product: { update: jest.fn(async () => ({})) },
    };

    prismaMock.commande.findUnique.mockResolvedValue(commande as any);
    prismaMock.$transaction.mockImplementation(async (callback: any) =>
      callback(tx),
    );

    await cancelUnclaimedPreparationOrder(
      commande.id,
      "Annulation manuelle par le client",
      { userId: "user_1" },
    );

    expect(tx.user.update).toHaveBeenCalledWith({
      where: { id: "user_1" },
      data: {
        creditBalance: { increment: 8 },
        loyaltyPoints: 3500,
      },
    });
  });

  // Vérifie qu'un utilisateur ne peut pas annuler une commande qui ne lui appartient pas.
  it("cancelUnclaimedPreparationOrder_WhenUserDoesNotOwnOrder_DoesNothing", async () => {
    prismaMock.commande.findUnique.mockResolvedValue(
      makeExpiredCommande({ transaction: { userId: "user_1", total: 42.5, items: [] } }) as any,
    );

    await expect(
      cancelUnclaimedPreparationOrder(10, "Annulation manuelle par le client", {
        userId: "other_user",
      }),
    ).resolves.toBeNull();

    expect(prismaMock.$transaction).not.toHaveBeenCalled();
    expect(mockedNotifyOrderPreparationChanged).not.toHaveBeenCalled();
    expect(mockedNotifyUserCreditChanged).not.toHaveBeenCalled();
    expect(mockedNotifyUserLoyaltyPointsChanged).not.toHaveBeenCalled();
    expect(mockedNotifyUserOrderExpired).not.toHaveBeenCalled();
  });

  // Vérifie qu'une commande dont l'expiration est future n'est pas annulée automatiquement.
  it("expireOrderIfUnclaimed_WhenExpiresAtIsFuture_DoesNothing", async () => {
    prismaMock.commande.findUnique.mockResolvedValue(
      makeExpiredCommande({
        expiresAt: new Date("2026-05-13T11:00:00Z"),
      }) as any,
    );

    await expect(expireOrderIfUnclaimed(10)).resolves.toBeNull();

    expect(prismaMock.$transaction).not.toHaveBeenCalled();
    expect(mockedNotifyOrderPreparationChanged).not.toHaveBeenCalled();
    expect(mockedNotifyUserCreditChanged).not.toHaveBeenCalled();
    expect(mockedNotifyUserOrderExpired).not.toHaveBeenCalled();
  });

  // Vérifie qu'une commande déjà prise en charge par un préparateur ne peut pas expirer automatiquement.
  it("expireOrderIfUnclaimed_WhenPreparateurExists_DoesNothing", async () => {
    prismaMock.commande.findUnique.mockResolvedValue(
      makeExpiredCommande({ preparateurId: "prep_1" }) as any,
    );

    await expect(expireOrderIfUnclaimed(10)).resolves.toBeNull();

    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });

  // Vérifie qu'une commande qui n'est plus en préparation n'est pas annulée par l'expiration.
  it("expireOrderIfUnclaimed_WhenEtatIsNotEnPreparation_DoesNothing", async () => {
    prismaMock.commande.findUnique.mockResolvedValue(
      makeExpiredCommande({ etat: "READY_FOR_PICKUP" }) as any,
    );

    await expect(expireOrderIfUnclaimed(10)).resolves.toBeNull();

    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });

  // Vérifie qu'une annulation concurrente échouée ne rembourse rien et n'envoie aucune notification.
  it("expireOrderIfUnclaimed_WhenConcurrentUpdateDoesNotMatch_DoesNotNotify", async () => {
    const tx: any = {
      commande: { updateMany: jest.fn(async () => ({ count: 0 })) },
      user: { findUnique: jest.fn(), update: jest.fn() },
      product: { update: jest.fn() },
    };

    prismaMock.commande.findUnique.mockResolvedValue(
      makeExpiredCommande() as any,
    );
    prismaMock.$transaction.mockImplementation(async (callback: any) =>
      callback(tx),
    );

    await expect(expireOrderIfUnclaimed(10)).resolves.toBeNull();

    expect(tx.user.update).not.toHaveBeenCalled();
    expect(tx.product.update).not.toHaveBeenCalled();
    expect(mockedNotifyOrderPreparationChanged).not.toHaveBeenCalled();
    expect(mockedNotifyUserCreditChanged).not.toHaveBeenCalled();
    expect(mockedNotifyUserLoyaltyPointsChanged).not.toHaveBeenCalled();
    expect(mockedNotifyUserOrderExpired).not.toHaveBeenCalled();
  });

  // Vérifie que le démarrage du serveur replanifie les expirations des commandes admissibles.
  it("scheduleExistingOrderExpirations_WhenServerStarts_SchedulesUnclaimedOrdersWithExpirationDate", async () => {
    jest.useFakeTimers();
    const expiresAt = new Date(Date.now() + 60_000);
    prismaMock.commande.findMany.mockResolvedValue([
      { id: 1, expiresAt },
      { id: 2, expiresAt: null },
    ] as any);

    await scheduleExistingOrderExpirations();

    expect(prismaMock.commande.findMany).toHaveBeenCalledWith({
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

    clearOrderExpiration(1);
  });

  // Vérifie que le timer d'expiration relit la commande lorsque le délai est atteint.
  it("scheduleOrderExpiration_WhenTimerElapses_ChecksIfOrderShouldExpire", async () => {
    jest.useFakeTimers();
    prismaMock.commande.findUnique.mockResolvedValue(null);

    scheduleOrderExpiration(50, new Date(Date.now() + 1000));
    await jest.advanceTimersByTimeAsync(1000);

    expect(prismaMock.commande.findUnique).toHaveBeenCalledWith({
      where: { id: 50 },
      include: {
        transaction: {
          include: {
            items: true,
          },
        },
      },
    });
  });
});
