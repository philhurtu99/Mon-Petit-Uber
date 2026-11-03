import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import request from "supertest";
import express from "express";
import * as productReviewService from "../../services/productReview.service";
import {
  create,
  update,
  remove,
  getByProduct,
  getStats,
} from "../../controllers/productReview.controller";

jest.mock("../../services/productReview.service");
jest.mock("bcrypt");

jest.mock("nodemailer", () => ({
  createTransport: jest.fn().mockReturnValue({
    sendMail: jest.fn().mockImplementation(async () => true),
  }),
}));


const app = express();
app.use(express.json());


app.use((req, res, next) => {
  (req as any).user = { id: 1 };
  (req as any).files = [];
  next();
});

const mockReview = {
  id: 1,
  userId: 1,
  productId: 1,
  rating: 5,
  comment: "Excellent produit !",
  imagesUrl: [],
  createdAt: "2024-01-01T00:00:00.000Z",
};

const mockStats = {
  averageRating: 4.5,
  totalReviews: 10,
  ratingDistribution: { 1: 0, 2: 1, 3: 1, 4: 3, 5: 5 },
};

const mockReviewsData = {
  reviews: [mockReview],
  stats: mockStats,
};

app.post("/reviews/product/:productId", create);
app.put("/reviews/:id", update);
app.delete("/reviews/:id", remove);
app.get("/reviews/product/:productId", getByProduct);
app.get("/reviews/product/:productId/stats", getStats);

