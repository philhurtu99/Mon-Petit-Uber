import { prisma } from "../lib/prisma";


/**
 * service qui retourne les donnes globales et par livraison d'un livreur pour son dashboard
 * @param employeeId 
 * @returns 
 */

export const getLivreurDashboard = async (employeeId: string) => {
  const commandes = await prisma.commande.findMany({
    where: {
      livreurId: employeeId,
      etat: "COMPLETEE",
      type: "LIVRAISON",
    },
    orderBy: { deliveredAt: "desc" },
    select: {
      id: true,
      createdAt: true,
      deliveryPickedUpAt: true,
      deliveredAt: true,
      employeeReview: {
        select: {
          rating: true,
        },
      },
    },
  });

  const totalOrders = commandes.length;

  const ordersWithDuration = commandes.filter(
    (c) => c.deliveryPickedUpAt && c.deliveredAt
  );

  const totalDurationMs = ordersWithDuration.reduce((sum, c) => {
    return sum + (c.deliveredAt!.getTime() - c.deliveryPickedUpAt!.getTime());
  }, 0);

  const averageDurationMs =
    ordersWithDuration.length > 0
      ? totalDurationMs / ordersWithDuration.length
      : 0;

  const ordersWithReview = commandes.filter((c) => c.employeeReview);
  const totalReviews = ordersWithReview.length;
  const averageRating =
    totalReviews > 0
      ? Math.round(
          (ordersWithReview.reduce(
            (sum, c) => sum + c.employeeReview!.rating,
            0
          ) /
            totalReviews) *
            10
        ) / 10
      : 0;

  const deliveries = commandes.map((c) => {
    const durationMs =
      c.deliveryPickedUpAt && c.deliveredAt
        ? c.deliveredAt.getTime() - c.deliveryPickedUpAt.getTime()
        : null;

    return {
      orderId: c.id,
      date: c.createdAt,
      pickedUpAt: c.deliveryPickedUpAt,
      deliveredAt: c.deliveredAt,
      durationMinutes: durationMs !== null ? Math.round(durationMs / 60000) : null,
      rating: c.employeeReview?.rating ?? null,
    };
  });

  return {
    stats: {
      totalOrders,
      totalReviews,
      averageRating,
      totalDurationMinutes: Math.round(totalDurationMs / 60000),
      averageDurationMinutes: Math.round(averageDurationMs / 60000),
    },
    deliveries,
  };
};
