import { prismaMock } from "../prismaMock";
import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import type { Request, Response } from "express";
import { EventEmitter } from "events";

jest.mock("../../services/cart.service", () => ({
  clearCart: jest.fn(),
  getCartWithPromotions: jest.fn(),
}));

jest.mock("../../services/transaction.service", () => ({
  createTransaction: jest.fn(),
  findTransactionByStripeSession: jest.fn(),
}));

jest.mock("../../config/stripe.config", () => ({
  __esModule: true,
  STRIPE_WEBHOOK_SECRET: undefined,
  default: {
    checkout: {
      sessions: {
        retrieve: jest.fn(),
      },
    },
    webhooks: {
      constructEvent: jest.fn(),
    },
  },
}));

jest.mock("../../services/creditEvents.service", () => {
  const { EventEmitter } = require("events");

  return {
    creditEvents: new EventEmitter(),
    USER_CREDIT_CHANGED: "user-credit-changed",
    notifyUserCreditChanged: jest.fn(),
  };
});

jest.mock("../../services/loyaltyEvents.service", () => ({
  notifyUserLoyaltyPointsChanged: jest.fn(),
}));

import { getCreditBalance, streamCreditBalance } from "../../controllers/user.controller";
import { handleConfirmSession } from "../../controllers/checkout.controller";
import stripe from "../../config/stripe.config";
import {
  creditEvents,
  notifyUserCreditChanged,
  USER_CREDIT_CHANGED,
} from "../../services/creditEvents.service";
import { notifyUserLoyaltyPointsChanged } from "../../services/loyaltyEvents.service";
import {
  clearCart,
  getCartWithPromotions,
} from "../../services/cart.service";
import {
  createTransaction,
  findTransactionByStripeSession,
} from "../../services/transaction.service";

const makeRes = () => {
  const res: Partial<Response> = {};
  res.status = jest.fn(() => res as Response) as any;
  res.json = jest.fn(() => res as Response) as any;
  return res as Response;
};

