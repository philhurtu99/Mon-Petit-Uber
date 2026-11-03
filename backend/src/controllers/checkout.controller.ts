import { Request, Response } from "express";
import {
  createCheckoutSession,
  type FulfillmentMode,
} from "../services/checkout.service";
import {
  createTransaction,
  findTransactionByStripeSession,
} from "../services/transaction.service";
import { clearCart, getCartWithPromotions } from "../services/cart.service";
import stripe, { STRIPE_WEBHOOK_SECRET } from "../config/stripe.config";
import { prisma } from "../lib/prisma";
import { notifyUserCreditChanged } from "../services/creditEvents.service";
import { notifyUserLoyaltyPointsChanged } from "../services/loyaltyEvents.service";
import { isValidLocal, normalizeLocal } from "../services/locaux.service";

function getPaidUnitPrice(item: {
  quantity: number;
  unitPrice: number;
  finalTotal?: number;
}) {
  if (item.quantity <= 0) return 0;

  const paidTotal = item.finalTotal ?? item.unitPrice * item.quantity;
  return Math.round((paidTotal / item.quantity) * 100) / 100;
}

type CheckoutTransactionItem = {
  productId: number;
  quantity: number;
  price: number;
};

function mergeTransactionItems(items: CheckoutTransactionItem[]) {
  const itemsByProductId = new Map<number, CheckoutTransactionItem>();

  for (const item of items) {
    const existing = itemsByProductId.get(item.productId);

    if (!existing) {
      itemsByProductId.set(item.productId, { ...item });
      continue;
    }

    const totalQuantity = existing.quantity + item.quantity;
    const totalPaid =
      existing.price * existing.quantity + item.price * item.quantity;

    itemsByProductId.set(item.productId, {
      productId: item.productId,
      quantity: totalQuantity,
      price:
        totalQuantity > 0
          ? Math.round((totalPaid / totalQuantity) * 100) / 100
          : 0,
    });
  }

  return [...itemsByProductId.values()];
}

function isCheckoutPaid(paymentStatus?: string | null) {
  return paymentStatus === "paid" || paymentStatus === "no_payment_required";
}

// Finalise une session Stripe payée: relit les metadata creditUsed/originalTotal,
// crée la transaction, décrémente le crédit client, décrémente le stock puis vide le panier.
// Appelé par le webhook (prod) ou le endpoint /confirm (dev).
async function finalizeCheckout(session: any) {
  const existing = await findTransactionByStripeSession(session.id);
  if (existing) return { alreadyExists: true };

  const userId = session.metadata?.userId;
  if (!userId) throw new Error("userId manquant");
  const fulfillmentMode = (session.metadata?.fulfillmentMode ??
    "livraison") as FulfillmentMode;
  const local = session.metadata?.local || undefined;

  const cart = await getCartWithPromotions({ userId });
  const paidItems = cart.items.map((i) => ({
    productId: i.productId,
    quantity: i.quantity,
    price: getPaidUnitPrice(i),
  }));
  const bonusItems = (cart.bonuses ?? []).map((bonus) => ({
    productId: bonus.bonusProductId,
    quantity: bonus.bonusQuantity,
    price: 0,
  }));
  const items = mergeTransactionItems([...paidItems, ...bonusItems]);

  const originalTotal = Number(session.metadata?.originalTotal ?? 0);
  const creditUsed = Number(session.metadata?.creditUsed ?? 0);
  const loyaltyPointsUsed = Number(session.metadata?.loyaltyPointsUsed ?? 0);
  const loyaltyDiscount = Number(session.metadata?.loyaltyDiscount ?? 0);
  const stripeAmountPaid = (session.amount_total ?? 0) / 100;

  await createTransaction({
    userId,
    stripeSessionId: session.id,
    stripePaymentId:
      typeof session.payment_intent === "string"
        ? session.payment_intent
        : null,
    fulfillmentMode,
    local,
    items,
    total: originalTotal,
    creditUsed,
    loyaltyPointsUsed,
    loyaltyDiscount,
    stripeAmountPaid,
  });

  if (creditUsed > 0) {
    await prisma.user.update({
      where: { id: userId },
      data: {
        creditBalance: {
          decrement: creditUsed,
        },
      },
    });
    notifyUserCreditChanged(userId);
  }

  if (loyaltyPointsUsed > 0) {
    await prisma.user.update({
      where: { id: userId },
      data: {
        loyaltyPoints: {
          decrement: loyaltyPointsUsed,
        },
      },
    });
    notifyUserLoyaltyPointsChanged(userId);
  }

  await Promise.all(
    items.map((i) =>
      prisma.product.update({
        where: { id: i.productId },
        data: { stock: { decrement: i.quantity } },
      }),
    ),
  );

  await clearCart({ userId });
  return { alreadyExists: false };
}

