import { prismaMock } from "../prismaMock";
import {
  createTransaction,
  findTransactionByStripeSession,
} from "../../services/transaction.service";
import { getOrderExpirationMs } from "../../config/order.config";
import { beforeEach, describe, expect, it, jest } from "@jest/globals";

jest.mock("../../services/orderEvents.service", () => ({
  notifyOrderPreparationChanged: jest.fn(),
}));

jest.mock("../../services/orderExpiration.service", () => ({
  scheduleOrderExpiration: jest.fn(),
}));

describe("StripeTransactionServiceTests", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.ORDER_EXPIRATION_SECONDS;
  });

  // ─── findTransactionByStripeSession ────────────────────────────────────────

  // Teste findTransactionByStripeSession quand aucune transaction n'existe pour la session
  it("findTransactionByStripeSession_WhenSessionNotFound_ReturnsNull", async () => {
    // Arrange
    prismaMock.transaction.findFirst.mockResolvedValue(null);

    // Act
    const result = await findTransactionByStripeSession("sess_unknown");

    // Assert
    expect(result).toBeNull();
    expect(prismaMock.transaction.findFirst).toHaveBeenCalledWith({
      where: { stripeSessionId: "sess_unknown" },
    });
  });

  // Teste findTransactionByStripeSession quand une transaction existe pour la session Stripe
  it("findTransactionByStripeSession_WhenSessionExists_ReturnsTransaction", async () => {
    // Arrange
    const transaction = {
      id: 1,
      userId: "user_1",
      stripeSessionId: "sess_123",
      stripePaymentId: "pi_123",
      total: 50,
      purchaseDate: new Date(),
      paidAt: new Date(),
    } as any;
    prismaMock.transaction.findFirst.mockResolvedValue(transaction);

    // Act
    const result = await findTransactionByStripeSession("sess_123");

    // Assert
    expect(result).toEqual(transaction);
    expect(prismaMock.transaction.findFirst).toHaveBeenCalledWith({
      where: { stripeSessionId: "sess_123" },
    });
  });

  // ─── createTransaction ─────────────────────────────────────────────────────

  it("getOrderExpirationMs_WhenEnvSecondsProvided_UsesConfiguredDuration", () => {
    process.env.ORDER_EXPIRATION_SECONDS = "10";

    expect(getOrderExpirationMs()).toBe(10_000);
  });

  // Teste createTransaction lorsqu'on passe les données du webhook Stripe
  it("createTransaction_WhenValidParams_CreatesTransactionWithItems", async () => {
    // Arrange
    const params = {
      userId: "user_1",
      stripeSessionId: "sess_456",
      stripePaymentId: "pi_456",
      total: 25.5,
      items: [
        { productId: 1, quantity: 2, price: 10 },
        { productId: 2, quantity: 1, price: 5.5 },
      ],
    };
    const created = { id: 99, ...params } as any;
    prismaMock.transaction.create.mockResolvedValue(created);

    // Act
    const result = await createTransaction(params);

    // Assert
    expect(result).toEqual(created);
    expect(prismaMock.transaction.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: "user_1",
        stripeSessionId: "sess_456",
        stripePaymentId: "pi_456",
        total: 25.5,
        items: { create: params.items },
        commande: {
          create: expect.objectContaining({
            type: "LIVRAISON",
            etat: "EN_PREPARATION",
            expiresAt: expect.any(Date),
          }),
        },
      }),
      include: {
        commande: {
          select: {
            id: true,
            type: true,
            expiresAt: true,
          },
        },
      },
    });
  });

  // Teste createTransaction lorsque la liste d'items est vide
  it("createTransaction_WhenItemsEmpty_CreatesTransactionWithEmptyItems", async () => {
    // Arrange
    const params = {
      userId: "user_2",
      stripeSessionId: "sess_empty",
      stripePaymentId: "pi_empty",
      total: 0,
      items: [],
    };
    const created = { id: 100, ...params } as any;
    prismaMock.transaction.create.mockResolvedValue(created);

    // Act
    const result = await createTransaction(params);

    // Assert
    expect(result).toEqual(created);
    expect(prismaMock.transaction.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: "user_2",
        stripeSessionId: "sess_empty",
        stripePaymentId: "pi_empty",
        total: 0,
        items: { create: [] },
        commande: {
          create: expect.objectContaining({
            type: "LIVRAISON",
            etat: "EN_PREPARATION",
            expiresAt: expect.any(Date),
          }),
        },
      }),
      include: {
        commande: {
          select: {
            id: true,
            type: true,
            expiresAt: true,
          },
        },
      },
    });
  });

  // Teste createTransaction lorsqu'un local de livraison est fourni
  it("createTransaction_WhenLivraisonLocalProvided_CreatesCommandeWithLocal", async () => {
    // Arrange
    const params = {
      userId: "user_local",
      stripeSessionId: "sess_local",
      stripePaymentId: "pi_local",
      total: 12,
      fulfillmentMode: "livraison" as const,
      local: "C-025",
      items: [{ productId: 1, quantity: 1, price: 12 }],
    };
    prismaMock.transaction.create.mockResolvedValue({ id: 101, ...params } as any);

    // Act
    await createTransaction(params);

    // Assert
    expect(prismaMock.transaction.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        commande: {
          create: expect.objectContaining({
            type: "LIVRAISON",
            local: "C-025",
          }),
        },
      }),
      include: {
        commande: {
          select: {
            id: true,
            type: true,
            expiresAt: true,
          },
        },
      },
    });
  });

  // Teste createTransaction définit purchaseDate et paidAt automatiquement
  it("createTransaction_SetsPurchaseDateAndPaidAt", async () => {
    // Arrange
    const params = {
      userId: "user_3",
      stripeSessionId: "sess_dates",
      stripePaymentId: "pi_dates",
      total: 12,
      items: [{ productId: 1, quantity: 1, price: 12 }],
    };
    prismaMock.transaction.create.mockResolvedValue({} as any);

    // Act
    await createTransaction(params);

    // Assert
    const callArg = prismaMock.transaction.create.mock.calls[0]![0] as any;
    expect(callArg.data.purchaseDate).toBeInstanceOf(Date);
    expect(callArg.data.paidAt).toBeInstanceOf(Date);
  });

  // Teste createTransaction propage l'erreur de Prisma
  it("createTransaction_WhenPrismaThrows_PropagatesError", async () => {
    // Arrange
    const params = {
      userId: "user_err",
      stripeSessionId: "sess_err",
      stripePaymentId: "pi_err",
      total: 10,
      items: [{ productId: 1, quantity: 1, price: 10 }],
    };
    prismaMock.transaction.create.mockRejectedValue(new Error("DB error"));

    // Act + Assert
    await expect(createTransaction(params)).rejects.toThrow("DB error");
  });
});
