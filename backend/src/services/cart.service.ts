import { prisma } from "../lib/prisma";

export type CartIdentity = {
  userId?: string;
  guestId?: string;
};

export class CartError extends Error {
  code: "BAD_REQUEST" | "NOT_FOUND" | "CONFLICT";

  constructor(code: CartError["code"], message: string) {
    super(message);
    this.code = code;
  }
}

function assertCartIdentity(identity: CartIdentity) {
  if (!identity.userId && !identity.guestId) {
    throw new CartError("BAD_REQUEST", "userId ou guestId requis");
  }
}

async function findCartByIdentity(identity: CartIdentity) {
  if (identity.userId) {
    return prisma.cart.findFirst({ where: { userId: identity.userId } });
  }

  if (identity.guestId) {
    return prisma.cart.findFirst({ where: { guestId: identity.guestId } });
  }

  return null;
}

async function findCartWithItemsByIdentity(identity: CartIdentity) {
  if (identity.userId) {
    return prisma.cart.findFirst({
      where: { userId: identity.userId },
      include: {
        items: {
          orderBy: { id: "asc" },
          include: { product: true },
        },
      },
    });
  }

  if (identity.guestId) {
    return prisma.cart.findFirst({
      where: { guestId: identity.guestId },
      include: {
        items: {
          orderBy: { id: "asc" },
          include: { product: true },
        },
      },
    });
  }

  return null;
}

async function getOrCreateCart(identity: CartIdentity) {
  assertCartIdentity(identity);

  const existingCart = await findCartByIdentity(identity);
  if (existingCart) return existingCart;

  if (identity.userId) {
    return prisma.cart.create({ data: { userId: identity.userId } });
  }

  return prisma.cart.create({ data: { guestId: identity.guestId! } });
}

async function getRequiredCart(identity: CartIdentity) {
  assertCartIdentity(identity);

  const cart = await findCartByIdentity(identity);
  if (!cart) {
    throw new CartError("NOT_FOUND", "Panier introuvable");
  }

  return cart;
}

async function getRequiredCartItem(cartId: number, productId: number) {
  const item = await prisma.cartItem.findUnique({
    where: { cartId_productId: { cartId, productId } },
  });

  if (!item) {
    throw new CartError("NOT_FOUND", "Produit absent du panier");
  }

  return item;
}

export const addToCart = async (
  params: CartIdentity & {
    productId: number;
    quantity: number;
  },
) => {
  const { productId, quantity, ...identity } = params;

  if (!Number.isFinite(productId) || productId <= 0) {
    throw new CartError("BAD_REQUEST", "productId invalide");
  }

  if (!Number.isFinite(quantity) || quantity <= 0) {
    throw new CartError("BAD_REQUEST", "quantity invalide");
  }

  const product = await prisma.product.findUnique({ where: { id: productId } });

  if (!product) {
    throw new CartError("NOT_FOUND", "Produit introuvable");
  }

  if (product.idle) {
    throw new CartError("CONFLICT", "Produit indisponible");
  }

  const cart = await getOrCreateCart(identity);

  const existingItem = await prisma.cartItem.findUnique({
    where: { cartId_productId: { cartId: cart.id, productId } },
  });

  const existingQty = existingItem?.quantity ?? 0;
  const totalWanted = existingQty + quantity;

  if (totalWanted > product.stock) {
    throw new CartError(
      "CONFLICT",
      `Stock insuffisant: ${product.stock} disponible(s), ${existingQty} déjà au panier`,
    );
  }

  const item = await prisma.cartItem.upsert({
    where: { cartId_productId: { cartId: cart.id, productId } },
    update: { quantity: { increment: quantity } },
    create: { cartId: cart.id, productId, quantity },
  });

  return { cartId: cart.id, item };
};

export const getCart = async (identity: CartIdentity) => {
  if (!identity.userId && !identity.guestId) {
    return { cartId: null as number | null, items: [], count: 0 };
  }

  const cart = await findCartWithItemsByIdentity(identity);

  if (!cart) {
    return { cartId: null as number | null, items: [], count: 0 };
  }

  const count = cart.items.reduce((sum, item) => sum + item.quantity, 0);

  return {
    cartId: cart.id,
    items: cart.items,
    count,
  };
};

export const removeOneFromCart = async (
  params: CartIdentity & { productId: number },
) => {
  const { productId, ...identity } = params;

  const cart = await getRequiredCart(identity);
  const item = await getRequiredCartItem(cart.id, productId);

  if (item.quantity > 1) {
    await prisma.cartItem.update({
      where: { cartId_productId: { cartId: cart.id, productId } },
      data: { quantity: { decrement: 1 } },
    });
    return;
  }

  await prisma.cartItem.delete({
    where: { cartId_productId: { cartId: cart.id, productId } },
  });
};

export const removeItemFromCart = async (
  params: CartIdentity & { productId: number },
) => {
  const { productId, ...identity } = params;

  const cart = await getRequiredCart(identity);
  await getRequiredCartItem(cart.id, productId);

  await prisma.cartItem.delete({
    where: { cartId_productId: { cartId: cart.id, productId } },
  });
};

export const clearCart = async (identity: CartIdentity) => {
  const cart = await findCartByIdentity(identity);

  if (!cart) return;

  await prisma.cartItem.deleteMany({
    where: { cartId: cart.id },
  });
};

/**
 * Récupère le panier avec les promotions appliquées
 */
export const getCartWithPromotions = async (identity: CartIdentity) => {
  if (!identity.userId && !identity.guestId) {
    return {
      cartId: null as number | null,
      count: 0,
      items: [],
      total: 0,
      totalSavings: 0,
      bonuses: [],
    };
  }

  const cart = await findCartWithItemsByIdentity(identity);

  if (!cart) {
    return {
      cartId: null as number | null,
      count: 0,
      items: [],
      total: 0,
      totalSavings: 0,
      bonuses: [],
    };
  }

  const count = cart.items.reduce((sum, item) => sum + item.quantity, 0);

  // Importer et utiliser la fonction du service de promotion
  const { calculateCartWithPromotions } = await import("./promotion.service");

  const promotionData = await calculateCartWithPromotions(cart.items);

  return {
    cartId: cart.id,
    count,
    items: promotionData.items,
    total: promotionData.total,
    totalSavings: promotionData.totalSavings,
    bonuses: promotionData.bonuses,
  };
};
