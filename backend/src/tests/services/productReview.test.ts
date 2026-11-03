import { prismaMock } from "../prismaMock";
import {
  createProductReview,
  updateProductReview,
  deleteProductReview,
  flagProductReview,
  getAllFlaggedReviews,
  getReviewsByProduct,
  getProductReviewStats,
} from "../../services/productReview.service";
import { describe, expect, it, jest, beforeEach } from "@jest/globals";

// Mock fs pour éviter les opérations sur le système de fichiers réel
jest.mock("fs", () => ({
  existsSync: jest.fn().mockReturnValue(false),
  unlinkSync: jest.fn(),
}));

const mockUser = {
  id: "user-1",
  firstName: "Jean",
  lastName: "Dupont",
  profilePicture: null,
};

const mockReview = {
  id: 1,
  userId: "user-1",
  productId: 1,
  rating: 5,
  comment: "Excellent produit !",
  imagesUrl: [],
  isFlagged: false,
  flagCount: 0,
  isActive: true,
  createdAt: new Date("2024-01-01"),
  user: mockUser,
};

const mockProduct = {
  id: 1,
  name: "Hamburger",
  imageUrl: "hamburger",
  description: "",
  price: 12.99,
  sale: 0,
  idle: false,
  stock: 10,
  comment: "Délicieux burger",
  categoryId: 1,
} as any;

const mockTransaction = {
  id: "transaction-1",
  userId: "user-1",
  productId: 1,
} as any;