describe("CreditControllerTests", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Vérifie que le controller retourne le solde au frontend.
  it("GetCreditBalanceController_ReturnsCreditBalance", async () => {
    prismaMock.user.findUnique.mockResolvedValue({ creditBalance: 12.5 } as any);
    const req = { user: { id: "user_1" } } as unknown as Request;
    const res = makeRes();

    await getCreditBalance(req, res);

    expect(res.json).toHaveBeenCalledWith({ creditBalance: 12.5 });
  });

  // Vérifie que le controller retourne 404 si l'utilisateur n'existe pas.
  it("GetCreditBalanceController_UserNotFound_Returns404", async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);
    const req = { user: { id: "user_1" } } as unknown as Request;
    const res = makeRes();

    await getCreditBalance(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      message: "Utilisateur introuvable",
    });
  });

  // Vérifie que le stream SSE envoie le solde initial puis les mises à jour.
  it("StreamCreditBalance_WhenCreditChanges_PushesUpdatedBalance", async () => {
    prismaMock.user.findUnique
      .mockResolvedValueOnce({ creditBalance: 12.5 } as any)
      .mockResolvedValueOnce({ creditBalance: 18.75 } as any);

    const req = new EventEmitter() as unknown as Request;
    (req as any).user = { id: "user_1" };

    const res = {
      setHeader: jest.fn(),
      flushHeaders: jest.fn(),
      write: jest.fn(),
      end: jest.fn(),
    } as unknown as Response;

    await streamCreditBalance(req, res);

    expect(res.setHeader).toHaveBeenCalledWith(
      "Content-Type",
      "text/event-stream",
    );
    expect(res.write).toHaveBeenCalledWith("event: credit\n");
    expect(res.write).toHaveBeenCalledWith(
      `data: ${JSON.stringify({ creditBalance: 12.5 })}\n\n`,
    );

    creditEvents.emit(USER_CREDIT_CHANGED, "user_2");
    expect(prismaMock.user.findUnique).toHaveBeenCalledTimes(1);

    creditEvents.emit(USER_CREDIT_CHANGED, "user_1");
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(res.write).toHaveBeenCalledWith(
      `data: ${JSON.stringify({ creditBalance: 18.75 })}\n\n`,
    );

    req.emit("close");
    expect(res.end).toHaveBeenCalled();
  });

  // Vérifie que la finalisation déduit le crédit réellement utilisé.
  it("HandleConfirmSession_WithCreditUsed_DecrementsUserCreditBalance", async () => {
    (stripe.checkout.sessions.retrieve as unknown as jest.Mock<any>).mockResolvedValue({
      id: "sess_credit",
      payment_status: "paid",
      metadata: {
        userId: "user_1",
        fulfillmentMode: "ramassage",
        originalTotal: "10",
        creditUsed: "7",
      },
      payment_intent: "pi_credit",
      amount_total: 300,
    });
    (findTransactionByStripeSession as unknown as jest.Mock<any>).mockResolvedValue(null);
    (getCartWithPromotions as unknown as jest.Mock<any>).mockResolvedValue({
      items: [{ productId: 1, quantity: 1, unitPrice: 10 }],
      bonuses: [],
    });
    (createTransaction as unknown as jest.Mock<any>).mockResolvedValue({});
    prismaMock.user.update.mockResolvedValue({} as any);
    prismaMock.product.update.mockResolvedValue({} as any);
    (clearCart as unknown as jest.Mock<any>).mockResolvedValue(undefined);

    const req = {
      query: { session_id: "sess_credit" },
    } as unknown as Request;
    const res = makeRes();

    await handleConfirmSession(req, res);

    expect(createTransaction).toHaveBeenCalledWith(
      expect.objectContaining({
        total: 10,
        creditUsed: 7,
        stripeAmountPaid: 3,
      }),
    );
    expect(prismaMock.user.update).toHaveBeenCalledWith({
      where: { id: "user_1" },
      data: {
        creditBalance: {
          decrement: 7,
        },
      },
    });
    expect(notifyUserCreditChanged).toHaveBeenCalledWith("user_1");
    expect(res.json).toHaveBeenCalledWith({ ok: true, alreadyExists: false });
  });

  // Vérifie que la confirmation du paiement déduit les points réellement utilisés.
  it("HandleConfirmSession_WithLoyaltyPointsUsed_DecrementsUserLoyaltyPoints", async () => {
    (stripe.checkout.sessions.retrieve as unknown as jest.Mock<any>).mockResolvedValue({
      id: "sess_points",
      payment_status: "paid",
      metadata: {
        userId: "user_1",
        fulfillmentMode: "ramassage",
        originalTotal: "12",
        creditUsed: "0",
        loyaltyPointsUsed: "2000",
        loyaltyDiscount: "2",
      },
      payment_intent: "pi_points",
      amount_total: 1000,
    });
    (findTransactionByStripeSession as unknown as jest.Mock<any>).mockResolvedValue(null);
    (getCartWithPromotions as unknown as jest.Mock<any>).mockResolvedValue({
      items: [{ productId: 1, quantity: 1, unitPrice: 12 }],
      bonuses: [],
    });
    (createTransaction as unknown as jest.Mock<any>).mockResolvedValue({});
    prismaMock.user.update.mockResolvedValue({} as any);
    prismaMock.product.update.mockResolvedValue({} as any);
    (clearCart as unknown as jest.Mock<any>).mockResolvedValue(undefined);

    const req = {
      query: { session_id: "sess_points" },
    } as unknown as Request;
    const res = makeRes();

    await handleConfirmSession(req, res);

    expect(createTransaction).toHaveBeenCalledWith(
      expect.objectContaining({
        total: 12,
        creditUsed: 0,
        loyaltyPointsUsed: 2000,
        loyaltyDiscount: 2,
        stripeAmountPaid: 10,
      }),
    );
    expect(prismaMock.user.update).toHaveBeenCalledWith({
      where: { id: "user_1" },
      data: {
        loyaltyPoints: {
          decrement: 2000,
        },
      },
    });
    expect(notifyUserLoyaltyPointsChanged).toHaveBeenCalledWith("user_1");
  });
});
