import { Router } from "express";
import { prisma } from "../lib/prisma";
import { generateInvoicePDF, invoiceNumber } from "../services/invoice.service";
import { getStripeInvoiceData } from "../services/stripeInvoice.service";

const router = Router();

router.get("/:orderId/invoice", async (req, res, next) => {
  try {
    const userId = (req.session as any).userId as string | undefined;
    const orderId = Number(req.params.orderId);

    if (!userId) {
      return res.status(401).json({
        message: "Non authentifié",
      });
    }

    if (!Number.isInteger(orderId)) {
      return res.status(400).json({
        message: "ID de commande invalide",
      });
    }

    const transaction = await prisma.transaction.findUnique({
      where: {
        id: orderId,
      },
      include: {
        user: true,
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    if (!transaction || transaction.userId !== userId) {
      return res.status(404).json({
        message: "Transaction non trouvée",
      });
    }

    if (!transaction.paidAt && !transaction.stripePaymentId) {
      return res.status(404).json({
        message: "Facture disponible uniquement pour les commandes payées",
      });
    }

    let stripeInvoiceData: Awaited<ReturnType<typeof getStripeInvoiceData>> =
      null;

    try {
      stripeInvoiceData = await getStripeInvoiceData(transaction);
    } catch (err: any) {
      console.error(
        `Impossible de récupérer les données Stripe pour transaction #${transaction.id}:`,
        err.message,
      );
    }

    const pdf = await generateInvoicePDF(transaction, stripeInvoiceData);

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `inline; filename="${invoiceNumber(transaction)}.pdf"`,
    );

    res.send(pdf);
  } catch (error) {
    next(error);
  }
});

export default router;
