import { prisma } from "../lib/prisma";
import type { Prisma } from "../../generated/prisma";

function getFinalPrice(price: number, sale?: number | null) {
  return calculateFinalPrice(price, sale ?? null);
}

/**
 * Calcule le prix final après rabais
 */
export const calculateFinalPrice = (price: number, sale: number | null) => {
  return Math.round(price * (1 - (sale ?? 0) / 100) * 100) / 100;
};

export const getProductbyId = async (id: number) => {
  const product = await prisma.product.findUnique({
    where: { id },
    include: {
      category: true,
      productReviews: {
        where: { isActive: true },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              profilePicture: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!product) return null;

  return {
    ...product,
    category: product.category?.name,
    categoryColor: product.category?.color,
  };
};

export const getAllProducts = async () => {
  const products = await prisma.product.findMany({
    include: { category: true },
  });

  return products.map((p) => ({
    ...p,
    category: p.category?.name,
    categoryColor: p.category?.color,
  }));
};

export const createProduct = async (data: any) => {
  if (!data || !data.name || data.name.trim().length < 2)
    throw new Error("Nom invalide");
  if (data.price <= 0) throw new Error("Le prix doit être supérieur à 0");
  if (data.stock < 0) throw new Error("Le stock ne peut pas être négatif");
  if (data.sale < 0 || data.sale > 90)
    throw new Error("Le rabais doit être entre 0 et 90");

  const existingProduct = await prisma.product.findFirst({
    where: {
      name: {
        equals: data.name,
        mode: "insensitive",
      },
    },
  });

  if (existingProduct) {
    throw new Error("Un produit avec ce nom existe déjà");
  }

  const productData: Prisma.ProductUncheckedCreateInput = {
    name: data.name,
    description: data.description,
    imageUrl: data.imageUrl,
    price: data.price,
    finalPrice: getFinalPrice(data.price, data.sale),
    sale: data.sale,
    idle: data.idle,
    isCooked: data.isCooked,
    stock: data.stock,
    categoryId: data.categoryId,
  };

  return await prisma.product.create({ data: productData });
};

export const updateProduct = async (id: number, data: any) => {
  if (!data || !data.name || data.name.trim().length < 2)
    throw new Error("Nom invalide");
  if (data.price <= 0) throw new Error("Le prix doit être supérieur à 0");
  if (data.stock < 0) throw new Error("Le stock ne peut pas être négatif");
  if (data.sale < 0 || data.sale > 90)
    throw new Error("Le rabais doit être entre 0 et 90");

  const existingProduct = await prisma.product.findFirst({
    where: {
      name: {
        equals: data.name,
        mode: "insensitive",
      },
      id: {
        not: id,
      },
    },
  });

  if (existingProduct) {
    throw new Error("Un produit avec ce nom existe déjà");
  }

  const productData: Prisma.ProductUncheckedUpdateInput = {
    name: data.name,
    description: data.description,
    imageUrl: data.imageUrl,
    price: data.price,
    finalPrice: getFinalPrice(data.price, data.sale),
    sale: data.sale,
    idle: data.idle,
    isCooked: data.isCooked,
    stock: data.stock,
    categoryId: data.categoryId,
  };

  return await prisma.product.update({
    where: { id },
    data: productData,
  });
};

export const deleteProduct = async (id: number) => {
  return await prisma.product.delete({ where: { id } });
};

export const updateProductDiscount = async (
  id: number,
  sale: number | null,
) => {
  if (sale !== null && (sale < 0 || sale > 90)) {
    throw new Error("Le rabais doit être entre 0 et 90");
  }

  const product = await prisma.product.findUnique({ where: { id } });
  if (!product) throw new Error("Produit non trouvé");

  const finalPrice = calculateFinalPrice(product.price, sale);

  return await prisma.product.update({
    where: { id },
    data: {
      sale,
      finalPrice,
    },
  });
};

/**
 * Récupère un produit par ID avec ses promotions actives
 */
export const getProductWithPromotions = async (id: number) => {
  const product = await prisma.product.findUnique({
    where: { id },
    include: {
      category: true,
    },
  });

  if (!product) return null;

  const now = new Date();
  const promotionsAsTarget = await prisma.promotion.findMany({
    where: {
      targetProductId: id,
      isActive: true,
      endDate: { gt: now },
    },
  });

  return {
    ...product,
    category: product.category?.name,
    categoryColor: product.category?.color,
    promotions: promotionsAsTarget,
  };
};

/**
 * Récupère tous les produits avec le nombre de promotions actives
 */
export const getAllProductsWithPromoCount = async () => {
  const products = await prisma.product.findMany({
    include: {
      category: true,
    },
  });

  const now = new Date();

  return Promise.all(
    products.map(async (p: any) => {
      const promoCount = await prisma.promotion.count({
        where: {
          OR: [{ targetProductId: p.id }, { bonusProductId: p.id }],
          isActive: true,
          endDate: { gt: now },
        },
      });

      return {
        ...p,
        category: p.category?.name,
        categoryColor: p.category?.color,
        activePromotionsCount: promoCount,
      };
    }),
  );
};

/**
 * Récupère les produits d'une catégorie
 */
export const getProductsByCategory = async (categoryId: number) => {
  const products = await prisma.product.findMany({
    where: { categoryId },
    include: { category: true },
  });

  return products.map((p: any) => ({
    ...p,
    category: p.category?.name,
    categoryColor: p.category?.color,
  }));
};

/**
 * Récupère les produits disponibles (non idle et en stock)
 */
export const getAvailableProducts = async () => {
  const products = await prisma.product.findMany({
    where: {
      idle: false,
      stock: { gt: 0 },
    },
    include: { category: true },
  });

  return products.map((p: any) => ({
    ...p,
    category: p.category?.name,
    categoryColor: p.category?.color,
  }));
};

/**
 * Recherche des produits par nom
 */
export const searchProducts = async (query: string) => {
  const products = await prisma.product.findMany({
    where: {
      name: {
        contains: query,
        mode: "insensitive",
      },
    },
    include: { category: true },
  });

  return products.map((p: any) => ({
    ...p,
    category: p.category?.name,
    categoryColor: p.category?.color,
  }));
};

/**
 * Récupère les produits en rupture de stock
 */
export const getOutOfStockProducts = async () => {
  return await prisma.product.findMany({
    where: { stock: { lte: 0 } },
    include: { category: true },
  });
};

/**
 * Met à jour le stock d'un produit
 */
export const updateProductStock = async (id: number, quantity: number) => {
  return await prisma.product.update({
    where: { id },
    data: { stock: quantity },
  });
};

/**
 * Augmente le stock d'un produit
 */
export const increaseProductStock = async (id: number, quantity: number) => {
  return await prisma.product.update({
    where: { id },
    data: { stock: { increment: quantity } },
  });
};

/**
 * Diminue le stock d'un produit
 */
export const decreaseProductStock = async (id: number, quantity: number) => {
  return await prisma.product.update({
    where: { id },
    data: { stock: { decrement: quantity } },
  });
};

/**
 * Récupère les produits avec réduction
 */
export const getDiscountedProducts = async () => {
  const products = await prisma.product.findMany({
    where: { sale: { gt: 0 } },
    include: { category: true },
  });

  return products.map((p: any) => ({
    ...p,
    category: p.category?.name,
    categoryColor: p.category?.color,
  }));
};

/**
 * Récupère les statistiques d'un produit
 */
export const getProductStats = async (id: number) => {
  const product = await prisma.product.findUnique({
    where: { id },
    include: {
      category: true,
    },
  });

  if (!product) return null;

  const now = new Date();
  const promotions = await prisma.promotion.findMany({
    where: {
      OR: [{ targetProductId: id }, { bonusProductId: id }],
      isActive: true,
      endDate: { gt: now },
    },
  });

  const cartItemsCount = await prisma.cartItem.aggregate({
    where: { productId: id },
    _sum: { quantity: true },
  });

  return {
    id: product.id,
    name: product.name,
    price: product.price,
    sale: product.sale,
    stock: product.stock,
    idle: product.idle,
    category: product.category?.name,
    totalInCarts: cartItemsCount._sum.quantity || 0,
    activePromotionsCount: promotions.length,
    activePromotions: promotions,
  };
};
