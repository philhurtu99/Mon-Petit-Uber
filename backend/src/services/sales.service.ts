import { prisma } from "../lib/prisma";

export interface SalesFilter {
  startDate?: Date | undefined;
  endDate?: Date | undefined;
}

/**
 * Récupère les statistiques globales sur une période donnée
 */
export const getOverallStats = async (filter: SalesFilter) => {
  const { startDate, endDate } = filter;

  const transactions = await prisma.transaction.findMany({
    where: {
      purchaseDate: {
        ...(startDate && { gte: startDate }),
        ...(endDate && { lte: endDate }),
      },
    },
    select: {
      total: true,
      items: {
        select: {
          quantity: true,
        },
      },
    },
  });

  const totalRevenue = transactions.reduce((sum, t) => sum + t.total, 0);
  const totalOrders = transactions.length;
  const totalItemsSold = transactions.reduce(
    (sum, t) => sum + t.items.reduce((iSum, item) => iSum + item.quantity, 0),
    0,
  );
  const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

  return {
    totalRevenue,
    totalOrders,
    totalItemsSold,
    averageOrderValue,
  };
};

/**
 * Récupère les meilleurs produits vendus sur une période donnée
 */
export const getBestSellers = async (filter: SalesFilter, limit = 5) => {
  const { startDate, endDate } = filter;

  const sales = await prisma.transactionItem.groupBy({
    by: ["productId"],
    _sum: {
      quantity: true,
    },
    where: {
      transaction: {
        purchaseDate: {
          ...(startDate && { gte: startDate }),
          ...(endDate && { lte: endDate }),
        },
      },
    },
  });

  const productIds = sales.map((s) => s.productId);
  const products = await prisma.product.findMany({
    where: { id: { in: productIds } },
    select: {
      id: true,
      name: true,
      imageUrl: true,
      price: true,
    },
  });

  // Agréger par nom pour gérer les doublons de produits (même nom, ID différent)
  const aggregated = new Map<string, any>();

  for (const sale of sales) {
    const product = products.find((p) => p.id === sale.productId);
    const name = product?.name || "Produit inconnu";
    const existing = aggregated.get(name);
    const quantity = sale._sum.quantity || 0;
    const price = product?.price || 0;
    const revenue = price * quantity;

    if (existing) {
      existing.totalQuantity += quantity;
      existing.totalRevenue += revenue;
    } else {
      aggregated.set(name, {
        name,
        imageUrl: product?.imageUrl,
        price,
        totalQuantity: quantity,
        totalRevenue: revenue,
        productId: sale.productId,
      });
    }
  }

  const results = Array.from(aggregated.values())
    .sort((a, b) => b.totalQuantity - a.totalQuantity)
    .slice(0, limit);

  // Récupérer les notes pour ces produits (par nom)
  for (const item of results) {
    const relatedProducts = await prisma.product.findMany({
      where: { name: item.name },
      select: {
        productReviews: { select: { rating: true } },
      },
    });

    const allRatings = relatedProducts.flatMap((p) =>
      p.productReviews.map((r) => r.rating),
    );

    item.avgRating =
      allRatings.length > 0
        ? allRatings.reduce((a, b) => a + b, 0) / allRatings.length
        : 0;
    item.reviewCount = allRatings.length;
  }

  return results;
};

/**
 * Récupère la performance détaillée de TOUS les produits vendus
 */
export const getProductPerformance = async (filter: SalesFilter) => {
  const { startDate, endDate } = filter;

  const sales = await prisma.transactionItem.groupBy({
    by: ["productId"],
    _sum: {
      quantity: true,
    },
    where: {
      transaction: {
        purchaseDate: {
          ...(startDate && { gte: startDate }),
          ...(endDate && { lte: endDate }),
        },
      },
    },
  });

  const productIds = sales.map((s) => s.productId);
  const products = await prisma.product.findMany({
    where: { id: { in: productIds } },
    include: { category: true },
  });

  const aggregated = new Map<string, any>();

  for (const sale of sales) {
    const product = products.find((p) => p.id === sale.productId);
    const name = product?.name || "Inconnu";
    const existing = aggregated.get(name);
    const quantity = sale._sum.quantity || 0;
    const price = product?.price || 0;
    const revenue = price * quantity;

    if (existing) {
      existing.totalQuantity += quantity;
      existing.totalRevenue += revenue;
      existing.stock += product?.stock || 0;
    } else {
      aggregated.set(name, {
        productId: sale.productId,
        name,
        category: product?.category?.name || "Sans catégorie",
        unitPrice: price,
        totalQuantity: quantity,
        totalRevenue: revenue,
        stock: product?.stock || 0,
      });
    }
  }

  const results = Array.from(aggregated.values());

  // Récupérer les notes par nom
  for (const item of results) {
    const relatedProducts = await prisma.product.findMany({
      where: { name: item.name },
      select: {
        productReviews: { select: { rating: true } },
      },
    });

    const allRatings = relatedProducts.flatMap((p) =>
      p.productReviews.map((r) => r.rating),
    );

    item.avgRating =
      allRatings.length > 0
        ? allRatings.reduce((a, b) => a + b, 0) / allRatings.length
        : 0;
    item.reviewCount = allRatings.length;
  }

  return results;
};

/**
 * Génère un contenu CSV à partir des performances produits
 */
export const generateSalesExportCsv = async (filter: SalesFilter) => {
  const data = await getProductPerformance(filter);

  const headers = [
    "ID Produit",
    "Nom",
    "Catégorie",
    "Prix Unitaire",
    "Quantité Totale Vendue",
    "Chiffre d'Affaires",
    "Stock Restant",
    "Note Moyenne",
    "Nombre d'Avis",
  ];

  const escapeCsvValue = (val: any) => {
    if (val === null || val === undefined) return "";
    let s = String(val).replace(/"/g, '""');
    if (s.includes(",") || s.includes('"') || s.includes("\n")) {
      s = `"${s}"`;
    }
    return s;
  };

  const rows = data.map((item) =>
    [
      item.productId,
      item.name,
      item.category,
      item.unitPrice,
      item.totalQuantity,
      item.totalRevenue,
      item.stock,
      item.avgRating.toFixed(2),
      item.reviewCount,
    ]
      .map(escapeCsvValue)
      .join(","),
  );

  return [headers.join(","), ...rows].join("\n");
};
