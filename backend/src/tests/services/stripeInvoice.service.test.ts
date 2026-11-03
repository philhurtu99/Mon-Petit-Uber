import { describe, expect, it, jest, beforeEach } from "@jest/globals";

const mockStripe = {
  checkout: {
    sessions: {
      retrieve: jest.fn<(...args: any[]) => Promise<any>>(),
      listLineItems: jest.fn<(...args: any[]) => Promise<any>>(),
    },
  },
  paymentIntents: {
    retrieve: jest.fn<(...args: any[]) => Promise<any>>(),
  },
};

jest.mock("../../config/stripe.config", () => ({
  __esModule: true,
  default: mockStripe,
}));

import { getStripeInvoiceData } from "../../services/stripeInvoice.service";

describe("StripeInvoiceService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Teste que le service retourne null quand la transaction n'a aucun identifiant Stripe
  it("getStripeInvoiceData_WhenNoStripeIds_ReturnsNull", async () => {
    const result = await getStripeInvoiceData({});

    expect(result).toBeNull();
    expect(mockStripe.checkout.sessions.retrieve).not.toHaveBeenCalled();
  });

  // Teste que le service récupère une session Stripe et normalise les données de facture
  it("getStripeInvoiceData_WhenSessionExists_ReturnsNormalizedData", async () => {
    mockStripe.checkout.sessions.retrieve.mockResolvedValue({
      id: "sess_123",
      invoice: {
        id: "in_123",
        hosted_invoice_url: "https://stripe.test/invoice",
        invoice_pdf: "https://stripe.test/invoice.pdf",
      },
      payment_intent: {
        id: "pi_123",
        created: 1777900000,
        amount_received: 300,
        currency: "cad",
        latest_charge: {
          id: "ch_123",
          receipt_url: "https://stripe.test/receipt",
        },
      },
      payment_status: "paid",
      currency: "cad",
      amount_subtotal: 300,
      amount_total: 300,
    } as any);
    mockStripe.checkout.sessions.listLineItems.mockResolvedValue({
      data: [
        {
          description: "Banane",
          quantity: 3,
          amount_total: 300,
        },
      ],
    } as any);

    const result = await getStripeInvoiceData({
      stripeSessionId: "sess_123",
      stripePaymentId: "pi_123",
    });

    expect(mockStripe.checkout.sessions.retrieve).toHaveBeenCalledWith(
      "sess_123",
      { expand: ["invoice", "payment_intent.latest_charge"] },
    );
    expect(mockStripe.checkout.sessions.listLineItems).toHaveBeenCalledWith(
      "sess_123",
      { limit: 100 },
    );
    expect(result).toEqual(
      expect.objectContaining({
        provider: "Stripe",
        sessionId: "sess_123",
        paymentIntentId: "pi_123",
        invoiceId: "in_123",
        invoicePdfUrl: "https://stripe.test/invoice.pdf",
        receiptUrl: "https://stripe.test/receipt",
        paymentStatus: "paid",
        currency: "CAD",
        subtotal: 3,
        total: 3,
        lineItems: [
          {
            productName: "Banane",
            quantity: 3,
            unitPrice: 1,
            subtotal: 3,
          },
        ],
      }),
    );
  });

  // Teste que le service peut récupérer les données avec seulement un paymentIntent Stripe
  it("getStripeInvoiceData_WhenOnlyPaymentId_RetrievesPaymentIntent", async () => {
    mockStripe.paymentIntents.retrieve.mockResolvedValue({
      id: "pi_only",
      created: 1777900000,
      amount_received: 1250,
      currency: "cad",
      status: "succeeded",
      latest_charge: {
        receipt_url: "https://stripe.test/receipt-only",
      },
    } as any);

    const result = await getStripeInvoiceData({
      stripePaymentId: "pi_only",
    });

    expect(mockStripe.paymentIntents.retrieve).toHaveBeenCalledWith("pi_only", {
      expand: ["latest_charge"],
    });
    expect(result).toEqual(
      expect.objectContaining({
        paymentIntentId: "pi_only",
        total: 12.5,
        currency: "CAD",
        receiptUrl: "https://stripe.test/receipt-only",
      }),
    );
  });
});
