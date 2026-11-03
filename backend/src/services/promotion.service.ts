import { prisma } from "../lib/prisma";
import { notifyConsentingUsers } from "./marketingNotification.service";

export interface CartItemWithPrice {
  productId: number;
  quantity: number;
  productName?: string;
  price?: number;
  finalPrice?: number;
}

export interface PromotionDiscount {
  productId: number;
  productName: string;
  quantity: number;
  unitPrice: number;
  originalTotal: number;
  finalTotal: number;
  savings: number;
  appliedPromotions: string[];
}

export interface PromotionalBonus {
  bonusProductId: number;
  bonusProductName: string;
  bonusQuantity: number;
  triggerProductId: number;
  triggerProductName: string;
  promotionName: string;
  bonusImageUrl?: string | undefined;
}

export interface CartCalculationResult {
  items: PromotionDiscount[];
  total: number;
  totalSavings: number;
  bonuses: PromotionalBonus[];
}

/**
 * Calcule le total du panier en appliquant les promotions actives
 */
export async function calculateCartTotal(
  cartItems: CartItemWithPrice[],
): Promise<CartCalculationResult> {
  if (!cartItems || cartItems.length === 0) {
    return {
      items: [],
      total: 0,
      totalSavings: 0,
      bonuses: [],
    };
  }

  // Récupérer tous les produits du panier
  const products = await prisma.product.findMany({
    where: {
      id: { in: cartItems.map((item) => item.productId) },
    },
  });

  const now = new Date();
  let total = 0;
  const cartSummary: PromotionDiscount[] = [];

  for (const cartItem of cartItems) {
    const product = products.find((p: any) => p.id === cartItem.productId);
    if (!product) continue;

    // Récupérer les promotions actives pour ce produit
    let promotions = await prisma.promotion.findMany({
      where: {
        targetProductId: product.id,
        isActive: true,
        endDate: { gt: now },
      },
    });

    // Filtrer côté JS pour gérer les startDate NULL
    promotions = promotions.filter(
      (p) => p.startDate === null || new Date(p.startDate) <= now,
    );

    // Calculer le prix réduit à la volée pour être sûr d'avoir la dernière valeur
    const baseUnitPrice =
      Math.round(product.price * (1 - (product.sale ?? 0) / 100) * 100) / 100;
    let itemTotal = baseUnitPrice * cartItem.quantity;
    const appliedPromos: string[] = [];

    // Appliquer les promotions "BUY_X_GET_Y"
    for (const promo of promotions) {
      if (promo.type === "BUY_X_GET_Y" && promo.quantity) {
        // Exemple: "3 pour 1" = achète 3, paie pour 1 (bonusQuantity=1)
        // Formule: (sets * bonusQuantity + remainder) * prix
        const sets = Math.floor(cartItem.quantity / promo.quantity);
        const remainder = cartItem.quantity % promo.quantity;
        const paidQuantity = sets * (promo.bonusQuantity || 1) + remainder;

        itemTotal = paidQuantity * baseUnitPrice;
        appliedPromos.push(
          `${promo.quantity} pour ${promo.bonusQuantity || 1}`,
        );
      }
    }

    total += itemTotal;
    cartSummary.push({
      productId: product.id,
      productName: product.name,
      quantity: cartItem.quantity,
      unitPrice: baseUnitPrice, // Affiche le prix déjà réduit (finalPrice)
      originalTotal: product.price * cartItem.quantity, // Garde le prix d'origine complet pour calculer les économies totales
      finalTotal: itemTotal,
      savings: product.price * cartItem.quantity - itemTotal,
      appliedPromotions: appliedPromos,
    });
  }

  // Récupérer les articles bonus gratuits
  const bonuses = await getPromotionalBonuses(cartItems);

  return {
    items: cartSummary,
    total,
    totalSavings: cartSummary.reduce((sum, item) => sum + item.savings, 0),
    bonuses,
  };
}

/**
 * Récupère les articles bonus gratuits applicables
 */