// POST /api/checkout/create-session
// Reçoit applyCredit depuis le panier frontend et l'envoie à createCheckoutSession.
// createCheckoutSession relira ensuite le vrai creditBalance en DB avant de créer la session Stripe.
export const handleCreateSession = async (req: Request, res: Response) => {
  const session = req.session as any;
  const userId = (session.userId ?? session.user?.id) as string | undefined;
  const fulfillmentMode = (req.body?.fulfillmentMode ??
    "livraison") as FulfillmentMode;
  const applyCredit = req.body?.applyCredit === true;
  const applyLoyaltyPoints = req.body?.applyLoyaltyPoints === true;
  const rawLoyaltyPointsToUse = req.body?.loyaltyPointsToUse;
  const local =
    typeof req.body?.local === "string"
      ? normalizeLocal(req.body.local)
      : undefined;
  const loyaltyPointsToUse =
    rawLoyaltyPointsToUse === undefined
      ? undefined
      : Number(rawLoyaltyPointsToUse);

  if (!userId) {
    res.status(401).json({ error: "Non connecté" });
    return;
  }

  if (fulfillmentMode !== "livraison" && fulfillmentMode !== "ramassage") {
    res.status(400).json({ error: "Mode de livraison invalide" });
    return;
  }

  if (fulfillmentMode === "livraison" && local && !isValidLocal(local)) {
    res.status(400).json({ error: "Local de livraison invalide" });
    return;
  }

  if (
    loyaltyPointsToUse !== undefined &&
    (!Number.isInteger(loyaltyPointsToUse) || loyaltyPointsToUse < 0)
  ) {
    res.status(400).json({ error: "Nombre de points invalide" });
    return;
  }

  // crée une session de paiement Stripe en fonction du mode de livraison et du local
  // si le mode de livraison est "livraison" et qu'un local est spécifié, utilise la fonction avec le local
  // sinon, utilise la fonction sans le local
  try {
    const result =
      fulfillmentMode === "livraison" && local
        ? await createCheckoutSession(
            userId,
            fulfillmentMode,
            applyCredit,
            applyLoyaltyPoints,
            loyaltyPointsToUse,
            local,
          )
        : await createCheckoutSession(
            userId,
            fulfillmentMode,
            applyCredit,
            applyLoyaltyPoints,
            loyaltyPointsToUse,
          );
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
};

// GET /api/checkout/status?session_id=...
// Retourne l'état du paiement Stripe sans créer de transaction.
export const handleCheckoutStatus = async (req: Request, res: Response) => {
  const sessionId = (req.query as any).session_id as string | undefined;

  if (!sessionId) {
    res.status(400).json({ error: "session_id manquant" });
    return;
  }

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    res.json({ paid: isCheckoutPaid(session.payment_status) });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/checkout/confirm?session_id=...
// Confirme la session Stripe et crée la transaction si elle n'existe pas
// Utile en local (pas de webhook) et comme fallback en prod
export const handleConfirmSession = async (req: Request, res: Response) => {
  const sessionId = (req.query as any).session_id as string | undefined;

  if (!sessionId) {
    res.status(400).json({ error: "session_id manquant" });
    return;
  }

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (!isCheckoutPaid(session.payment_status)) {
      res.status(400).json({ error: "Paiement non confirmé" });
      return;
    }

    const result = await finalizeCheckout(session);
    res.json({ ok: true, ...result });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

// POST /api/checkout/webhook
// Gère les webhooks Stripe pour les sessions de checkout
export const handleWebhook = async (req: Request, res: Response) => {
  const sig = req.headers["stripe-signature"] as string;
  const webhookSecret = STRIPE_WEBHOOK_SECRET;

  let event;
  try {
    if (webhookSecret) {
      // Production : vérification de la signature Stripe
      event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
    } else {
      // Dev : pas de vérification, on parse directement le body
      event = JSON.parse(req.body.toString());
    }
  } catch {
    res.status(400).json({ error: "Webhook invalide" });
    return;
  }

  if (event.type === "checkout.session.completed") {
    await finalizeCheckout(event.data.object);
  }

  res.json({ received: true });
};