describe("ProductReviewServiceTests", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ============================================================
  // CREATE PRODUCT REVIEW
  // ============================================================

  //---------------------------------------------------------------
  // Teste createProductReview quand la note est inférieure à 1
  it("createProductReview_WhenRatingIsTooLow", async () => {
    // Arrange
    const data = { rating: 0, comment: "Mauvais" };

    // Act
    const result = createProductReview("user-1", 1, data);

    // Assert
    await expect(result).rejects.toThrow("La note doit être entre 1 et 5");
  });

  //---------------------------------------------------------------
  // Teste createProductReview quand la note est supérieure à 5
  it("createProductReview_WhenRatingIsTooHigh", async () => {
    // Arrange
    const data = { rating: 6, comment: "Super" };

    // Act
    const result = createProductReview("user-1", 1, data);

    // Assert
    await expect(result).rejects.toThrow("La note doit être entre 1 et 5");
  });

  //---------------------------------------------------------------
  // Teste createProductReview quand le produit n'existe pas
  it("createProductReview_WhenProductNotFound", async () => {
    // Arrange
    prismaMock.product.findUnique.mockResolvedValue(null);
    const data = { rating: 5, comment: "Super" };

    // Act
    const result = createProductReview("user-1", 999, data);

    // Assert
    await expect(result).rejects.toThrow("Produit non trouvé");
  });

  //---------------------------------------------------------------
  // Teste createProductReview quand l'utilisateur n'a pas acheté le produit
  it("createProductReview_WhenUserHasNotPurchasedProduct", async () => {
    // Arrange
    prismaMock.product.findUnique.mockResolvedValue(mockProduct);
    prismaMock.transactionItem.findFirst.mockResolvedValue(null);
    const data = { rating: 5, comment: "Super" };

    // Act
    const result = createProductReview("user-1", 1, data);

    // Assert
    await expect(result).rejects.toThrow(
      "Vous devez avoir acheté ce produit pour laisser un avis"
    );
  });

  //---------------------------------------------------------------
  // Teste createProductReview quand l'avis existe déjà
  it("createProductReview_WhenReviewAlreadyExists", async () => {
    // Arrange
    prismaMock.product.findUnique.mockResolvedValue(mockProduct);
    prismaMock.transactionItem.findFirst.mockResolvedValue(mockTransaction);
    prismaMock.productReview.findUnique.mockResolvedValue(mockReview as any);
    const data = { rating: 5, comment: "Super" };

    // Act
    const result = createProductReview("user-1", 1, data);

    // Assert
    await expect(result).rejects.toThrow(
      "Vous avez déjà laissé un avis pour ce produit"
    );
  });

  //---------------------------------------------------------------
  // Teste createProductReview quand les données sont valides
  it("createProductReview_WhenDataIsValid", async () => {
    // Arrange
    prismaMock.product.findUnique.mockResolvedValue(mockProduct);
    prismaMock.transactionItem.findFirst.mockResolvedValue(mockTransaction);
    prismaMock.productReview.findUnique.mockResolvedValue(null);
    prismaMock.productReview.create.mockResolvedValue(mockReview as any);

    const data = { rating: 5, comment: "Excellent produit !", imagesUrl: [] };

    // Act
    const result = await createProductReview("user-1", 1, data);

    // Assert
    expect(prismaMock.productReview.create).toHaveBeenCalledWith({
      data: {
        rating: data.rating,
        comment: data.comment,
        imagesUrl: data.imagesUrl,
        productId: 1,
        userId: "user-1",
      },
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
    });
    expect(result).toEqual(mockReview);
    expect(result.rating).toBe(5);
    expect(result.userId).toBe("user-1");
  });

  //---------------------------------------------------------------
  // Teste createProductReview quand le commentaire est absent (optionnel)
  it("createProductReview_WhenCommentIsAbsent", async () => {
    // Arrange
    const reviewWithoutComment = { ...mockReview, comment: null };
    prismaMock.product.findUnique.mockResolvedValue(mockProduct);
    prismaMock.transactionItem.findFirst.mockResolvedValue(mockTransaction);
    prismaMock.productReview.findUnique.mockResolvedValue(null);
    prismaMock.productReview.create.mockResolvedValue(reviewWithoutComment as any);

    const data = { rating: 4 };

    // Act
    const result = await createProductReview("user-1", 1, data);

    // Assert
    expect(prismaMock.productReview.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ comment: null, imagesUrl: [] }),
      })
    );
    expect(result.comment).toBeNull();
  });

  // ============================================================
  // UPDATE PRODUCT REVIEW
  // ============================================================

  //---------------------------------------------------------------
  // Teste updateProductReview quand la note est invalide
  it("updateProductReview_WhenRatingIsInvalid", async () => {
    // Arrange
    const data = { rating: 0 };

    // Act
    const result = updateProductReview(1, "user-1", data);

    // Assert
    await expect(result).rejects.toThrow("La note doit être entre 1 et 5");
  });

  //---------------------------------------------------------------
  // Teste updateProductReview quand la note est trop haute
  it("updateProductReview_WhenRatingIsTooHigh", async () => {
    // Arrange
    const data = { rating: 6 };

    // Act
    const result = updateProductReview(1, "user-1", data);

    // Assert
    await expect(result).rejects.toThrow("La note doit être entre 1 et 5");
  });

  //---------------------------------------------------------------
  // Teste updateProductReview quand l'avis n'existe pas
  it("updateProductReview_WhenReviewNotFound", async () => {
    // Arrange
    prismaMock.productReview.findUnique.mockResolvedValue(null);
    const data = { rating: 4 };

    // Act
    const result = updateProductReview(999, "user-1", data);

    // Assert
    await expect(result).rejects.toThrow("Avis non trouvé");
  });

  //---------------------------------------------------------------
  // Teste updateProductReview quand l'utilisateur n'est pas le propriétaire
  it("updateProductReview_WhenUserIsNotOwner", async () => {
    // Arrange
    prismaMock.productReview.findUnique.mockResolvedValue(mockReview as any);
    const data = { rating: 4 };

    // Act
    const result = updateProductReview(1, "user-autre", data);

    // Assert
    await expect(result).rejects.toThrow(
      "Vous n'êtes pas autorisé à modifier cet avis"
    );
  });

  //---------------------------------------------------------------
  // Teste updateProductReview quand les données sont valides
  it("updateProductReview_WhenDataIsValid", async () => {
    // Arrange
    const updatedReview = { ...mockReview, rating: 4, comment: "Bien !" };
    prismaMock.productReview.findUnique.mockResolvedValue(mockReview as any);
    prismaMock.productReview.update.mockResolvedValue(updatedReview as any);

    const data = { rating: 4, comment: "Bien !" };

    // Act
    const result = await updateProductReview(1, "user-1", data);

    // Assert
    expect(prismaMock.productReview.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { rating: 4, comment: "Bien !" },
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
    });
    expect(result.rating).toBe(4);
    expect(result.comment).toBe("Bien !");
  });

  //---------------------------------------------------------------
  // Teste updateProductReview quand la note n'est pas fournie (champ optionnel)
  it("updateProductReview_WhenRatingIsUndefined", async () => {
    // Arrange
    const updatedReview = { ...mockReview, comment: "Mis à jour" };
    prismaMock.productReview.findUnique.mockResolvedValue(mockReview as any);
    prismaMock.productReview.update.mockResolvedValue(updatedReview as any);

    const data = { comment: "Mis à jour" };

    // Act
    const result = await updateProductReview(1, "user-1", data);

    // Assert
    // rating undefined → ne doit pas être inclus dans data
    expect(prismaMock.productReview.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.not.objectContaining({ rating: expect.anything() }),
      })
    );
    expect(result.comment).toBe("Mis à jour");
  });

  //---------------------------------------------------------------
  // Teste updateProductReview quand il y a de nouvelles images (les anciennes sont supprimées)
  it("updateProductReview_WhenImagesAreReplaced", async () => {
    // Arrange
    const fs = require("fs");
    const reviewWithImages = { ...mockReview, imagesUrl: ["/uploads/reviews/old.jpg"] };
    const updatedReview = { ...mockReview, imagesUrl: ["/uploads/reviews/new.jpg"] };

    prismaMock.productReview.findUnique.mockResolvedValue(reviewWithImages as any);
    prismaMock.productReview.update.mockResolvedValue(updatedReview as any);

    const data = { imagesUrl: ["/uploads/reviews/new.jpg"] };

    // Act
    await updateProductReview(1, "user-1", data);

    // Assert — l'ancienne image n'est pas dans les nouvelles → tentative de suppression
    expect(fs.existsSync).toHaveBeenCalled();
  });
  

  // ============================================================
  // GET REVIEWS BY PRODUCT
  // ============================================================

  //---------------------------------------------------------------
  // Teste getReviewsByProduct quand il n'y a pas d'avis
  it("getReviewsByProduct_WhenNoReviews", async () => {
    // Arrange
    prismaMock.productReview.findMany.mockResolvedValue([]);
    prismaMock.productReview.aggregate.mockResolvedValue({
      _avg: { rating: null },
      _count: { rating: 0 },
    } as any);
    prismaMock.productReview.groupBy.mockResolvedValue([] as any);

    // Act
    const result = await getReviewsByProduct(1);

    // Assert
    expect(result.reviews).toEqual([]);
    expect(result.stats.total).toBe(0);
    expect(result.stats.average).toBe(0);
  });

  //---------------------------------------------------------------
  // Teste getReviewsByProduct quand il y a des avis
  it("getReviewsByProduct_WhenReviewsExist", async () => {
    // Arrange
    const reviews = [mockReview, { ...mockReview, id: 2, rating: 4 }];
    prismaMock.productReview.findMany.mockResolvedValue(reviews as any);
    prismaMock.productReview.aggregate.mockResolvedValue({
      _avg: { rating: 4.5 },
      _count: { rating: 2 },
    } as any);
    prismaMock.productReview.groupBy.mockResolvedValue([
      { rating: 5, _count: { rating: 1 } },
      { rating: 4, _count: { rating: 1 } },
    ] as any);

    // Act
    const result = await getReviewsByProduct(1);

    // Assert
    expect(result.reviews).toHaveLength(2);
    expect(result.stats.total).toBe(2);
    expect(result.stats.average).toBe(4.5);
    expect(prismaMock.productReview.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { productId: 1, OR: [{ isActive: true }] },
        orderBy: { createdAt: "desc" },
      })
    );
  });

  //---------------------------------------------------------------
  // Teste getReviewsByProduct inclut les avis inactifs du propriétaire
  it("getReviewsByProduct_WhenViewerIsOwner_IncludesOwnInactiveReviews", async () => {
    // Arrange
    prismaMock.productReview.findMany.mockResolvedValue([mockReview] as any);
    prismaMock.productReview.aggregate.mockResolvedValue({
      _avg: { rating: 5 },
      _count: { rating: 1 },
    } as any);
    prismaMock.productReview.groupBy.mockResolvedValue([
      { rating: 5, _count: { rating: 1 } },
    ] as any);

    // Act
    await getReviewsByProduct(1, "user-1");

    // Assert
    expect(prismaMock.productReview.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          productId: 1,
          OR: [{ isActive: true }, { userId: "user-1" }],
        },
      })
    );
  });

  // ============================================================
  // GET PRODUCT REVIEW STATS
  // ============================================================

  //---------------------------------------------------------------
  // Teste getProductReviewStats quand il n'y a pas d'avis
  it("getProductReviewStats_WhenNoReviews", async () => {
    // Arrange
    prismaMock.productReview.aggregate.mockResolvedValue({
      _avg: { rating: null },
      _count: { rating: 0 },
    } as any);
    prismaMock.productReview.groupBy.mockResolvedValue([] as any);

    // Act
    const result = await getProductReviewStats(1);

    // Assert
    expect(result.average).toBe(0);
    expect(result.total).toBe(0);
    expect(result.distribution).toEqual([]);
  });

  //---------------------------------------------------------------
  // Teste getProductReviewStats quand il y a des avis
  it("getProductReviewStats_WhenReviewsExist", async () => {
    // Arrange
    prismaMock.productReview.aggregate.mockResolvedValue({
      _avg: { rating: 4.666 },
      _count: { rating: 3 },
    } as any);
    prismaMock.productReview.groupBy.mockResolvedValue([
      { rating: 5, _count: { rating: 2 } },
      { rating: 4, _count: { rating: 1 } },
    ] as any);

    // Act
    const result = await getProductReviewStats(1);

    // Assert
    expect(result.average).toBe(4.7); // arrondi à 1 décimale
    expect(result.total).toBe(3);
    expect(result.distribution).toEqual([
      { rating: 5, count: 2 },
      { rating: 4, count: 1 },
    ]);
  });

  //---------------------------------------------------------------
  // Teste getProductReviewStats que l'arrondi est correct (1 décimale)
  it("getProductReviewStats_WhenAverageIsRoundedCorrectly", async () => {
    // Arrange
    prismaMock.productReview.aggregate.mockResolvedValue({
      _avg: { rating: 3.333 },
      _count: { rating: 3 },
    } as any);
    prismaMock.productReview.groupBy.mockResolvedValue([] as any);

    // Act
    const result = await getProductReviewStats(1);

    // Assert
    expect(result.average).toBe(3.3);
  });

  // ============================================================
  // COMMENT MODERATION / FLAGS
  // ============================================================

  //---------------------------------------------------------------
  // Teste flagProductReview quand l'avis n'existe pas
  it("flagProductReview_WhenReviewNotFound", async () => {
    // Arrange
    prismaMock.productReview.findUnique.mockResolvedValue(null);

    // Act
    const result = flagProductReview(999, "user-2");

    // Assert
    await expect(result).rejects.toThrow("Avis non trouvé");
    expect(prismaMock.productReviewFlag.findUnique).not.toHaveBeenCalled();
  });

  //---------------------------------------------------------------
  // Teste flagProductReview quand l'utilisateur a déjà signalé l'avis
  it("flagProductReview_WhenUserAlreadyFlagged_ReturnsReviewWithoutIncrementing", async () => {
    // Arrange
    const alreadyFlaggedReview = { ...mockReview, isFlagged: true, flagCount: 1 };
    prismaMock.productReview.findUnique
      .mockResolvedValueOnce(mockReview as any)
      .mockResolvedValueOnce(alreadyFlaggedReview as any);
    prismaMock.productReviewFlag.findUnique.mockResolvedValue({
      id: 1,
      reviewId: 1,
      userId: "user-2",
      createdAt: new Date("2024-01-02"),
    } as any);

    // Act
    const result = await flagProductReview(1, "user-2");

    // Assert
    expect(prismaMock.productReviewFlag.create).not.toHaveBeenCalled();
    expect(prismaMock.productReview.update).not.toHaveBeenCalled();
    expect(result).toEqual(alreadyFlaggedReview);
  });

  //---------------------------------------------------------------
  // Teste flagProductReview quand un nouveau signalement est créé
  it("flagProductReview_WhenNewFlag_IncrementsFlagCount", async () => {
    // Arrange
    const createdFlag = {
      id: 1,
      reviewId: 1,
      userId: "user-2",
      createdAt: new Date("2024-01-02"),
    };
    const updatedReview = { ...mockReview, isFlagged: true, flagCount: 1 };

    prismaMock.productReview.findUnique.mockResolvedValue(mockReview as any);
    prismaMock.productReviewFlag.findUnique.mockResolvedValue(null);
    prismaMock.productReviewFlag.create.mockResolvedValue(createdFlag as any);
    prismaMock.productReview.update.mockResolvedValue(updatedReview as any);
    prismaMock.$transaction.mockResolvedValue([createdFlag, updatedReview] as any);

    // Act
    const result = await flagProductReview(1, "user-2");

    // Assert
    expect(prismaMock.productReviewFlag.create).toHaveBeenCalledWith({
      data: { reviewId: 1, userId: "user-2" },
    });
    expect(prismaMock.productReview.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: {
        isFlagged: true,
        flagCount: { increment: 1 },
      },
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
    });
    expect(result).toEqual(updatedReview);
  });

  //---------------------------------------------------------------
  // Teste getAllFlaggedReviews trie les commentaires les plus signalés en premier
  it("getAllFlaggedReviews_OrdersByMostReportedCommentsFirst", async () => {
    // Arrange
    const lowReportedReview = {
      ...mockReview,
      id: 1,
      comment: "Peu signalé",
      flagCount: 1,
      createdAt: new Date("2024-01-02"),
      product: { id: 1, name: "Hamburger" },
      _count: { flags: 1 },
    };
    const highReportedReview = {
      ...mockReview,
      id: 2,
      comment: "Très signalé",
      flagCount: 3,
      createdAt: new Date("2024-01-01"),
      product: { id: 1, name: "Hamburger" },
      _count: { flags: 3 },
    };

    prismaMock.productReview.findMany.mockResolvedValue([
      lowReportedReview,
      highReportedReview,
    ] as any);
    prismaMock.productReview.count.mockResolvedValue(2);

    // Act
    const result = await getAllFlaggedReviews(0, 10);

    // Assert
    expect(prismaMock.productReview.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { OR: [{ isFlagged: true }, { flagCount: { gt: 0 } }] },
        skip: 0,
        take: 10,
        orderBy: [{ flagCount: "desc" }, { createdAt: "desc" }],
        include: expect.objectContaining({
          _count: { select: { flags: true } },
        }),
      })
    );
    expect(result.reviews.map((review) => review.id)).toEqual([2, 1]);
    expect(result.reviews[0].reportCount).toBe(3);
    expect(result.reviews[1].reportCount).toBe(1);
  });

  //---------------------------------------------------------------
  // Teste getAllFlaggedReviews utilise le nombre réel de flags si plus élevé
  it("getAllFlaggedReviews_WhenFlagRelationCountIsHigher_UsesRealReportCount", async () => {
    // Arrange
    const review = {
      ...mockReview,
      isFlagged: true,
      flagCount: 1,
      product: { id: 1, name: "Hamburger" },
      _count: { flags: 4 },
    };

    prismaMock.productReview.findMany.mockResolvedValue([review] as any);
    prismaMock.productReview.count.mockResolvedValue(1);

    // Act
    const result = await getAllFlaggedReviews();

    // Assert
    expect(result.reviews[0].flagCount).toBe(4);
    expect(result.reviews[0].reportCount).toBe(4);
    expect((result.reviews[0] as any)._count).toBeUndefined();
  });
});