describe("ProductReviewControllerTests", () => {
  //---------------------------------------------------------------
  // Reset mocks 
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ============================================================
  // CREATE
  // ============================================================

  //---------------------------------------------------------------
  // Teste create quand les données sont valides
  it("create_WhenDataIsValid", async () => {
    // Arrange
    (
      productReviewService.createProductReview as jest.MockedFunction<
        typeof productReviewService.createProductReview
      >
    ).mockResolvedValue(mockReview as any);

    // Act
    const response = await request(app)
      .post("/reviews/product/1")
      .send({ rating: 5, comment: "Excellent produit !" });

    // Assert
    expect(response.status).toBe(201);
    expect(response.body).toEqual({
      message: "Avis créé",
      review: expect.objectContaining({ rating: 5 }),
    });
    expect(productReviewService.createProductReview).toHaveBeenCalled();
  });

  //---------------------------------------------------------------
  // Teste create quand l'utilisateur n'est pas authentifié
  it("create_WhenUserIsNotAuthenticated", async () => {
    // Arrange — application sans middleware d'authentification
    const unauthApp = express();
    unauthApp.use(express.json());
    unauthApp.use((req, res, next) => {
      (req as any).user = undefined;
      (req as any).files = [];
      next();
    });
    unauthApp.post("/reviews/product/:productId", create);

    // Act
    const response = await request(unauthApp)
      .post("/reviews/product/1")
      .send({ rating: 5, comment: "Test" });

    // Assert
    expect(response.status).toBe(401);
    expect(response.body).toEqual({ message: "Non authentifié" });
  });

  //---------------------------------------------------------------
  // Teste create quand le produit n'existe pas
  it("create_WhenProductNotFound", async () => {
    // Arrange
    (
      productReviewService.createProductReview as jest.MockedFunction<
        typeof productReviewService.createProductReview
      >
    ).mockRejectedValue(new Error("Produit non trouvé"));

    // Act
    const response = await request(app)
      .post("/reviews/product/999")
      .send({ rating: 5, comment: "Test" });

    // Assert
    expect(response.status).toBe(404);
    expect(response.body).toEqual({ message: "Produit non trouvé" });
  });

  //---------------------------------------------------------------
  // Teste create quand l'utilisateur a déjà laissé un avis
  it("create_WhenReviewAlreadyExists", async () => {
    // Arrange
    (
      productReviewService.createProductReview as jest.MockedFunction<
        typeof productReviewService.createProductReview
      >
    ).mockRejectedValue(
      new Error("Vous avez déjà laissé un avis pour ce produit"),
    );

    // Act
    const response = await request(app)
      .post("/reviews/product/1")
      .send({ rating: 5, comment: "Test" });

    // Assert
    expect(response.status).toBe(409);
    expect(response.body).toEqual({
      message: "Vous avez déjà laissé un avis pour ce produit",
    });
  });

  //---------------------------------------------------------------
  // Teste create quand le service retourne une erreur de validation
  it("create_WhenValidationError", async () => {
    // Arrange
    (
      productReviewService.createProductReview as jest.MockedFunction<
        typeof productReviewService.createProductReview
      >
    ).mockRejectedValue(new Error("La note doit être entre 1 et 5"));

    // Act
    const response = await request(app)
      .post("/reviews/product/1")
      .send({ rating: 10, comment: "Test" });

    // Assert
    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      message: "La note doit être entre 1 et 5",
    });
  });

  //---------------------------------------------------------------
  // Teste create quand le service retourne une erreur serveur
  it("create_WhenServiceThrowsError", async () => {
    // Arrange
    (
      productReviewService.createProductReview as jest.MockedFunction<
        typeof productReviewService.createProductReview
      >
    ).mockRejectedValue({ message: null }); 

    // Act
    const response = await request(app)
      .post("/reviews/product/1")
      .send({ rating: 5, comment: "Test" });

    // Assert
    expect(response.status).toBe(500);
    expect(response.body).toEqual({ message: "Erreur serveur" });
  });

  // ============================================================
  // UPDATE
  // ============================================================

  //---------------------------------------------------------------
  // Teste update quand les données sont valides
  it("update_WhenDataIsValid", async () => {
    // Arrange
    const updatedReview = { ...mockReview, rating: 4, comment: "Bien, mais peut mieux faire" };
    (
      productReviewService.updateProductReview as jest.MockedFunction<
        typeof productReviewService.updateProductReview
      >
    ).mockResolvedValue(updatedReview as any);

    // Act
    const response = await request(app)
      .put("/reviews/1")
      .send({ rating: 4, comment: "Bien, mais peut mieux faire" });

    // Assert
    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      message: "Avis mis à jour",
      review: expect.objectContaining({ rating: 4 }),
    });
    expect(productReviewService.updateProductReview).toHaveBeenCalled();
  });

  //---------------------------------------------------------------
  // Teste update quand l'utilisateur n'est pas authentifié
  it("update_WhenUserIsNotAuthenticated", async () => {
    // Arrange
    const unauthApp = express();
    unauthApp.use(express.json());
    unauthApp.use((req, res, next) => {
      (req as any).user = undefined;
      (req as any).files = [];
      next();
    });
    unauthApp.put("/reviews/:id", update);

    // Act
    const response = await request(unauthApp)
      .put("/reviews/1")
      .send({ rating: 4 });

    // Assert
    expect(response.status).toBe(401);
    expect(response.body).toEqual({ message: "Non authentifié" });
  });

  //---------------------------------------------------------------
  // Teste update quand l'avis n'existe pas
  it("update_WhenReviewNotFound", async () => {
    // Arrange
    (
      productReviewService.updateProductReview as jest.MockedFunction<
        typeof productReviewService.updateProductReview
      >
    ).mockRejectedValue(new Error("Avis non trouvé"));

    // Act
    const response = await request(app)
      .put("/reviews/999")
      .send({ rating: 4 });

    // Assert
    expect(response.status).toBe(404);
    expect(response.body).toEqual({ message: "Avis non trouvé" });
  });

  //---------------------------------------------------------------
  // Teste update quand l'utilisateur n'est pas autorisé
  it("update_WhenUserIsNotAuthorized", async () => {
    // Arrange
    (
      productReviewService.updateProductReview as jest.MockedFunction<
        typeof productReviewService.updateProductReview
      >
    ).mockRejectedValue(
      new Error("Vous n'êtes pas autorisé à modifier cet avis"),
    );

    // Act
    const response = await request(app)
      .put("/reviews/1")
      .send({ rating: 4 });

    // Assert
    expect(response.status).toBe(403);
    expect(response.body).toEqual({
      message: "Vous n'êtes pas autorisé à modifier cet avis",
    });
  });

  //---------------------------------------------------------------
  // Teste update quand le service retourne une erreur de validation
  it("update_WhenValidationError", async () => {
    // Arrange
    (
      productReviewService.updateProductReview as jest.MockedFunction<
        typeof productReviewService.updateProductReview
      >
    ).mockRejectedValue(new Error("La note doit être entre 1 et 5"));

    // Act
    const response = await request(app)
      .put("/reviews/1")
      .send({ rating: 10 });

    // Assert
    expect(response.status).toBe(400);
    expect(response.body).toEqual({ message: "La note doit être entre 1 et 5" });
  });

  //---------------------------------------------------------------
  // Teste update quand le service retourne une erreur serveur
  it("update_WhenServiceThrowsError", async () => {
    // Arrange
    (
      productReviewService.updateProductReview as jest.MockedFunction<
        typeof productReviewService.updateProductReview
      >
    ).mockRejectedValue({ message: null }); 

    // Act
    const response = await request(app)
      .put("/reviews/1")
      .send({ rating: 4 });

    // Assert
    expect(response.status).toBe(500);
    expect(response.body).toEqual({ message: "Erreur serveur" });
  });

  // ============================================================
  // REMOVE
  // ============================================================

  //---------------------------------------------------------------
  // Teste remove quand l'avis existe (admin)
  it("remove_WhenReviewExists", async () => {
    // Arrange
    (
      productReviewService.deleteProductReview as jest.MockedFunction<
        typeof productReviewService.deleteProductReview
      >
    ).mockResolvedValue(mockReview as any);

    // Act
    const response = await request(app).delete("/reviews/1");

    // Assert
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ message: "Avis supprimé" });
    expect(productReviewService.deleteProductReview).toHaveBeenCalledWith(1);
  });

  //---------------------------------------------------------------
  // Teste remove quand l'avis n'existe pas
  it("remove_WhenReviewNotFound", async () => {
    // Arrange
    (
      productReviewService.deleteProductReview as jest.MockedFunction<
        typeof productReviewService.deleteProductReview
      >
    ).mockRejectedValue(new Error("Avis non trouvé"));

    // Act
    const response = await request(app).delete("/reviews/999");

    // Assert
    expect(response.status).toBe(404);
    expect(response.body).toEqual({ message: "Avis non trouvé" });
  });

  //---------------------------------------------------------------
  // Teste remove quand le service retourne une erreur serveur
  it("remove_WhenServiceThrowsError", async () => {
    // Arrange
    (
      productReviewService.deleteProductReview as jest.MockedFunction<
        typeof productReviewService.deleteProductReview
      >
    ).mockRejectedValue(new Error("DB error"));

    // Act
    const response = await request(app).delete("/reviews/1");

    // Assert
    expect(response.status).toBe(500);
    expect(response.body).toEqual({ message: "Erreur serveur" });
  });

  // ============================================================
  // GET BY PRODUCT
  // ============================================================

  //---------------------------------------------------------------
  // Teste getByProduct quand les avis existent
  it("getByProduct_WhenReviewsExist", async () => {
    // Arrange
    (
      productReviewService.getReviewsByProduct as jest.MockedFunction<
        typeof productReviewService.getReviewsByProduct
      >
    ).mockResolvedValue(mockReviewsData as any);

    // Act
    const response = await request(app).get("/reviews/product/1");

    // Assert
    expect(response.status).toBe(200);
    expect(response.body).toEqual(mockReviewsData);
    expect(productReviewService.getReviewsByProduct).toHaveBeenCalledWith(1);
  });

  //---------------------------------------------------------------
  // Teste getByProduct quand aucun avis n'existe (liste vide)
  it("getByProduct_WhenNoReviews", async () => {
    // Arrange
    (
      productReviewService.getReviewsByProduct as jest.MockedFunction<
        typeof productReviewService.getReviewsByProduct
      >
    ).mockResolvedValue({ reviews: [], stats: { averageRating: 0, totalReviews: 0 } } as any);

    // Act
    const response = await request(app).get("/reviews/product/1");

    // Assert
    expect(response.status).toBe(200);
    expect(response.body.reviews).toHaveLength(0);
  });

  //---------------------------------------------------------------
  // Teste getByProduct quand le service retourne une erreur serveur
  it("getByProduct_WhenServiceThrowsError", async () => {
    // Arrange
    (
      productReviewService.getReviewsByProduct as jest.MockedFunction<
        typeof productReviewService.getReviewsByProduct
      >
    ).mockRejectedValue(new Error("DB error"));

    // Act
    const response = await request(app).get("/reviews/product/1");

    // Assert
    expect(response.status).toBe(500);
    expect(response.body).toEqual({ message: "Erreur serveur" });
  });

  // ============================================================
  // GET STATS
  // ============================================================

  //---------------------------------------------------------------
  // Teste getStats quand les stats sont disponibles
  it("getStats_WhenStatsAreAvailable", async () => {
    // Arrange
    (
      productReviewService.getProductReviewStats as jest.MockedFunction<
        typeof productReviewService.getProductReviewStats
      >
    ).mockResolvedValue(mockStats as any);

    // Act
    const response = await request(app).get("/reviews/product/1/stats");

    // Assert
    expect(response.status).toBe(200);
    expect(response.body).toEqual(mockStats);
    expect(productReviewService.getProductReviewStats).toHaveBeenCalledWith(1);
  });

  //---------------------------------------------------------------
  // Teste getStats quand le service retourne une erreur serveur
  it("getStats_WhenServiceThrowsError", async () => {
    // Arrange
    (
      productReviewService.getProductReviewStats as jest.MockedFunction<
        typeof productReviewService.getProductReviewStats
      >
    ).mockRejectedValue(new Error("DB error"));

    // Act
    const response = await request(app).get("/reviews/product/1/stats");

    // Assert
    expect(response.status).toBe(500);
    expect(response.body).toEqual({ message: "Erreur serveur" });
  });
});