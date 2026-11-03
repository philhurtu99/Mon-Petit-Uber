import stripe from "../config/stripe.config";
import { prisma } from "../lib/prisma";
import { getCartWithPromotions } from "./cart.service";
import { DELIVERY_FEE_CENTS } from "../config/payment.config";
import { calculateLoyaltyRedemption } from "./loyalty.service";

const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";

export type FulfillmentMode = "livraison" | "ramassage";

const toStripeCents = (amount: number) => Math.round(amount * 100);

const getRewardsCouponName = (creditUsed: number, loyaltyDiscount: number) => {
  const hasCredit = creditUsed > 0;
  const hasLoyaltyPoints = loyaltyDiscount > 0;

  if (hasCredit && hasLoyaltyPoints) return "Crédit client et points";
  if (hasCredit) return "Solde crédit";
  return "Carte de points";
};

// Crée une session Stripe Checkout avec le panier de l'utilisateur.
// Reçoit les choix applyCredit/applyLoyaltyPoints et relit les vrais soldes en DB.
// Stripe Checkout accepte un seul coupon; le rabais Stripe est donc combiné,
// mais les crédits et les points restent séparés dans les metadata et Transaction.
export const createCheckoutSession = async (
  userId: string,
  fulfillmentMode: FulfillmentMode = "livraison",
  applyCredit = false,
  applyLoyaltyPoints = false,
  loyaltyPointsToUse?: number,
  local?: string,
) => {
  const cart = await getCartWithPromotions({ userId });

  // Vérifier si le panier est vide
  if (!cart.items.length) {
    throw new Error("Panier Vide");
  }

  // Source de vérité du crédit client: on relit le solde en DB au lieu du frontend.
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { creditBalance: true, loyaltyPoints: true },
  });

  const availableCredit = user?.creditBalance ?? 0;
  const availablePoints = user?.loyaltyPoints ?? 0;
  const cartTotal = cart.items.reduce((sum, item) => sum + item.finalTotal, 0);
  const deliveryFee =
    fulfillmentMode === "livraison" ? DELIVERY_FEE_CENTS / 100 : 0;
  // Calcule le montant de crédit à utiliser pour cette commande.
  // Ces valeurs partent ensuite dans les metadata Stripe pour être relues à la finalisation.
  const originalTotal = Math.round((cartTotal + deliveryFee) * 100) / 100;
  // Calcule les récompenses de fidélité (points utilisés et montant de réduction) si appliqué.
  // fonctionne en calculant les points utilisés et le montant de réduction en fonction du solde de points et du total de la commande.
  const loyaltyRedemption = applyLoyaltyPoints
    ? calculateLoyaltyRedemption(
        availablePoints,
        originalTotal,
        loyaltyPointsToUse,
      )
    : { pointsUsed: 0, discount: 0 };
  // Calcule le sous-total après réduction de fidélité (en évitant les valeurs négatives).
  const subtotalAfterPoints = Math.max(
    originalTotal - loyaltyRedemption.discount,
    0,
  );
  // Calcule le montant de crédit utilisé pour cette commande (en évitant les valeurs négatives).
  // le montant de crédit utilisé est calculé en prenant le minimum entre le solde de crédit et le sous-total après réduction de fidélité.
  const creditUsed = applyCredit
    ? Math.min(availableCredit, subtotalAfterPoints)
    : 0;
  // Calcule le montant total à payer après réduction de crédit et de fidélité.
  // le montant de réduction est calculé en ajoutant le montant de crédit utilisé et le montant de réduction de fidélité.
  const stripeDiscountAmount = Math.round(
    (creditUsed + loyaltyRedemption.discount) * 100,
  ) / 100;
  // Calcule le montant final à payer en évitant les valeurs négatives.
  // le montant final est calculé en soustrayant le montant de réduction de crédit et de fidélité du sous-total après réduction de fidélité.
  const amountToPay =
    Math.round((originalTotal - stripeDiscountAmount) * 100) / 100;

  const lineItems = [
    ...cart.items.map((item) => ({
      price_data: {
        currency: "cad",
        product_data: {
          name:
            item.quantity > 1
              ? `${item.productName} x${item.quantity}`
              : item.productName,
        },
        unit_amount: toStripeCents(item.finalTotal),
      },
      quantity: 1,
    })),
    ...(cart.bonuses ?? []).map((bonus) => ({
      price_data: {
        currency: "cad",
        product_data: {
          name: `${bonus.bonusProductName} (gratuit)`,
        },
        unit_amount: 0,
      },
      quantity: bonus.bonusQuantity,
    })),
  ];

  if (fulfillmentMode === "livraison") {
    lineItems.push({
      price_data: {
        currency: "cad",
        product_data: { name: "Frais de livraison" },
        unit_amount: DELIVERY_FEE_CENTS,
      },
      quantity: 1,
    });
  }

  const discounts: { coupon: string }[] = [];

  if (stripeDiscountAmount > 0) {
    // Coupon technique unique requis par Stripe Checkout.
    // On crée un coupon temporaire pour appliquer le montant de réduction.
    // Le coupon est supprimé après une utilisation unique.
    // Il fusionne automatiquement avec les autres coupons de la session.
    const coupon = await stripe.coupons.create({
      amount_off: toStripeCents(stripeDiscountAmount),
      currency: "cad",
      duration: "once",
      name: getRewardsCouponName(creditUsed, loyaltyRedemption.discount),
    });

    discounts.push({ coupon: coupon.id });
  }

  // Crée la session Stripe. Les discounts appliquent le crédit et les metadata
  // seront relues par finalizeCheckout après le paiement Stripe.
  const sessionParams = {
    payment_method_types: ["card" as const],
    line_items: lineItems,
    ...(discounts.length > 0 ? { discounts } : {}),
    mode: "payment" as const,
    success_url: `${FRONTEND_URL}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${FRONTEND_URL}/checkout/cancel`,
    metadata: {
      userId,
      fulfillmentMode,
      originalTotal: String(originalTotal),
      creditUsed: String(creditUsed),
      loyaltyPointsUsed: String(loyaltyRedemption.pointsUsed),
      loyaltyDiscount: String(loyaltyRedemption.discount),
      amountToPay: String(amountToPay),
      ...(local ? { local } : {}),
    },

    invoice_creation: {
      enabled: true,
    },
  };

  const session = await stripe.checkout.sessions.create(sessionParams);

  return { url: session.url };
};
