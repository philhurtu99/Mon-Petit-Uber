import { prisma } from "../lib/prisma";
import fs from "fs";
import path from "path";
import { filterReviewCommentsForUser } from "./profanityFilter.service";

 
/**
 * Crée un avis sur un produit
 */
export const createProductReview = async (
  userId: string,
  productId: number,
  data: { rating: number; comment?: string; imagesUrl?: string[] }
) => {
  if (data.rating < 1 || data.rating > 5)
    throw new Error("La note doit être entre 1 et 5");

  // Check product exists
  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product) throw new Error("Produit non trouvé");
 
  // Check si l'user a acheté le produit
  const hasPurchased = await prisma.transactionItem.findFirst({
    where: {
      productId,
      transaction: { userId },
    },
  });
  if (!hasPurchased)
    throw new Error("Vous devez avoir acheté ce produit pour laisser un avis");
 
  // Check si l'user a deja fait un review de ce produit
  const existing = await prisma.productReview.findUnique({
    where: { userId_productId: { userId, productId } },
  });
  if (existing) throw new Error("Vous avez déjà laissé un avis pour ce produit");
 
  return await prisma.productReview.create({
    data: {
      rating: data.rating,
      comment: data.comment ?? null,
      imagesUrl: data.imagesUrl ?? [],
      productId,
      userId,
    },
    include: {
      user: {
        select: { id: true, firstName: true, lastName: true, profilePicture: true },
      },
    },
  });
};


/**
 * Modifie un avis (utilisateur propriétaire uniquement)
 */
export const updateProductReview = async (
  reviewId: number,
  userId: string,
  data: { rating?: number; comment?: string; imagesUrl?: string[] }
) => {
  if (data.rating !== undefined && (data.rating < 1 || data.rating > 5))
    throw new Error("La note doit être entre 1 et 5");

  const review = await prisma.productReview.findUnique({ where: { id: reviewId } });
  if (!review) throw new Error("Avis non trouvé");
  if (review.userId !== userId)
    throw new Error("Vous n'êtes pas autorisé à modifier cet avis");

  // supprimer les anciennes images si on en envoie de nouvelles
  if (data.imagesUrl !== undefined && review.imagesUrl.length > 0) {
  review.imagesUrl.forEach((imgUrl) => {
    if (!data.imagesUrl?.includes(imgUrl)) { 
      const filePath = path.join(process.cwd(), imgUrl);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }
  });
}
 
  return await prisma.productReview.update({
    where: { id: reviewId },
    data: {
      ...(data.rating !== undefined && { rating: data.rating }),
      ...(data.comment !== undefined && { comment: data.comment }),
      ...(data.imagesUrl !== undefined && { imagesUrl: data.imagesUrl }),
    },
    include: {
      user: {
        select: { id: true, firstName: true, lastName: true, profilePicture: true },
      },
    },
  });
};


/**
 * Supprime un avis (admin uniquement)
 */
export const deleteProductReview = async (reviewId: number) => {
  const review = await prisma.productReview.findUnique({ where: { id: reviewId } });
  if (!review) throw new Error("Avis non trouvé");
 
  return await prisma.productReview.delete({ where: { id: reviewId } });
};


/**
 * Récupère les avis d'un produit
 */
export const getReviewsByProduct = async (productId: number, viewerUserId?: string) => {
  const reviews = await prisma.productReview.findMany({
    where: {
      productId,
      OR: [
        { isActive: true },
        ...(viewerUserId ? [{ userId: viewerUserId }] : []),
      ],
    },
    orderBy: { createdAt: "desc" },
    include: {
      user: {
        select: { id: true, firstName: true, lastName: true, profilePicture: true },
      },
    },
  });
 
  const stats = await getProductReviewStats(productId);
 
  const filteredReviews = await filterReviewCommentsForUser(reviews, viewerUserId);
 
  return { reviews: filteredReviews, stats };
};


/**
 * Récupère les statistiques des avis d'un produit
 */
