import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import request from "supertest";
import express from "express";
import * as adminClientService from "../../services/adminClient.service";
import {
  getAllAdminClients,
  getAdminClientById,
  getAdminClientHabitsById,
  exportAdminClientsJson,
  exportAdminClientsCsv,
  updateAdminClientLoyaltyPoints,
} from "../../controllers/adminClient.controller";

jest.mock("../../services/loyaltyEvents.service", () => ({
  notifyUserLoyaltyPointsChanged: jest.fn(),
}));

import { notifyUserLoyaltyPointsChanged } from "../../services/loyaltyEvents.service";

jest.mock("../../services/adminClient.service");

const app = express();
app.use(express.json());

// Les routes export doivent être avant /:id pour éviter les conflits
app.get("/clients/export/json", exportAdminClientsJson);
app.get("/clients/export/csv", exportAdminClientsCsv);
app.get("/clients", getAllAdminClients);
app.get("/clients/:id", getAdminClientById);
app.get("/clients/:id/habits", getAdminClientHabitsById);
app.patch("/clients/:id/loyalty-points", updateAdminClientLoyaltyPoints);

const mockClientSummary = {
  id: "user-1",
  firstName: "Jean",
  lastName: "Dupont",
  email: "jean@example.com",
  phone: "5141234567",
  address: "123 rue Test",
  profilePicture: null,
  createdAt: new Date("2024-01-01"),
  ordersCount: 3,
  totalSpent: 150.0,
  lastPurchaseDate: new Date("2024-09-01"),
  loyaltyPoints: 1250,
};

const mockClientDetails = {
  ...mockClientSummary,
  creditBalance: 10.0,
  loyaltyPoints: 1250,
  updatedAt: new Date("2024-09-01"),
  orders: [
    {
      id: 1,
      purchaseDate: new Date("2024-09-01"),
      total: 50.0,
      creditUsed: 0,
      loyaltyPointsUsed: 0,
      loyaltyDiscount: 0,
      loyaltyPointsEarned: 0,
      stripeAmountPaid: 50.0,
      commande: {
        id: 10,
        type: "PICKUP",
        etat: "READY",
        createdAt: new Date("2024-09-01"),
        updatedAt: new Date("2024-09-01"),
        readyForPickupAt: null,
        deliveryPickedUpAt: null,
      },
      items: [
        {
          id: 101,
          productId: 5,
          productName: "Pizza",
          imageUrl: "pizza.jpg",
          quantity: 2,
          price: 25.0,
          lineTotal: 50.0,
        },
      ],
    },
  ],
};

const mockHabits = [
  { period: "2024-01", ordersCount: 2, itemsCount: 5, totalSpent: 100.0 },
  { period: "2024-02", ordersCount: 1, itemsCount: 3, totalSpent: 50.0 },
];

