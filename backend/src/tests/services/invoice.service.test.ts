import { describe, expect, it, jest } from "@jest/globals";
import { generateInvoicePDF, invoiceNumber } from "../../services/invoice.service";

describe("InvoiceService", () => {
  // Teste que le numéro de facture utilise l'année et l'ID de transaction formaté
  it("invoiceNumber_WhenTransactionProvided_ReturnsFormattedNumber", () => {
    const result = invoiceNumber({
      id: 145,
      purchaseDate: new Date("2026-05-04T12:00:00.000Z"),
    });

    expect(result).toBe("FACT-2026-000145");
  });

  // Teste que le service génère un PDF même si les données Stripe sont absentes
  it("generateInvoicePDF_WhenStripeDataMissing_ReturnsPdfBuffer", async () => {
    jest.spyOn(global, "fetch").mockResolvedValue({ ok: false } as any);

    const pdf = await generateInvoicePDF(
      {
        id: 145,
        purchaseDate: new Date("2026-05-04T12:00:00.000Z"),
        paidAt: new Date("2026-05-04T12:01:00.000Z"),
        total: 3,
        user: {
          firstName: "Allo",
          lastName: "Allo",
          email: "allo@example.com",
        },
        items: [
          {
            quantity: 3,
            price: 1,
            product: { name: "Banane" },
          },
        ],
      },
      null,
    );

    expect(Buffer.isBuffer(pdf)).toBe(true);
    expect(pdf.length).toBeGreaterThan(0);
  });
});
