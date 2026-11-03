import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import type { Request } from "express";

// Variable mutable pour simuler STRIPE_WEBHOOK_SECRET entre les tests
let mockWebhookSecret: string | undefined = undefined;

jest.mock("../../services/checkout.service", () => ({
  createCheckoutSession: jest.fn(),
}));

jest.mock("../../services/transaction.service", () => ({
  createTransaction: jest.fn(),
  findTransactionByStripeSession: jest.fn(),
}));

jest.mock("../../services/cart.service", () => ({
  clearCart: jest.fn(),
  getCartWithPromotions: jest.fn(),
}));

// Mock Stripe avec un getter pour STRIPE_WEBHOOK_SECRET afin de pouvoir le changer entre les tests
jest.mock("../../config/stripe.config", () => ({
  __esModule: true,
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
  get STRIPE_WEBHOOK_SECRET() {
    return mockWebhookSecret;
  },
}));

jest.mock("../../lib/prisma", () => ({
  prisma: {
    product: {
      update: jest.fn(),
    },
  },
}));

import * as checkoutService from "../../services/checkout.service";
import * as transactionService from "../../services/transaction.service";
import * as cartService from "../../services/cart.service";
import stripe from "../../config/stripe.config";
import { prisma } from "../../lib/prisma";
import {
  handleCreateSession,
  handleConfirmSession,
  handleWebhook,
  handleCheckoutStatus,
} from "../../controllers/checkout.controller";

type MockReq = {
  session?: any;
  body?: any;
  query?: any;
  headers?: Record<string, string>;
};

const makeReqRes = (reqOverrides?: MockReq) => {
  const req = {
    session: {},
    body: {},
    query: {},
    headers: {},
    ...reqOverrides,
  } as unknown as Request;

  const res: any = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);

  return { req, res };
};