describe("AdminClientControllerTests", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Teste getAllAdminClients quand des clients existent
  it("getAllAdminClients_WhenClientsExist", async () => {
    // Arrange
    (
      adminClientService.getAdminClients as jest.MockedFunction<
        typeof adminClientService.getAdminClients
      >
    ).mockResolvedValue([mockClientSummary] as any);

    // Act
    const response = await request(app).get("/clients");

    // Assert
    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(1);
    expect(adminClientService.getAdminClients).toHaveBeenCalled();
  });

  // Teste getAllAdminClients quand il n'y a aucun client
  it("getAllAdminClients_WhenNoClients", async () => {
    // Arrange
    (
      adminClientService.getAdminClients as jest.MockedFunction<
        typeof adminClientService.getAdminClients
      >
    ).mockResolvedValue([]);

    // Act
    const response = await request(app).get("/clients");

    // Assert
    expect(response.status).toBe(200);
    expect(response.body).toEqual([]);
  });

  // Teste getAllAdminClients quand le service retourne une erreur
  it("getAllAdminClients_WhenServiceThrows", async () => {
    // Arrange
    (
      adminClientService.getAdminClients as jest.MockedFunction<
        typeof adminClientService.getAdminClients
      >
    ).mockRejectedValue(new Error("DB error"));

    // Act
    const response = await request(app).get("/clients");

    // Assert
    expect(response.status).toBe(500);
    expect(response.body).toEqual({
      message: "Erreur lors de la récupération des clients",
    });
  });

  // Teste getAdminClientById quand le client existe
  it("getAdminClientById_WhenClientExists", async () => {
    // Arrange
    (
      adminClientService.getAdminClientDetails as jest.MockedFunction<
        typeof adminClientService.getAdminClientDetails
      >
    ).mockResolvedValue(mockClientDetails as any);

    // Act
    const response = await request(app).get("/clients/user-1");

    // Assert
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ id: "user-1", ordersCount: 3 });
    expect(adminClientService.getAdminClientDetails).toHaveBeenCalledWith(
      "user-1",
    );
  });

  // Teste getAdminClientById quand le client n'existe pas
  it("getAdminClientById_WhenClientNotFound", async () => {
    // Arrange
    (
      adminClientService.getAdminClientDetails as jest.MockedFunction<
        typeof adminClientService.getAdminClientDetails
      >
    ).mockResolvedValue(null);

    // Act
    const response = await request(app).get("/clients/user-999");

    // Assert
    expect(response.status).toBe(404);
    expect(response.body).toEqual({ message: "Client non trouvé" });
  });

  // Teste getAdminClientById quand le service retourne une erreur
  it("getAdminClientById_WhenServiceThrows", async () => {
    // Arrange
    (
      adminClientService.getAdminClientDetails as jest.MockedFunction<
        typeof adminClientService.getAdminClientDetails
      >
    ).mockRejectedValue(new Error("DB error"));

    // Act
    const response = await request(app).get("/clients/user-1");

    // Assert
    expect(response.status).toBe(500);
    expect(response.body).toEqual({
      message: "Erreur lors de la récupération du client",
    });
  });

  // Teste getAdminClientHabitsById avec la période "month" (défaut)
  it("getAdminClientHabitsById_WhenPeriodIsDefault", async () => {
    // Arrange
    (
      adminClientService.getAdminClientHabits as jest.MockedFunction<
        typeof adminClientService.getAdminClientHabits
      >
    ).mockResolvedValue(mockHabits);

    // Act
    const response = await request(app).get("/clients/user-1/habits");

    // Assert
    expect(response.status).toBe(200);
    expect(adminClientService.getAdminClientHabits).toHaveBeenCalledWith(
      "user-1",
      "month",
    );
  });

  // Teste getAdminClientHabitsById avec la période "day"
  it("getAdminClientHabitsById_WhenPeriodIsDay", async () => {
    // Arrange
    (
      adminClientService.getAdminClientHabits as jest.MockedFunction<
        typeof adminClientService.getAdminClientHabits
      >
    ).mockResolvedValue(mockHabits);

    // Act
    const response = await request(app).get(
      "/clients/user-1/habits?period=day",
    );

    // Assert
    expect(response.status).toBe(200);
    expect(adminClientService.getAdminClientHabits).toHaveBeenCalledWith(
      "user-1",
      "day",
    );
  });

  // Teste getAdminClientHabitsById avec une période invalide
  it("getAdminClientHabitsById_WhenPeriodIsInvalid", async () => {
    // Act
    const response = await request(app).get(
      "/clients/user-1/habits?period=week",
    );

    // Assert
    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      message: "Période invalide. Utilisez 'day' ou 'month'.",
    });
    expect(adminClientService.getAdminClientHabits).not.toHaveBeenCalled();
  });

  // Teste getAdminClientHabitsById quand le client n'existe pas
  it("getAdminClientHabitsById_WhenClientNotFound", async () => {
    // Arrange
    (
      adminClientService.getAdminClientHabits as jest.MockedFunction<
        typeof adminClientService.getAdminClientHabits
      >
    ).mockResolvedValue(null);

    // Act
    const response = await request(app).get("/clients/user-999/habits");

    // Assert
    expect(response.status).toBe(404);
    expect(response.body).toEqual({ message: "Client non trouvé" });
  });

  // Teste getAdminClientHabitsById quand le service retourne une erreur
  it("getAdminClientHabitsById_WhenServiceThrows", async () => {
    // Arrange
    (
      adminClientService.getAdminClientHabits as jest.MockedFunction<
        typeof adminClientService.getAdminClientHabits
      >
    ).mockRejectedValue(new Error("DB error"));

    // Act
    const response = await request(app).get("/clients/user-1/habits");

    // Assert
    expect(response.status).toBe(500);
    expect(response.body).toEqual({
      message: "Erreur lors de la récupération des habitudes d'achat",
    });
  });

  // Teste exportAdminClientsJson quand des clients existent
  it("exportAdminClientsJson_WhenClientsExist", async () => {
    // Arrange
    (
      adminClientService.getAdminClientsExportJson as jest.MockedFunction<
        typeof adminClientService.getAdminClientsExportJson
      >
    ).mockResolvedValue([mockClientDetails] as any);

    // Act
    const response = await request(app).get("/clients/export/json");

    // Assert
    expect(response.status).toBe(200);
    expect(response.headers["content-type"]).toMatch(/application\/json/);
    expect(response.headers["content-disposition"]).toMatch(
      /attachment; filename="clients-export.json"/,
    );
  });

  // Teste exportAdminClientsJson quand le service retourne une erreur
  it("exportAdminClientsJson_WhenServiceThrows", async () => {
    // Arrange
    (
      adminClientService.getAdminClientsExportJson as jest.MockedFunction<
        typeof adminClientService.getAdminClientsExportJson
      >
    ).mockRejectedValue(new Error("DB error"));

    // Act
    const response = await request(app).get("/clients/export/json");

    // Assert
    expect(response.status).toBe(500);
    expect(response.body).toEqual({
      message: "Erreur lors de l'export JSON des clients",
    });
  });

  // Teste exportAdminClientsCsv quand des clients existent
  it("exportAdminClientsCsv_WhenClientsExist", async () => {
    // Arrange
    const csvContent =
      "id,firstName,lastName,email,phone,address,createdAt,ordersCount,totalSpent,lastPurchaseDate\n" +
      '"user-1","Jean","Dupont","jean@example.com","5141234567","123 rue Test","2024-01-01T00:00:00.000Z",3,150,';

    (
      adminClientService.getAdminClientsExportCsv as jest.MockedFunction<
        typeof adminClientService.getAdminClientsExportCsv
      >
    ).mockResolvedValue(csvContent);

    // Act
    const response = await request(app).get("/clients/export/csv");

    // Assert
    expect(response.status).toBe(200);
    expect(response.headers["content-type"]).toMatch(/text\/csv/);
    expect(response.headers["content-disposition"]).toMatch(
      /attachment; filename="clients-export.csv"/,
    );
  });

  // Teste exportAdminClientsCsv quand le service retourne une erreur
  it("exportAdminClientsCsv_WhenServiceThrows", async () => {
    // Arrange
    (
      adminClientService.getAdminClientsExportCsv as jest.MockedFunction<
        typeof adminClientService.getAdminClientsExportCsv
      >
    ).mockRejectedValue(new Error("DB error"));

    // Act
    const response = await request(app).get("/clients/export/csv");

    // Assert
    expect(response.status).toBe(500);
    expect(response.body).toEqual({
      message: "Erreur lors de l'export CSV des clients",
    });
  });

  // Vérifie qu'un admin peut ajuster les points d'un client et notifier la mise à jour.
  it("updateAdminClientLoyaltyPoints_WhenDeltaIsValid_ReturnsUpdatedPoints", async () => {
    (
      adminClientService.adjustAdminClientLoyaltyPoints as jest.MockedFunction<
        typeof adminClientService.adjustAdminClientLoyaltyPoints
      >
    ).mockResolvedValue({ id: "user-1", loyaltyPoints: 1750 });

    const response = await request(app)
      .patch("/clients/user-1/loyalty-points")
      .send({ pointsDelta: 506 });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ id: "user-1", loyaltyPoints: 1750 });
    expect(adminClientService.adjustAdminClientLoyaltyPoints).toHaveBeenCalledWith(
      "user-1",
      510,
    );
    expect(notifyUserLoyaltyPointsChanged).toHaveBeenCalledWith("user-1");
  });

  // Vérifie qu'un ajustement de points invalide retourne 400 sans appeler le service.
  it("updateAdminClientLoyaltyPoints_WhenDeltaIsInvalid_Returns400", async () => {
    const response = await request(app)
      .patch("/clients/user-1/loyalty-points")
      .send({ pointsDelta: 1.5 });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      message:
        "Le nombre de points doit être au moins 10 ou -10, par tranche de 10.",
    });
    expect(adminClientService.adjustAdminClientLoyaltyPoints).not.toHaveBeenCalled();
  });

  // Vérifie que l'ajustement de points retourne 404 quand le client est introuvable.
  it("updateAdminClientLoyaltyPoints_WhenClientMissing_Returns404", async () => {
    (
      adminClientService.adjustAdminClientLoyaltyPoints as jest.MockedFunction<
        typeof adminClientService.adjustAdminClientLoyaltyPoints
      >
    ).mockResolvedValue(null);

    const response = await request(app)
      .patch("/clients/missing/loyalty-points")
      .send({ pointsDelta: 500 });

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ message: "Client non trouvé" });
  });
});
