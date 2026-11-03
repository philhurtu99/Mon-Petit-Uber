import { prismaMock } from "../prismaMock";
import { getLivreurDashboard } from "../../services/livreurDashboard.service";
import { describe, expect, it, jest, beforeEach } from "@jest/globals";

const now = new Date("2026-05-27T20:00:00.000Z");
const pickedUpAt = new Date("2026-05-27T20:10:00.000Z");
const deliveredAt = new Date("2026-05-27T20:15:00.000Z"); // 5 min après

const makeCommande = (overrides = {}) => ({
  id: 1,
  createdAt: now,
  deliveryPickedUpAt: pickedUpAt,
  deliveredAt: deliveredAt,
  employeeReview: null,
  ...overrides,
});

describe("LivreurDashboardServiceTests", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ============================================================
  // GET LIVREUR DASHBOARD
  // ============================================================

  //---------------------------------------------------------------
  // Teste getLivreurDashboard quand il n'y a pas de livraisons
  it("getLivreurDashboard_WhenNoDeliveries", async () => {
    // Arrange
    prismaMock.commande.findMany.mockResolvedValue([]);

    // Act
    const result = await getLivreurDashboard("livreur-1");

    // Assert
    expect(result.stats.totalOrders).toBe(0);
    expect(result.stats.totalReviews).toBe(0);
    expect(result.stats.averageRating).toBe(0);
    expect(result.stats.totalDurationMinutes).toBe(0);
    expect(result.stats.averageDurationMinutes).toBe(0);
    expect(result.deliveries).toEqual([]);
  });

  //---------------------------------------------------------------
  // Teste getLivreurDashboard quand il y a des livraisons sans reviews
  it("getLivreurDashboard_WhenDeliveriesExistWithoutReviews", async () => {
    // Arrange
    prismaMock.commande.findMany.mockResolvedValue([
      makeCommande({ id: 1 }),
      makeCommande({ id: 2 }),
    ] as any);

    // Act
    const result = await getLivreurDashboard("livreur-1");

    // Assert
    expect(result.stats.totalOrders).toBe(2);
    expect(result.stats.totalReviews).toBe(0);
    expect(result.stats.averageRating).toBe(0);
    expect(result.deliveries).toHaveLength(2);
    expect(result.deliveries[0].rating).toBeNull();
  });

  //---------------------------------------------------------------
  // Teste getLivreurDashboard quand il y a des livraisons avec reviews
  it("getLivreurDashboard_WhenDeliveriesExistWithReviews", async () => {
    // Arrange
    prismaMock.commande.findMany.mockResolvedValue([
      makeCommande({ id: 1, employeeReview: { rating: 5 } }),
      makeCommande({ id: 2, employeeReview: { rating: 4 } }),
    ] as any);

    // Act
    const result = await getLivreurDashboard("livreur-1");

    // Assert
    expect(result.stats.totalReviews).toBe(2);
    expect(result.stats.averageRating).toBe(4.5);
    expect(result.deliveries[0].rating).toBe(5);
    expect(result.deliveries[1].rating).toBe(4);
  });

  //---------------------------------------------------------------
  // Teste getLivreurDashboard que la durée est calculée correctement
  it("getLivreurDashboard_WhenDurationIsCalculatedCorrectly", async () => {
    // Arrange — pickedUpAt et deliveredAt avec 5 min de différence
    prismaMock.commande.findMany.mockResolvedValue([
      makeCommande({ id: 1 }),
    ] as any);

    // Act
    const result = await getLivreurDashboard("livreur-1");

    // Assert
    expect(result.deliveries[0].durationMinutes).toBe(5);
    expect(result.stats.totalDurationMinutes).toBe(5);
    expect(result.stats.averageDurationMinutes).toBe(5);
  });

  //---------------------------------------------------------------
  // Teste getLivreurDashboard quand deliveredAt est null
  it("getLivreurDashboard_WhenDeliveredAtIsNull", async () => {
    // Arrange
    prismaMock.commande.findMany.mockResolvedValue([
      makeCommande({ id: 1, deliveredAt: null }),
    ] as any);

    // Act
    const result = await getLivreurDashboard("livreur-1");

    // Assert
    expect(result.deliveries[0].durationMinutes).toBeNull();
    expect(result.stats.totalDurationMinutes).toBe(0);
    expect(result.stats.averageDurationMinutes).toBe(0);
  });

  //---------------------------------------------------------------
  // Teste getLivreurDashboard que la moyenne des durées est correcte
  it("getLivreurDashboard_WhenAverageDurationIsCalculatedCorrectly", async () => {
    // Arrange — une commande de 5 min et une de 15 min
    const deliveredAt15 = new Date(pickedUpAt.getTime() + 15 * 60000);
    prismaMock.commande.findMany.mockResolvedValue([
      makeCommande({ id: 1, deliveredAt: deliveredAt }),        // 5 min
      makeCommande({ id: 2, deliveredAt: deliveredAt15 }),      // 15 min
    ] as any);

    // Act
    const result = await getLivreurDashboard("livreur-1");

    // Assert
    expect(result.stats.totalDurationMinutes).toBe(20);
    expect(result.stats.averageDurationMinutes).toBe(10);
  });

  //---------------------------------------------------------------
  // Teste getLivreurDashboard que la moyenne des notes est arrondie à 1 décimale
  it("getLivreurDashboard_WhenAverageRatingIsRoundedCorrectly", async () => {
    // Arrange
    prismaMock.commande.findMany.mockResolvedValue([
      makeCommande({ id: 1, employeeReview: { rating: 5 } }),
      makeCommande({ id: 2, employeeReview: { rating: 4 } }),
      makeCommande({ id: 3, employeeReview: { rating: 3 } }),
    ] as any);

    // Act
    const result = await getLivreurDashboard("livreur-1");

    // Assert
    expect(result.stats.averageRating).toBe(4); // (5+4+3)/3 = 4.0
  });

  //---------------------------------------------------------------
  // Teste getLivreurDashboard que la query prisma est correcte
  it("getLivreurDashboard_WhenQueryIsCorrect", async () => {
    // Arrange
    prismaMock.commande.findMany.mockResolvedValue([]);

    // Act
    await getLivreurDashboard("livreur-1");

    // Assert
    expect(prismaMock.commande.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          livreurId: "livreur-1",
          etat: "COMPLETEE",
          type: "LIVRAISON",
        },
        orderBy: { deliveredAt: "desc" },
      })
    );
  });
});