export async function getPromotionalBonuses(
  cartItems: CartItemWithPrice[],
): Promise<PromotionalBonus[]> {
  const bonuses: PromotionalBonus[] = [];
  const now = new Date();

  // Chercher TOUTES les promotions avec bonus (BUY_X_GET_Y et FREE_ITEM)
  let promotions = await prisma.promotion.findMany({
    where: {
      isActive: true,
      endDate: { gt: now },
      bonusProductId: { not: null }, // Doit avoir un produit bonus
    },
    include: {
      targetProduct: {
        select: {
          id: true,
          name: true,
        },
      },
      bonusProduct: {
        select: {
          id: true,
          name: true,
          imageUrl: true,
        },
      },
    },
  });

  // Filtrer côté JS pour gérer les startDate NULL
  promotions = promotions.filter(
    (p) => p.startDate === null || new Date(p.startDate) <= now,
  );

  for (const promo of promotions) {
    const targetInCart = cartItems.find(
      (item) => item.productId === promo.targetProductId,
    );

    if (!targetInCart) continue;
    if (!targetInCart.quantity || !promo.bonusProduct) continue;

    // Pour FREE_ITEM : l'article est offert quand la quantité requise est atteinte
    // Pour BUY_X_GET_Y : l'article est offert tous les X produits achetés
    let timesApplied = 0;
    
    if (promo.type === 'BUY_X_GET_Y' && promo.quantity) {
      // Calculer combien de fois la promotion s'applique
      // Ex: Si "3 achetés 1 offert" et quantity=6, alors 6÷3 = 2 fois
      timesApplied = Math.floor(targetInCart.quantity / promo.quantity);
    } else if (promo.type === 'FREE_ITEM') {
      const requiredQuantity = promo.quantity || 1;
      timesApplied = Math.floor(targetInCart.quantity / requiredQuantity);
    }

    const totalBonusQuantity = timesApplied * (promo.bonusQuantity || 1);

    if (totalBonusQuantity > 0) {
      bonuses.push({
        bonusProductId: promo.bonusProduct.id,
        bonusProductName: promo.bonusProduct.name,
        bonusQuantity: totalBonusQuantity,
        triggerProductId: promo.targetProductId,
        triggerProductName: promo.targetProduct.name,
        promotionName: promo.name,
        bonusImageUrl: promo.bonusProduct.imageUrl || undefined,
      });
    }
  }

  return bonuses;
}

/**
 * Récupère toutes les promotions actives
 */
export async function getActivePromotions() {
  const now = new Date();
  return await prisma.promotion
    .findMany({
      where: {
        isActive: true,
        endDate: { gt: now },
      },
      include: {
        targetProduct: {
          select: { id: true, name: true, price: true, finalPrice: true },
        },
        bonusProduct: {
          select: { id: true, name: true, price: true, finalPrice: true },
        },
      },
      orderBy: { endDate: "asc" },
    })
    .then((promotions) =>
      promotions.filter(
        (p) => p.startDate === null || new Date(p.startDate) <= now,
      ),
    );
}

/**
 * Récupère les promotions pour un produit spécifique
 */
export async function getPromotionsForProduct(productId: number) {
  const now = new Date();
  return await prisma.promotion
    .findMany({
      where: {
        OR: [{ targetProductId: productId }, { bonusProductId: productId }],
        isActive: true,
        endDate: { gt: now },
      },
      include: {
        targetProduct: {
          select: { id: true, name: true, price: true, finalPrice: true },
        },
        bonusProduct: {
          select: { id: true, name: true, price: true, finalPrice: true },
        },
      },
    })
    .then((promotions) =>
      promotions.filter(
        (p) => p.startDate === null || new Date(p.startDate) <= now,
      ),
    );
}

/**
 * Crée une promotion
 */
export async function createPromotion(data: {
  
  name: string;
  description?: string;
  type: "BUY_X_GET_Y" | "FREE_ITEM";
  targetProductId: number;
  bonusProductId?: number;
  quantity?: number;
  bonusQuantity?: number;
  startDate?: Date;
  endDate: Date;
})    
      