describe("CheckoutControllerTests", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockWebhookSecret = undefined;
  });

  // ─── handleCreateSession ─────────────────────────────────────────────────────

  describe("handleCreateSession", () => {
    // Vérifie qu'un utilisateur non connecté reçoit un 401
    it("HandleCreateSession_NoUserId_Returns401", async () => {
      const { req, res } = makeReqRes({ session: {} });

      await handleCreateSession(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: "Non connecté" });
    });

    // Vérifie qu'un mode de livraison invalide retourne un 400
    it("HandleCreateSession_InvalidFulfillmentMode_Returns400", async () => {
      const { req, res } = makeReqRes({
        session: { userId: "user_1" },
        body: { fulfillmentMode: "drone" },
      });

      await handleCreateSession(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: "Mode de livraison invalide",
      });
    });

    // Vérifie que le service est appelé avec "livraison" et que l'URL est retournée
    it("HandleCreateSession_ModeIsLivraison_CallsServiceAndReturnsUrl", async () => {
      (
        checkoutService.createCheckoutSession as unknown as jest.Mock<any>
      ).mockResolvedValue({ url: "https://stripe.test/session_123" });

      const { req, res } = makeReqRes({
        session: { userId: "user_1" },
        body: { fulfillmentMode: "livraison" },
      });

      await handleCreateSession(req, res);

      expect(checkoutService.createCheckoutSession).toHaveBeenCalledWith(
        "user_1",
        "livraison",
        false,
        false,
        undefined,
      );
      expect(res.json).toHaveBeenCalledWith({
        url: "https://stripe.test/session_123",
      });
    });

    // Vérifie qu'un local valide est normalisé, validé et transmis au service.
    it("HandleCreateSession_ModeIsLivraisonWithLocal_CallsServiceWithLocal", async () => {
      (
        checkoutService.createCheckoutSession as unknown as jest.Mock<any>
      ).mockResolvedValue({ url: "https://stripe.test/session_local" });

      const { req, res } = makeReqRes({
        session: { userId: "user_1" },
        body: { fulfillmentMode: "livraison", local: " c-025 " },
      });

      await handleCreateSession(req, res);

      expect(checkoutService.createCheckoutSession).toHaveBeenCalledWith(
        "user_1",
        "livraison",
        false,
        false,
        undefined,
        "C-025",
      );
      expect(res.json).toHaveBeenCalledWith({
        url: "https://stripe.test/session_local",
      });
    });

    // Vérifie qu'un local invalide retourne un 400 sans créer de session Stripe.
    it("HandleCreateSession_ModeIsLivraisonWithInvalidLocal_Returns400", async () => {
      const { req, res } = makeReqRes({
        session: { userId: "user_1" },
        body: { fulfillmentMode: "livraison", local: "Z-999" },
      });

      await handleCreateSession(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: "Local de livraison invalide",
      });
      expect(checkoutService.createCheckoutSession).not.toHaveBeenCalled();
    });

    // Vérifie que le service est appelé avec "ramassage" et que l'URL est retournée
    it("HandleCreateSession_ModeIsRamassage_CallsServiceAndReturnsUrl", async () => {
      (
        checkoutService.createCheckoutSession as unknown as jest.Mock<any>
      ).mockResolvedValue({ url: "https://stripe.test/session_456" });

      const { req, res } = makeReqRes({
        session: { userId: "user_1" },
        body: { fulfillmentMode: "ramassage" },
      });

      await handleCreateSession(req, res);

      expect(checkoutService.createCheckoutSession).toHaveBeenCalledWith(
        "user_1",
        "ramassage",
        false,
        false,
        undefined,
      );
      expect(res.json).toHaveBeenCalledWith({
        url: "https://stripe.test/session_456",
      });
    });

    // Vérifie que "livraison" est utilisé par défaut si fulfillmentMode est absent du body
    it("HandleCreateSession_NoFulfillmentModeInBody_DefaultsToLivraison", async () => {
      (
        checkoutService.createCheckoutSession as unknown as jest.Mock<any>
      ).mockResolvedValue({ url: "https://stripe.test/abc" });

      const { req, res } = makeReqRes({
        session: { userId: "user_1" },
        body: {},
      });

      await handleCreateSession(req, res);

      expect(checkoutService.createCheckoutSession).toHaveBeenCalledWith(
        "user_1",
        "livraison",
        false,
        false,
        undefined,
      );
    });

    // Vérifie qu'une session Google sans userId explicite utilise session.user.id
    it("HandleCreateSession_GoogleSessionUserIdFallback_CallsService", async () => {
      (
        checkoutService.createCheckoutSession as unknown as jest.Mock<any>
      ).mockResolvedValue({ url: "https://stripe.test/google" });

      const { req, res } = makeReqRes({
        session: { user: { id: "google_user_1" } },
        body: { fulfillmentMode: "livraison", applyCredit: true },
      });

      await handleCreateSession(req, res);

      expect(checkoutService.createCheckoutSession).toHaveBeenCalledWith(
        "google_user_1",
        "livraison",
        true,
        false,
        undefined,
      );
      expect(res.json).toHaveBeenCalledWith({
        url: "https://stripe.test/google",
      });
    });

    // Vérifie que le choix d'utiliser les points est transmis au service de checkout.
    it("HandleCreateSession_ApplyLoyaltyPointsTrue_CallsServiceWithPointsFlag", async () => {
      (
        checkoutService.createCheckoutSession as unknown as jest.Mock<any>
      ).mockResolvedValue({ url: "https://stripe.test/points" });

      const { req, res } = makeReqRes({
        session: { userId: "user_1" },
        body: {
          fulfillmentMode: "ramassage",
          applyCredit: false,
          applyLoyaltyPoints: true,
          loyaltyPointsToUse: 2000,
        },
      });

      await handleCreateSession(req, res);

      expect(checkoutService.createCheckoutSession).toHaveBeenCalledWith(
        "user_1",
        "ramassage",
        false,
        true,
        2000,
      );
      expect(res.json).toHaveBeenCalledWith({
        url: "https://stripe.test/points",
      });
    });

    // Vérifie qu'un nombre de points invalide retourne un 400 sans appeler le service.
    it("HandleCreateSession_InvalidLoyaltyPointsToUse_Returns400", async () => {
      const { req, res } = makeReqRes({
        session: { userId: "user_1" },
        body: {
          fulfillmentMode: "ramassage",
          applyLoyaltyPoints: true,
          loyaltyPointsToUse: -1000,
        },
      });

      await handleCreateSession(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: "Nombre de points invalide",
      });
      expect(checkoutService.createCheckoutSession).not.toHaveBeenCalled();
    });

    // Vérifie qu'une erreur du service retourne un 400 avec le message d'erreur
    it("HandleCreateSession_ServiceThrows_Returns400WithErrorMessage", async () => {
      (
        checkoutService.createCheckoutSession as unknown as jest.Mock<any>
      ).mockRejectedValue(new Error("Panier Vide"));

      const { req, res } = makeReqRes({
        session: { userId: "user_1" },
        body: { fulfillmentMode: "livraison" },
      });

      await handleCreateSession(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: "Panier Vide" });
    });
  });

  // ─── handleConfirmSession ─────────────────────────────────────────────────────

  describe("handleConfirmSession", () => {
    // Vérifie qu'un session_id manquant retourne un 400
    it("HandleConfirmSession_NoSessionId_Returns400", async () => {
      const { req, res } = makeReqRes({ query: {} });

      await handleConfirmSession(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: "session_id manquant" });
    });

    // Vérifie qu'un paiement non confirmé retourne un 400
    it("HandleConfirmSession_PaymentNotPaid_Returns400", async () => {
      (
        stripe.checkout.sessions.retrieve as unknown as jest.Mock<any>
      ).mockResolvedValue({
        id: "sess_123",
        payment_status: "unpaid",
      });

      const { req, res } = makeReqRes({ query: { session_id: "sess_123" } });

      await handleConfirmSession(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: "Paiement non confirmé",
      });
    });

    // Vérifie qu'une transaction déjà existante ne crée pas de doublon
    it("HandleConfirmSession_TransactionAlreadyExists_ReturnsAlreadyExistsTrue", async () => {
      (
        stripe.checkout.sessions.retrieve as unknown as jest.Mock<any>
      ).mockResolvedValue({
        id: "sess_123",
        payment_status: "paid",
        metadata: { userId: "user_1" },
        payment_intent: "pi_123",
        amount_total: 1000,
      });
      (
        transactionService.findTransactionByStripeSession as unknown as jest.Mock<any>
      ).mockResolvedValue({ id: 42 });

      const { req, res } = makeReqRes({ query: { session_id: "sess_123" } });

      await handleConfirmSession(req, res);

      expect(transactionService.createTransaction).not.toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({ ok: true, alreadyExists: true });
    });

    // Vérifie qu'une nouvelle session crée la transaction, décrémente le stock et vide le panier
    it("HandleConfirmSession_NewSession_CreatesTransactionDecrementsStockAndClearsCart", async () => {
      (
        stripe.checkout.sessions.retrieve as unknown as jest.Mock<any>
      ).mockResolvedValue({
        id: "sess_456",
        payment_status: "paid",
        metadata: { userId: "user_1", originalTotal: "20" },
        payment_intent: "pi_456",
        amount_total: 2000,
      });
      (
        transactionService.findTransactionByStripeSession as unknown as jest.Mock<any>
      ).mockResolvedValue(null);
      (
        cartService.getCartWithPromotions as unknown as jest.Mock<any>
      ).mockResolvedValue({
        items: [{ productId: 1, quantity: 2, unitPrice: 10 }],
      });
      (
        transactionService.createTransaction as unknown as jest.Mock<any>
      ).mockResolvedValue({});
      (prisma.product.update as unknown as jest.Mock<any>).mockResolvedValue({});
      (cartService.clearCart as unknown as jest.Mock<any>).mockResolvedValue(
        undefined,
      );

      const { req, res } = makeReqRes({ query: { session_id: "sess_456" } });

      await handleConfirmSession(req, res);

      expect(transactionService.createTransaction).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: "user_1",
          stripeSessionId: "sess_456",
          stripePaymentId: "pi_456",
          total: 20,
          items: [{ productId: 1, quantity: 2, price: 10 }],
        }),
      );
      expect(prisma.product.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { stock: { decrement: 2 } },
      });
      expect(cartService.clearCart).toHaveBeenCalledWith({ userId: "user_1" });
      expect(res.json).toHaveBeenCalledWith({ ok: true, alreadyExists: false });
    });

    // Vérifie qu'un userId absent des métadonnées Stripe retourne un 500
    it("HandleConfirmSession_NoUserIdInMetadata_Returns500", async () => {
      (
        stripe.checkout.sessions.retrieve as unknown as jest.Mock<any>
      ).mockResolvedValue({
        id: "sess_789",
        payment_status: "paid",
        metadata: {},
        payment_intent: "pi_789",
        amount_total: 1000,
      });
      (
        transactionService.findTransactionByStripeSession as unknown as jest.Mock<any>
      ).mockResolvedValue(null);

      const { req, res } = makeReqRes({ query: { session_id: "sess_789" } });

      await handleConfirmSession(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: "userId manquant" });
    });

    // Vérifie qu'une erreur de Stripe retourne un 500
    it("HandleConfirmSession_StripeThrows_Returns500", async () => {
      (
        stripe.checkout.sessions.retrieve as unknown as jest.Mock<any>
      ).mockRejectedValue(new Error("Stripe error"));

      const { req, res } = makeReqRes({ query: { session_id: "sess_err" } });

      await handleConfirmSession(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: "Stripe error" });
    });
  });

  // ─── handleCheckoutStatus ────────────────────────────────────────────────────

  describe("handleCheckoutStatus", () => {
    // Vérifie qu'un session_id manquant retourne un 400
    it("HandleCheckoutStatus_NoSessionId_Returns400", async () => {
      const { req, res } = makeReqRes({ query: {} });

      await handleCheckoutStatus(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: "session_id manquant" });
    });

    // Vérifie qu'une session payée retourne paid: true
    it("HandleCheckoutStatus_SessionPaid_ReturnsPaidTrue", async () => {
      (
        stripe.checkout.sessions.retrieve as unknown as jest.Mock<any>
      ).mockResolvedValue({
        id: "sess_paid",
        payment_status: "paid",
      });

      const { req, res } = makeReqRes({ query: { session_id: "sess_paid" } });

      await handleCheckoutStatus(req, res);

      expect(stripe.checkout.sessions.retrieve).toHaveBeenCalledWith(
        "sess_paid",
      );
      expect(res.json).toHaveBeenCalledWith({ paid: true });
    });

    // Vérifie qu'une session non payée retourne paid: false
    it("HandleCheckoutStatus_SessionUnpaid_ReturnsPaidFalse", async () => {
      (
        stripe.checkout.sessions.retrieve as unknown as jest.Mock<any>
      ).mockResolvedValue({
        id: "sess_unpaid",
        payment_status: "unpaid",
      });

      const { req, res } = makeReqRes({ query: { session_id: "sess_unpaid" } });

      await handleCheckoutStatus(req, res);

      expect(res.json).toHaveBeenCalledWith({ paid: false });
    });

    // Vérifie qu'une erreur de Stripe retourne un 500
    it("HandleCheckoutStatus_StripeThrows_Returns500", async () => {
      (
        stripe.checkout.sessions.retrieve as unknown as jest.Mock<any>
      ).mockRejectedValue(new Error("Stripe down"));

      const { req, res } = makeReqRes({ query: { session_id: "sess_err" } });

      await handleCheckoutStatus(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: "Stripe down" });
    });
  });

  // ─── handleWebhook ────────────────────────────────────────────────────────────

  describe("handleWebhook", () => {
    // Mode dev : STRIPE_WEBHOOK_SECRET est undefined, le body est parsé directement en JSON
    describe("Dev mode (sans secret Stripe)", () => {
      // Vérifie qu'un body JSON invalide retourne un 400
      it("HandleWebhook_InvalidJsonBody_Returns400", async () => {
        const { req, res } = makeReqRes({
          headers: {},
          body: Buffer.from("json invalide"),
        });

        await handleWebhook(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({ error: "Webhook invalide" });
      });

      // Vérifie qu'un événement non lié au checkout ne déclenche pas de finalisation
      it("HandleWebhook_NonCheckoutEvent_ReturnsReceivedWithoutFinalization", async () => {
        const event = {
          type: "payment_intent.created",
          data: { object: {} },
        };
        const { req, res } = makeReqRes({
          headers: {},
          body: Buffer.from(JSON.stringify(event)),
        });

        await handleWebhook(req, res);

        expect(
          transactionService.findTransactionByStripeSession,
        ).not.toHaveBeenCalled();
        expect(res.json).toHaveBeenCalledWith({ received: true });
      });

      // Vérifie que checkout.session.completed déclenche la création de transaction et vide le panier
      it("HandleWebhook_CheckoutSessionCompleted_CreatesTransactionAndClearsCart", async () => {
        (
          transactionService.findTransactionByStripeSession as unknown as jest.Mock<any>
        ).mockResolvedValue(null);
        (
          cartService.getCartWithPromotions as unknown as jest.Mock<any>
        ).mockResolvedValue({
          items: [{ productId: 1, quantity: 1, unitPrice: 5 }],
        });
        (
          transactionService.createTransaction as unknown as jest.Mock<any>
        ).mockResolvedValue({});
        (prisma.product.update as unknown as jest.Mock<any>).mockResolvedValue({});
        (cartService.clearCart as unknown as jest.Mock<any>).mockResolvedValue(
          undefined,
        );

        const event = {
          type: "checkout.session.completed",
          data: {
            object: {
              id: "sess_wh1",
              metadata: { userId: "user_wh" },
              payment_intent: "pi_wh1",
              amount_total: 500,
            },
          },
        };
        const { req, res } = makeReqRes({
          headers: {},
          body: Buffer.from(JSON.stringify(event)),
        });

        await handleWebhook(req, res);

        expect(transactionService.createTransaction).toHaveBeenCalled();
        expect(cartService.clearCart).toHaveBeenCalledWith({
          userId: "user_wh",
        });
        expect(res.json).toHaveBeenCalledWith({ received: true });
      });

      // Vérifie qu'une session déjà traitée ne crée pas de doublon
      it("HandleWebhook_AlreadyProcessedSession_SkipsCreation", async () => {
        (
          transactionService.findTransactionByStripeSession as unknown as jest.Mock<any>
        ).mockResolvedValue({ id: 1 });

        const event = {
          type: "checkout.session.completed",
          data: {
            object: {
              id: "sess_wh2",
              metadata: { userId: "user_wh" },
              payment_intent: "pi_wh2",
              amount_total: 500,
            },
          },
        };
        const { req, res } = makeReqRes({
          headers: {},
          body: Buffer.from(JSON.stringify(event)),
        });

        await handleWebhook(req, res);

        expect(transactionService.createTransaction).not.toHaveBeenCalled();
        expect(res.json).toHaveBeenCalledWith({ received: true });
      });
    });

    // Mode prod : STRIPE_WEBHOOK_SECRET est défini, la signature Stripe est vérifiée
    describe("Prod mode (avec secret Stripe)", () => {
      beforeEach(() => {
        mockWebhookSecret = "whsec_test";
      });

      // Vérifie qu'une signature Stripe invalide retourne un 400
      it("HandleWebhook_InvalidSignature_Returns400", async () => {
        (
          stripe.webhooks.constructEvent as unknown as jest.Mock<any>
        ).mockImplementation(() => {
          throw new Error("Invalid signature");
        });

        const { req, res } = makeReqRes({
          headers: { "stripe-signature": "bad_sig" },
          body: Buffer.from("payload"),
        });

        await handleWebhook(req, res);

        expect(stripe.webhooks.constructEvent).toHaveBeenCalledWith(
          expect.anything(),
          "bad_sig",
          "whsec_test",
        );
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({ error: "Webhook invalide" });
      });

      // Vérifie qu'une signature valide traite correctement l'événement checkout
      it("HandleWebhook_ValidSignature_CheckoutCompleted_ProcessesEvent", async () => {
        const event = {
          type: "checkout.session.completed",
          data: {
            object: {
              id: "sess_prod_1",
              metadata: { userId: "user_prod" },
              payment_intent: "pi_prod_1",
              amount_total: 1000,
            },
          },
        };
        (
          stripe.webhooks.constructEvent as unknown as jest.Mock<any>
        ).mockReturnValue(event);
        (
          transactionService.findTransactionByStripeSession as unknown as jest.Mock<any>
        ).mockResolvedValue(null);
        (
          cartService.getCartWithPromotions as unknown as jest.Mock<any>
        ).mockResolvedValue({
          items: [{ productId: 2, quantity: 1, unitPrice: 10 }],
        });
        (
          transactionService.createTransaction as unknown as jest.Mock<any>
        ).mockResolvedValue({});
        (prisma.product.update as unknown as jest.Mock<any>).mockResolvedValue({});
        (cartService.clearCart as unknown as jest.Mock<any>).mockResolvedValue(
          undefined,
        );

        const { req, res } = makeReqRes({
          headers: { "stripe-signature": "valid_sig" },
          body: Buffer.from("payload"),
        });

        await handleWebhook(req, res);

        expect(stripe.webhooks.constructEvent).toHaveBeenCalledWith(
          expect.anything(),
          "valid_sig",
          "whsec_test",
        );
        expect(transactionService.createTransaction).toHaveBeenCalled();
        expect(cartService.clearCart).toHaveBeenCalledWith({
          userId: "user_prod",
        });
        expect(res.json).toHaveBeenCalledWith({ received: true });
      });
    });
  });
});
