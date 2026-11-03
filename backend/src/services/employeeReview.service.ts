import { prisma } from "../lib/prisma";


/**
 * Crée un avis sur un produit
 */
export const createEmployeeReview = async (
  reviewerId: string,
  commandeId: number,
  data: { rating: number; comment?: string }
) => {
  if (data.rating < 1 || data.rating > 5)
    throw new Error("La note doit être entre 1 et 5");

  if (data.comment && data.comment.length > 250)
  throw new Error("Le commentaire ne peut pas dépasser 250 caractères");

  const commande = await prisma.commande.findUnique({
    where: { id: commandeId },
    include: { transaction: true },
  });

  if (!commande) throw new Error("Commande non trouvée");

  if (commande.transaction.userId !== reviewerId)
    throw new Error("Vous n'êtes pas autorisé à laisser un avis pour cette commande");

  if (commande.etat !== "COMPLETEE")
    throw new Error("La commande doit être complétée pour laisser un avis");

  if (!commande.livreurId)
    throw new Error("Aucun livreur assigné à cette commande");

  const existing = await prisma.employeeReview.findUnique({ where: { commandeId } });
  if (existing) throw new Error("Vous avez déjà laissé un avis pour cette commande");

  return await prisma.employeeReview.create({
    data: {
      rating: data.rating,
      comment: data.comment ?? null,
      employeeId: commande.livreurId,
      reviewerId,
      commandeId,
    },
  });
};

/**
 * Pour l'admin — toutes les reviews avec tout le détail
 */
export const getAllEmployeeReviews = async () => {
  return await prisma.employeeReview.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      employee: {
        select: { id: true, firstName: true, lastName: true },
      },
      reviewer: {
        select: { id: true, firstName: true, lastName: true },
      },
    },
  });
};
