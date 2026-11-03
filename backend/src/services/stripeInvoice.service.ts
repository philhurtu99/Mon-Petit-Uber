import stripe from "../config/stripe.config";

// Convertit un montant en centimes en une valeur décimale
function centsToAmount(value?: number | null) {
  if (value == null) return null;
  return value / 100;
}

// Récupère les données de facturation Stripe pour une transaction donnée
export async function getStripeInvoiceData(transaction: {
  stripeSessionId?: string | null;
  stripePaymentId?: string | null;
}) {
  if (!transaction.stripeSessionId && !transaction.stripePaymentId) {
    return null;
  }

  // Initialise les variables pour la session, le payment intent et les line items
  // Le payment intent c'est le paiement associé à la session ou à l'ID de paiement fourni
  // Les line items c'est les articles facturés
  let session: any = null;
  let paymentIntent: any = null;
  let lineItems: any[] = [];

  // Si stripeSessionId est fourni, récupère la session et les line items
  if (transaction.stripeSessionId) {
    session = await stripe.checkout.sessions.retrieve(
      transaction.stripeSessionId,
      {
        expand: ["invoice", "payment_intent.latest_charge"],
      },
    );

    // Récupère les line items de la session
    const stripeLineItems = await stripe.checkout.sessions.listLineItems(
      transaction.stripeSessionId,
      { limit: 100 },
    );

    lineItems = stripeLineItems.data;
    paymentIntent = session.payment_intent;
  }

  // Si stripePaymentId est fourni, récupère le payment intent
  if (!paymentIntent && transaction.stripePaymentId) {
    paymentIntent = await stripe.paymentIntents.retrieve(
      transaction.stripePaymentId,
      { expand: ["latest_charge"] },
    );
  }

  // Récupère l'invoice et le charge associés
  const invoice = typeof session?.invoice === "object" ? session.invoice : null;

  // Récupère le charge associé au payment intent
  const charge =
    typeof paymentIntent?.latest_charge === "object"
      ? paymentIntent.latest_charge
      : null;

  // Retourne les données de facturation
  return {
    provider: "Stripe",
    sessionId: session?.id || transaction.stripeSessionId,
    paymentIntentId: paymentIntent?.id || transaction.stripePaymentId,
    invoiceId: invoice?.id || null,
    hostedInvoiceUrl: invoice?.hosted_invoice_url || null,
    invoicePdfUrl: invoice?.invoice_pdf || null,
    receiptUrl: charge?.receipt_url || null,
    paymentStatus: session?.payment_status || paymentIntent?.status || null,
    paidAt: paymentIntent?.created
      ? new Date(paymentIntent.created * 1000)
      : null,
    currency: (
      session?.currency ||
      paymentIntent?.currency ||
      "cad"
    ).toUpperCase(),
    subtotal: centsToAmount(session?.amount_subtotal),
    total: centsToAmount(
      session?.amount_total ?? paymentIntent?.amount_received,
    ),
    lineItems: lineItems.map((item) => ({
      productName: item.description || "Article",
      quantity: Number(item.quantity || 1),
      unitPrice:
        item.quantity > 0
          ? centsToAmount(item.amount_total)! / item.quantity
          : 0,
      subtotal: centsToAmount(item.amount_total) ?? 0,
    })),
  };
}
