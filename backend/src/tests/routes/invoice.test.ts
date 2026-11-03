import { prismaMock } from "../prismaMock";
import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import express from "express";
import request from "supertest";
import invoiceRoutes from "../../routes/invoice.routes";
import { generateInvoicePDF } from "../../services/invoice.service";
import { getStripeInvoiceData } from "../../services/stripeInvoice.service";

jest.mock("../../services/invoice.service", () => ({
  generateInvoicePDF: jest.fn(),
  invoiceNumber: jest.fn(() => "FACT-2026-000001"),
}));

jest.mock("../../services/stripeInvoice.service", () => ({
  getStripeInvoiceData: jest.fn(),
}));

let sessionUserId: string | undefined;

const app = express();
app.use(express.json());
app.use((req, _res, next) => {
  (req as any).session = { userId: sessionUserId };
  next();
});
app.use("/api/orders", invoiceRoutes);

const paidTransaction = {
  id: 1,
  userId: "user_1",
  purchaseDate: new Date("2026-05-04T12:00:00.000Z"),
  total: 10,
  stripeSessionId: "sess_123",
  stripePaymentId: "pi_123",
  paidAt: new Date("2026-05-04T12:01:00.000Z"),
  user: {
    id: "user_1",
    firstName: "Allo",
    lastName: "Allo",
    email: "allo@example.com",
    phone: null,
    address: null,
  },
  items: [
    {
      id: 1,
      transactionId: 1,
      productId: 10,
      quantity: 2,
      price: 5,
      product: {
        id: 10,
        name: "Banane",
        imageUrl: null,
        stock: 10,
      },
    },
  ],
} as any;

describe("InvoiceRoutes", () => {
  beforeEach(() => {
    sessionUserId = "user_1";
    jest.clearAllMocks();
  });

  // Teste que la route refuse le téléchargement si l'utilisateur n'est pas connecté
  it("GetInvoice_WhenUserNotAuthenticated_Returns401", async () => {
    sessionUserId = undefined;

    const response = await request(app).get("/api/orders/1/invoice");

    expect(response.status).toBe(401);
    expect(response.body).toEqual({ message: "Non authentifié" });
    expect(prismaMock.transaction.findUnique).not.toHaveBeenCalled();
  });

  // Teste que la route refuse un ID de commande qui n'est pas un nombre
  it("GetInvoice_WhenOrderIdInvalid_Returns400", async () => {
    const response = await request(app).get("/api/orders/abc/invoice");

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ message: "ID de commande invalide" });
    expect(prismaMock.transaction.findUnique).not.toHaveBeenCalled();
  });

  // Teste que la route retourne 404 quand la transaction n'existe pas
  it("GetInvoice_WhenTransactionNotFound_Returns404", async () => {
    prismaMock.transaction.findUnique.mockResolvedValue(null);

    const response = await request(app).get("/api/orders/999/invoice");

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ message: "Transaction non trouvée" });
  });

  // Teste que la route empêche un utilisateur de télécharger la facture d'un autre utilisateur
  it("GetInvoice_WhenTransactionBelongsToAnotherUser_Returns404", async () => {
    prismaMock.transaction.findUnique.mockResolvedValue({
      ...paidTransaction,
      userId: "user_2",
    });

    const response = await request(app).get("/api/orders/1/invoice");

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ message: "Transaction non trouvée" });
  });

  // Teste que la route refuse de générer une facture pour une transaction non payée
  it("GetInvoice_WhenTransactionIsNotPaid_Returns404", async () => {
    prismaMock.transaction.findUnique.mockResolvedValue({
      ...paidTransaction,
      paidAt: null,
      stripePaymentId: null,
    });

    const response = await request(app).get("/api/orders/1/invoice");

    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      message: "Facture disponible uniquement pour les commandes payées",
    });
  });

  // Teste que la route génère quand même un PDF local si Stripe retourne une erreur
  it("GetInvoice_WhenStripeFails_GeneratesPdfWithLocalData", async () => {
    const pdf = Buffer.from("%PDF local fallback");
    prismaMock.transaction.findUnique.mockResolvedValue(paidTransaction);
    (
      getStripeInvoiceData as jest.MockedFunction<typeof getStripeInvoiceData>
    ).mockRejectedValue(new Error("Stripe error"));
    (
      generateInvoicePDF as jest.MockedFunction<typeof generateInvoicePDF>
    ).mockResolvedValue(pdf);

    const response = await request(app).get("/api/orders/1/invoice");

    expect(response.status).toBe(200);
    expect(response.headers["content-type"]).toMatch(/application\/pdf/);
    expect(response.headers["content-disposition"]).toContain(
      'filename="FACT-2026-000001.pdf"',
    );
    expect(generateInvoicePDF).toHaveBeenCalledWith(paidTransaction, null);
  });

  // Teste que la route retourne un PDF quand la transaction est valide et appartient à l'utilisateur
  it("GetInvoice_WhenTransactionIsValid_ReturnsPdf", async () => {
    const pdf = Buffer.from("%PDF mocked");
    const stripeData = {
      currency: "CAD",
      invoiceId: "in_123",
      paymentIntentId: "pi_123",
      receiptUrl: "https://stripe.test/receipt",
      total: 10,
      lineItems: [],
    } as any;

    prismaMock.transaction.findUnique.mockResolvedValue(paidTransaction);
    (
      getStripeInvoiceData as jest.MockedFunction<typeof getStripeInvoiceData>
    ).mockResolvedValue(stripeData);
    (
      generateInvoicePDF as jest.MockedFunction<typeof generateInvoicePDF>
    ).mockResolvedValue(pdf);

    const response = await request(app).get("/api/orders/1/invoice");

    expect(response.status).toBe(200);
    expect(response.headers["content-type"]).toMatch(/application\/pdf/);
    expect(response.headers["content-disposition"]).toContain(
      'filename="FACT-2026-000001.pdf"',
    );
    expect(getStripeInvoiceData).toHaveBeenCalledWith(paidTransaction);
    expect(generateInvoicePDF).toHaveBeenCalledWith(paidTransaction, stripeData);
  });
});
