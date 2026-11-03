import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import request from "supertest";
import express from "express";
import * as employeeReviewService from "../../services/employeeReview.service";
import { create, getAll,} from "../../controllers/employeeReview.controller";

jest.mock("../../services/employeeReview.service");
jest.mock("bcrypt");
jest.mock("nodemailer", () => ({
  createTransport: jest.fn().mockReturnValue({
    sendMail: jest.fn().mockImplementation(async () => true),
  }),
}));

const app = express();
app.use(express.json());
app.use((req, res, next) => {
  (req as any).user = { id: "user-1" };
  next();
});

const mockReview = {
  id: 1,
  rating: 5,
  comment: "Très rapide !",
  commandeId: 1,
  employeeId: "livreur-1",
  reviewerId: "user-1",
  createdAt: "2024-01-01T00:00:00.000Z",
};

const mockMyReviewsData = {
  average: 4.5,
  total: 2,
  reviews: [
    { id: 1, rating: 5, createdAt: "2024-01-01T00:00:00.000Z", commandeId: 1 },
    { id: 2, rating: 4, createdAt: "2024-01-02T00:00:00.000Z", commandeId: 2 },
  ],
};

app.post("/commandes/:commandeId/review", create);
app.get("/employee-reviews", getAll);

describe("EmployeeReviewControllerTests", () => {
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
    jest.mocked(employeeReviewService.createEmployeeReview).mockResolvedValue(mockReview as any);

    // Act
    const response = await request(app)
      .post("/commandes/1/review")
      .send({ rating: 5, comment: "Très rapide !" });

    // Assert
    expect(response.status).toBe(201);
    expect(response.body).toEqual({
      message: "Avis créé",
      review: expect.objectContaining({ rating: 5 }),
    });
    expect(employeeReviewService.createEmployeeReview).toHaveBeenCalled();
  });

  //---------------------------------------------------------------
  // Teste create quand l'utilisateur n'est pas authentifié
  it("create_WhenUserIsNotAuthenticated", async () => {
    // Arrange
    const unauthApp = express();
    unauthApp.use(express.json());
    unauthApp.use((req, res, next) => {
      (req as any).user = undefined;
      next();
    });
    unauthApp.post("/commandes/:commandeId/review", create);

    // Act
    const response = await request(unauthApp)
      .post("/commandes/1/review")
      .send({ rating: 5 });

    // Assert
    expect(response.status).toBe(401);
    expect(response.body).toEqual({ message: "Non authentifié" });
  });

  //---------------------------------------------------------------
  // Teste create quand la commande n'existe pas
  it("create_WhenCommandeNotFound", async () => {
    // Arrange
    jest.mocked(employeeReviewService.createEmployeeReview).mockRejectedValue(
      new Error("Commande non trouvée")
    );

    // Act
    const response = await request(app)
      .post("/commandes/999/review")
      .send({ rating: 5 });

    // Assert
    expect(response.status).toBe(404);
    expect(response.body).toEqual({ message: "Commande non trouvée" });
  });

  //---------------------------------------------------------------
  // Teste create quand un avis existe déjà
  it("create_WhenReviewAlreadyExists", async () => {
    // Arrange
    jest.mocked(employeeReviewService.createEmployeeReview).mockRejectedValue(
      new Error("Vous avez déjà laissé un avis pour cette commande")
    );

    // Act
    const response = await request(app)
      .post("/commandes/1/review")
      .send({ rating: 5 });

    // Assert
    expect(response.status).toBe(409);
    expect(response.body).toEqual({
      message: "Vous avez déjà laissé un avis pour cette commande",
    });
  });

  //---------------------------------------------------------------
  // Teste create quand l'accès est refusé
  it("create_WhenAccessDenied", async () => {
    // Arrange
    jest.mocked(employeeReviewService.createEmployeeReview).mockRejectedValue(
      new Error("Vous n'êtes pas autorisé à laisser un avis pour cette commande")
    );

    // Act
    const response = await request(app)
      .post("/commandes/1/review")
      .send({ rating: 5 });

    // Assert
    expect(response.status).toBe(403);
    expect(response.body).toEqual({
      message: "Vous n'êtes pas autorisé à laisser un avis pour cette commande",
    });
  });

  //---------------------------------------------------------------
  // Teste create quand la note est invalide
  it("create_WhenRatingIsInvalid", async () => {
    // Arrange
    jest.mocked(employeeReviewService.createEmployeeReview).mockRejectedValue(
      new Error("La note doit être entre 1 et 5")
    );

    // Act
    const response = await request(app)
      .post("/commandes/1/review")
      .send({ rating: 10 });

    // Assert
    expect(response.status).toBe(400);
    expect(response.body).toEqual({ message: "La note doit être entre 1 et 5" });
  });

  //---------------------------------------------------------------
  // Teste create quand le service retourne une erreur serveur
  it("create_WhenServiceThrowsError", async () => {
    // Arrange
    jest.mocked(employeeReviewService.createEmployeeReview).mockRejectedValue(
      { message: null }
    );

    // Act
    const response = await request(app)
      .post("/commandes/1/review")
      .send({ rating: 5 });

    // Assert
    expect(response.status).toBe(500);
    expect(response.body).toEqual({ message: "Erreur serveur" });
  }); 

  // ============================================================
  // GET ALL
  // ============================================================

  //---------------------------------------------------------------
  // Teste getAll quand des avis existent
  it("getAll_WhenReviewsExist", async () => {
    // Arrange
    jest.mocked(employeeReviewService.getAllEmployeeReviews).mockResolvedValue(
      [mockReview as any]
    );

    // Act
    const response = await request(app).get("/employee-reviews");

    // Assert
    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(1);
    expect(employeeReviewService.getAllEmployeeReviews).toHaveBeenCalled();
  });

  //---------------------------------------------------------------
  // Teste getAll quand il n'y a pas d'avis
  it("getAll_WhenNoReviews", async () => {
    // Arrange
    jest.mocked(employeeReviewService.getAllEmployeeReviews).mockResolvedValue([]);

    // Act
    const response = await request(app).get("/employee-reviews");

    // Assert
    expect(response.status).toBe(200);
    expect(response.body).toEqual([]);
  });

  //---------------------------------------------------------------
  // Teste getAll quand le service retourne une erreur serveur
  it("getAll_WhenServiceThrowsError", async () => {
    // Arrange
    jest.mocked(employeeReviewService.getAllEmployeeReviews).mockRejectedValue(
      new Error("DB error")
    );

    // Act
    const response = await request(app).get("/employee-reviews");

    // Assert
    expect(response.status).toBe(500);
    expect(response.body).toEqual({ message: "Erreur serveur" });
  });
});