{
  if (
  data.quantity != null &&
  data.bonusQuantity != null &&
  data.bonusQuantity < data.quantity
) {
  throw new Error("bonusQuantity doit être strictement inférieur à quantity");
}
  const promotion = await prisma.promotion.create({
    data: {
      name: data.name,
      description: data.description || null,
      type: data.type,
      targetProductId: data.targetProductId,
      bonusProductId: data.bonusProductId || null,
      quantity: data.quantity || null,
      bonusQuantity: data.bonusQuantity || 1,
      startDate: data.startDate || new Date(),
      endDate: data.endDate,
      isActive: true,
    },
    include: {
      targetProduct: {
        select: { id: true, name: true, price: true, finalPrice: true },
      },
      bonusProduct: {
        select: { id: true, name: true, price: true, finalPrice: true },
      },
    },
  });
  // ─── Notification marketing en arrière-plan ───
  // 
  // On utilise "fire and forget" (pas de await) pour ne pas bloquer 
  // la réponse à l'admin. Les erreurs sont logguées dans le service 
  // de notification.
  notifyConsentingUsers({
    id: promotion.id,
    name: promotion.name,
    description: promotion.description,
    type: promotion.type as "BUY_X_GET_Y" | "FREE_ITEM",
    quantity: promotion.quantity,
    bonusQuantity: promotion.bonusQuantity,
    endDate: promotion.endDate,
    targetProduct: promotion.targetProduct,
    bonusProduct: promotion.bonusProduct,
  }).catch((err) => {
    console.error("Erreur lors de l'envoi des notifications marketing :", err);
  });

  return promotion;
}

/**
 * Met à jour une promotion
 */
export async function updatePromotion(
  id: number,
  data: Partial<{
    name: string;
    description: string;
    type: "BUY_X_GET_Y" | "FREE_ITEM";
    targetProductId: number;
    bonusProductId: number;
    quantity: number;
    bonusQuantity: number;
    startDate: Date;
    endDate: Date;
    isActive: boolean;
  }>,
) {
  return await prisma.promotion.update({
    where: { id },
    data: {
      ...(data.name && { name: data.name }),
      ...(data.description !== undefined && { description: data.description }),
      ...(data.type && { type: data.type }),
      ...(data.targetProductId && { targetProductId: data.targetProductId }),
      ...(data.bonusProductId !== undefined && {
        bonusProductId: data.bonusProductId,
      }),
      ...(data.quantity && { quantity: data.quantity }),
      ...(data.bonusQuantity && { bonusQuantity: data.bonusQuantity }),
      ...(data.startDate && { startDate: data.startDate }),
      ...(data.endDate && { endDate: data.endDate }),
      ...(data.isActive !== undefined && { isActive: data.isActive }),
    },
    include: {
      targetProduct: {
        select: { id: true, name: true, price: true, finalPrice: true },
      },
      bonusProduct: {
        select: { id: true, name: true, price: true, finalPrice: true },
      },
    },
  });
}

/**
 * Supprime une promotion
 */
export async function deletePromotion(id: number) {
  return await prisma.promotion.delete({
    where: { id },
  });
}

/**
 * Récupère toutes les promotions
 */
export async function getAllPromotions() {
  return await prisma.promotion.findMany({
    include: {
      targetProduct: {
        select: { id: true, name: true, price: true, finalPrice: true },
      },
      bonusProduct: {
        select: { id: true, name: true, price: true, finalPrice: true },
      },
    },
    orderBy: { endDate: "asc" },
  });
}

/**
 * Récupère une promotion par ID
 */
export async function getPromotionById(id: number) {
  return await prisma.promotion.findUnique({
    where: { id },
    include: {
      targetProduct: {
        select: { id: true, name: true, price: true, finalPrice: true },
      },
      bonusProduct: {
        select: { id: true, name: true, price: true, finalPrice: true },
      },
    },
  });
}

/**
 * Calcule le panier avec les promotions appliquées
 * Inclut le panier original et les détails des réductions
 */
export async function calculateCartWithPromotions(
  cartItems: Array<{ productId: number; quantity: number; product: any }>,
): Promise<{
  items: PromotionDiscount[];
  total: number;
  totalSavings: number;
  bonuses: PromotionalBonus[];
}> {
  if (!cartItems || cartItems.length === 0) {
    return {
      items: [],
      total: 0,
      totalSavings: 0,
      bonuses: [],
    };
  }

  // Récupérer les prix actuels du serveur
  const productIds = cartItems.map((item) => item.productId);
  const currentProducts = await prisma.product.findMany({
    where: { id: { in: productIds } },
  });

  // Préparer les items pour calculateCartTotal avec les prix actuels
  const itemsForCalc = cartItems.map((item) => {
    const currentProduct = currentProducts.find((p) => p.id === item.productId);
    return {
      productId: item.productId,
      quantity: item.quantity,
      productName: currentProduct?.name || item.product?.name,
      price: currentProduct?.price || item.product?.price,
      finalPrice:
        currentProduct?.finalPrice ||
        item.product?.finalPrice ||
        item.product?.price,
    };
  });

  return calculateCartTotal(itemsForCalc);
}
