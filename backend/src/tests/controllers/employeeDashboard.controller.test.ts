import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import request from "supertest";
import express from "express";
import * as livreurDashboardService from "../../services/livreurDashboard.service";
import { getDashboard } from "../../controllers/livreurDashboard.controller";

jest.mock("../../services/livreurDashboard.service");
jest.mock("bcrypt");
jest.mock("nodemailer", () => ({
  createTransport: jest.fn().mockReturnValue({
    sendMail: jest.fn().mockImplementation(async () => true),
  }),
}));

const app = express();
app.use(express.json());
app.use((req, res, next) => {
  (req as any).user = { id: "livreur-1" };
  next();
});

app.get("/livreur/dashboard", getDashboard);

const mockDashboardData = {
  stats: {
    totalOrders: 10,
    totalReviews: 8,
    averageRating: 4.5,
    totalDurationMinutes: 100,
    averageDurationMinutes: 10,
  },
  deliveries: [
    {
      orderId: 1,
      date: "2026-05-27T20:00:00.000Z",
      pickedUpAt: "2026-05-27T20:10:00.000Z",
      deliveredAt: "2026-05-27T20:15:00.000Z",
      durationMinutes: 5,
      rating: 5,
    },
  ],
};

describe("LivreurDashboardControllerTests", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  //---------------------------------------------------------------
  // Teste getDashboard quand l'utilisateur n'est pas authentifié
  it("getDashboard_WhenUserIsNotAuthenticated", async () => {
    // Arrange
    const unauthApp = express();
    unauthApp.use(express.json());
    unauthApp.use((req, res, next) => {
      (req as any).user = undefined;
      next();
    });
    unauthApp.get("/livreur/dashboard", getDashboard);

    // Act
    const response = await request(unauthApp).get("/livreur/dashboard");

    // Assert
    expect(response.status).toBe(401);
    expect(response.body).toEqual({ message: "Non authentifié" });
  });

  //---------------------------------------------------------------
  // Teste getDashboard quand les données sont disponibles
  it("getDashboard_WhenDataIsAvailable", async () => {
    // Arrange
    jest.mocked(livreurDashboardService.getLivreurDashboard).mockResolvedValue(
      mockDashboardData as any
    );

    // Act
    const response = await request(app).get("/livreur/dashboard");

    // Assert
    expect(response.status).toBe(200);
    expect(response.body).toEqual(mockDashboardData);
    expect(livreurDashboardService.getLivreurDashboard).toHaveBeenCalledWith("livreur-1");
  });

  //---------------------------------------------------------------
  // Teste getDashboard quand le service retourne une erreur serveur
  it("getDashboard_WhenServiceThrowsError", async () => {
    // Arrange
    jest.mocked(livreurDashboardService.getLivreurDashboard).mockRejectedValue(
      new Error("DB error")
    );

    // Act
    const response = await request(app).get("/livreur/dashboard");

    // Assert
    expect(response.status).toBe(500);
    expect(response.body).toEqual({ message: "Erreur serveur" });
  });
});