export const getProductReviewStats = async (productId: number) => {
  const result = await prisma.productReview.aggregate({
    where: { productId, isActive: true },
    _avg: { rating: true },
    _count: { rating: true },
  });
 
  const distribution = await prisma.productReview.groupBy({
    by: ["rating"],
    where: { productId, isActive: true },
    _count: { rating: true },
    orderBy: { rating: "desc" },
  });
 
  return {
    average: Math.round((result._avg.rating ?? 0) * 10) / 10,
    total: result._count.rating,
    distribution: distribution.map((d) => ({
      rating: d.rating,
      count: d._count.rating,
    })),
  };
};


/**
 * Signale un avis (pour tout utilisateur)
 */
export const flagProductReview = async (reviewId: number, userId: string) => {
  const review = await prisma.productReview.findUnique({ where: { id: reviewId } });
  if (!review) throw new Error("Avis non trouvé");

  const existingFlag = await prisma.productReviewFlag.findUnique({
    where: { reviewId_userId: { reviewId, userId } },
  });

  if (existingFlag) {
    return await prisma.productReview.findUnique({
      where: { id: reviewId },
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, profilePicture: true },
        },
      },
    });
  }

  const [, updatedReview] = await prisma.$transaction([
    prisma.productReviewFlag.create({
      data: { reviewId, userId },
    }),
    prisma.productReview.update({
      where: { id: reviewId },
      data: {
        isFlagged: true,
        flagCount: { increment: 1 },
      },
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, profilePicture: true },
        },
      },
    }),
  ]);

  return updatedReview;
};


/**
 * Modifie un avis en tant qu'admin (pour modération)
 */
export const updateProductReviewAsAdmin = async (
  reviewId: number,
  data: { comment?: string; rating?: number }
) => {
  const review = await prisma.productReview.findUnique({ where: { id: reviewId } });
  if (!review) throw new Error("Avis non trouvé");

  if (data.rating !== undefined && (data.rating < 1 || data.rating > 5))
    throw new Error("La note doit être entre 1 et 5");

  return await prisma.productReview.update({
    where: { id: reviewId },
    data: {
      ...(data.comment !== undefined && { comment: data.comment }),
      ...(data.rating !== undefined && { rating: data.rating }),
    },
    include: {
      user: {
        select: { id: true, firstName: true, lastName: true, profilePicture: true },
      },
    },
  });
};


/**
 * Désactive/Active un avis (admin uniquement)
 */
export const toggleProductReviewActive = async (reviewId: number, isActive: boolean) => {
  const review = await prisma.productReview.findUnique({ where: { id: reviewId } });
  if (!review) throw new Error("Avis non trouvé");

  return await prisma.productReview.update({
    where: { id: reviewId },
    data: { isActive },
    include: {
      user: {
        select: { id: true, firstName: true, lastName: true, profilePicture: true },
      },
    },
  });
};


/**
 * Récupère tous les avis signalés (admin uniquement)
 */
export const getAllFlaggedReviews = async (skip: number = 0, take: number = 20) => {
  const reviews = await prisma.productReview.findMany({
    where: { OR: [{ isFlagged: true }, { flagCount: { gt: 0 } }] },
    skip,
    take,
    orderBy: [{ flagCount: "desc" }, { createdAt: "desc" }],
    include: {
      user: {
        select: { id: true, firstName: true, lastName: true, profilePicture: true },
      },
      product: {
        select: { id: true, name: true },
      },
      _count: {
        select: { flags: true },
      },
    },
  });

  const total = await prisma.productReview.count({
    where: { OR: [{ isFlagged: true }, { flagCount: { gt: 0 } }] },
  });

  const reviewsWithReportCount = reviews
    .map((review) => {
      const reportCount = Math.max(review.flagCount, review._count.flags);
      const { _count, ...reviewData } = review;

      return {
        ...reviewData,
        flagCount: reportCount,
        reportCount,
      };
    })
    .sort((firstReview, secondReview) => {
      if (secondReview.reportCount !== firstReview.reportCount) {
        return secondReview.reportCount - firstReview.reportCount;
      }

      return (
        new Date(secondReview.createdAt).getTime() -
        new Date(firstReview.createdAt).getTime()
      );
    });

  return {
    reviews: reviewsWithReportCount,
    total,
    page: Math.floor(skip / take) + 1,
    pageSize: take,
    totalPages: Math.ceil(total / take),
  };
};

