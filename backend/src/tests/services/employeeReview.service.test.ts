import { prismaMock } from "../prismaMock";
import { createEmployeeReview, getAllEmployeeReviews,} from "../../services/employeeReview.service";
import { describe, expect, it, jest, beforeEach } from "@jest/globals";

const mockEmployee = {
  id: "livreur-1",
  firstName: "Leo",
  lastName: "Livreur",
  profilePicture: null,
};

const mockReviewer = {
  id: "user-1",
  firstName: "Jean",
  lastName: "Dupont",
  profilePicture: null,
};

const mockCommande = {
  id: 1,
  etat: "COMPLETEE",
  livreurId: "livreur-1",
  transaction: { userId: "user-1" },
} as any;

const mockReview = {
  id: 1,
  rating: 5,
  comment: "Très rapide !",
  createdAt: new Date("2024-01-01"),
  commandeId: 1,
  employeeId: "livreur-1",
  reviewerId: "user-1",
  employee: mockEmployee,
  reviewer: mockReviewer,
};

describe("EmployeeReviewServiceTests", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ============================================================
  // CREATE EMPLOYEE REVIEW
  // ============================================================

  //---------------------------------------------------------------
  // Teste createEmployeeReview quand la note est trop basse
  it("createEmployeeReview_WhenRatingIsTooLow", async () => {
    // Arrange
    const data = { rating: 0 };

    // Act
    const result = createEmployeeReview("user-1", 1, data);

    // Assert
    await expect(result).rejects.toThrow("La note doit être entre 1 et 5");
  });

  //---------------------------------------------------------------
  // Teste createEmployeeReview quand la note est trop haute
  it("createEmployeeReview_WhenRatingIsTooHigh", async () => {
    // Arrange
    const data = { rating: 6 };

    // Act
    const result = createEmployeeReview("user-1", 1, data);

    // Assert
    await expect(result).rejects.toThrow("La note doit être entre 1 et 5");
  });

  //---------------------------------------------------------------
  // Teste createEmployeeReview quand la commande n'existe pas
  it("createEmployeeReview_WhenCommandeNotFound", async () => {
    // Arrange
    prismaMock.commande.findUnique.mockResolvedValue(null);
    const data = { rating: 5 };

    // Act
    const result = createEmployeeReview("user-1", 999, data);

    // Assert
    await expect(result).rejects.toThrow("Commande non trouvée");
  });

  //---------------------------------------------------------------
  // Teste createEmployeeReview quand le reviewer n'est pas le propriétaire
  it("createEmployeeReview_WhenReviewerIsNotOwner", async () => {
    // Arrange
    prismaMock.commande.findUnique.mockResolvedValue(mockCommande);
    const data = { rating: 5 };

    // Act
    const result = createEmployeeReview("user-autre", 1, data);

    // Assert
    await expect(result).rejects.toThrow(
      "Vous n'êtes pas autorisé à laisser un avis pour cette commande"
    );
  });

  //---------------------------------------------------------------
  // Teste createEmployeeReview quand la commande n'est pas complétée
  it("createEmployeeReview_WhenCommandeNotCompleted", async () => {
    // Arrange
    const commandeEnLivraison = { ...mockCommande, etat: "IN_DELIVERY" };
    prismaMock.commande.findUnique.mockResolvedValue(commandeEnLivraison);
    const data = { rating: 5 };

    // Act
    const result = createEmployeeReview("user-1", 1, data);

    // Assert
    await expect(result).rejects.toThrow(
      "La commande doit être complétée pour laisser un avis"
    );
  });

  //---------------------------------------------------------------
  // Teste createEmployeeReview quand aucun livreur n'est assigné
  it("createEmployeeReview_WhenNoLivreurAssigned", async () => {
    // Arrange
    const commandeSansLivreur = { ...mockCommande, livreurId: null };
    prismaMock.commande.findUnique.mockResolvedValue(commandeSansLivreur);
    const data = { rating: 5 };

    // Act
    const result = createEmployeeReview("user-1", 1, data);

    // Assert
    await expect(result).rejects.toThrow(
      "Aucun livreur assigné à cette commande"
    );
  });

  //---------------------------------------------------------------
  // Teste createEmployeeReview quand un avis existe déjà
  it("createEmployeeReview_WhenReviewAlreadyExists", async () => {
    // Arrange
    prismaMock.commande.findUnique.mockResolvedValue(mockCommande);
    prismaMock.employeeReview.findUnique.mockResolvedValue(mockReview as any);
    const data = { rating: 5 };

    // Act
    const result = createEmployeeReview("user-1", 1, data);

    // Assert
    await expect(result).rejects.toThrow(
      "Vous avez déjà laissé un avis pour cette commande"
    );
  });

  //---------------------------------------------------------------
  // Teste createEmployeeReview quand un commentaire depasse 250 caractères
  it("createEmployeeReview_WhenCommentIsTooLong", async () => {
  // Arrange
  const data = { rating: 5, comment: "a".repeat(251) };

  // Act
  const result = createEmployeeReview("user-1", 1, data);

  // Assert
  await expect(result).rejects.toThrow(
    "Le commentaire ne peut pas dépasser 250 caractères"
  );
});

  //---------------------------------------------------------------
  // Teste createEmployeeReview quand les données sont valides
  it("createEmployeeReview_WhenDataIsValid", async () => {
    // Arrange
    prismaMock.commande.findUnique.mockResolvedValue(mockCommande);
    prismaMock.employeeReview.findUnique.mockResolvedValue(null);
    prismaMock.employeeReview.create.mockResolvedValue(mockReview as any);

    const data = { rating: 5, comment: "Très rapide !" };

    // Act
    const result = await createEmployeeReview("user-1", 1, data);

    // Assert
    expect(prismaMock.employeeReview.create).toHaveBeenCalledWith({
      data: {
        rating: 5,
        comment: "Très rapide !",
        employeeId: "livreur-1",
        reviewerId: "user-1",
        commandeId: 1,
      },
    });
    expect(result).toEqual(mockReview);
  });

  //---------------------------------------------------------------
  // Teste createEmployeeReview quand le commentaire est absent
  it("createEmployeeReview_WhenCommentIsAbsent", async () => {
    // Arrange
    const reviewWithoutComment = { ...mockReview, comment: null };
    prismaMock.commande.findUnique.mockResolvedValue(mockCommande);
    prismaMock.employeeReview.findUnique.mockResolvedValue(null);
    prismaMock.employeeReview.create.mockResolvedValue(reviewWithoutComment as any);

    const data = { rating: 4 };

    // Act
    const result = await createEmployeeReview("user-1", 1, data);

    // Assert
    expect(prismaMock.employeeReview.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ comment: null }),
      })
    );
    expect(result.comment).toBeNull();
  });
  
  // ============================================================
  // GET ALL EMPLOYEE REVIEWS
  // ============================================================

  //---------------------------------------------------------------
  // Teste getAllEmployeeReviews quand il n'y a pas d'avis
  it("getAllEmployeeReviews_WhenNoReviews", async () => {
    // Arrange
    prismaMock.employeeReview.findMany.mockResolvedValue([]);

    // Act
    const result = await getAllEmployeeReviews();

    // Assert
    expect(result).toEqual([]);
  });

  //---------------------------------------------------------------
  // Teste getAllEmployeeReviews quand des avis existent
  it("getAllEmployeeReviews_WhenReviewsExist", async () => {
    // Arrange
    prismaMock.employeeReview.findMany.mockResolvedValue([mockReview as any]);

    // Act
    const result = await getAllEmployeeReviews();

    // Assert
    expect(result).toHaveLength(1);
    expect(prismaMock.employeeReview.findMany).toHaveBeenCalledWith({
      orderBy: { createdAt: "desc" },
      include: {
        employee: { select: { id: true, firstName: true, lastName: true } },
        reviewer: { select: { id: true, firstName: true, lastName: true } },
      },
    });
  });
});