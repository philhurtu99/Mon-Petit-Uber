import { prismaMock } from "../prismaMock";
import { describe, expect, it } from "@jest/globals";
import {
  getAdminClients,
  getAdminClientDetails,
  getAdminClientHabits,
  getAdminClientsExportCsv,
  getAdminClientsExportJson,
  adjustAdminClientLoyaltyPoints,
  LoyaltyPointsLimitError,
} from "../../services/adminClient.service";
import { LOYALTY_MAX_POINTS } from "../../config/loyalty.config";

const makePrismaUser = (overrides: Partial<any> = {}) => ({
  id: "user-1",
  firstName: "Jean",
  lastName: "Dupont",
  email: "jean@example.com",
  phone: "5141234567",
  address: "123 rue Test",
  profilePicture: null,
  createdAt: new Date("2024-01-01"),
  loyaltyPoints: 0,
  transactions: [],
  ...overrides,
});

const makePrismaUserDetails = (overrides: Partial<any> = {}) => ({
  id: "user-1",
  firstName: "Marie",
  lastName: "Martin",
  email: "marie@example.com",
  phone: "5149876543",
  address: "456 av Principale",
  profilePicture: null,
  creditBalance: 10.0,
  loyaltyPoints: 0,
  createdAt: new Date("2024-01-01"),
  updatedAt: new Date("2024-09-01"),
  transactions: [],
  ...overrides,
});

describe("AdminClientServiceTests", () => {
  // Teste getAdminClients quand il n'y a aucun client
  it("getAdminClients_WhenNoClients", async () => {
    // Arrange
    prismaMock.user.findMany.mockResolvedValue([]);

    // Act
    const result = await getAdminClients();

    // Assert
    expect(result).toEqual([]);
  });

  // Teste getAdminClients quand des clients existent
  it("getAdminClients_WhenClientsExist_ReturnsMappedFields", async () => {
    // Arrange
    const purchaseDate = new Date("2024-09-01");
    prismaMock.user.findMany.mockResolvedValue([
      makePrismaUser({
        transactions: [
          { id: 1, total: 50.0, purchaseDate },
          { id: 2, total: 30.0, purchaseDate: new Date("2024-06-01") },
        ],
      }),
    ] as any);

    // Act
    const result = await getAdminClients();

    // Assert
    expect(result).toHaveLength(1);
    expect(result[0]?.ordersCount).toBe(2);
    expect(result[0]?.totalSpent).toBe(80.0);
    expect(result[0]?.lastPurchaseDate).toEqual(purchaseDate);
  });

  // Teste getAdminClients quand le client n'a aucune transaction
  it("getAdminClients_WhenClientHasNoTransactions_LastPurchaseDateIsNull", async () => {
    // Arrange
    prismaMock.user.findMany.mockResolvedValue([
      makePrismaUser({ transactions: [] }),
    ] as any);

    // Act
    const result = await getAdminClients();

    // Assert
    expect(result[0]?.ordersCount).toBe(0);
    expect(result[0]?.totalSpent).toBe(0);
    expect(result[0]?.lastPurchaseDate).toBeNull();
  });

  // Teste getAdminClients que le tri se fait par ordersCount décroissant
  it("getAdminClients_SortedByOrdersCountDesc", async () => {
    // Arrange
    prismaMock.user.findMany.mockResolvedValue([
      makePrismaUser({
        id: "user-1",
        transactions: [{ id: 1, total: 10, purchaseDate: new Date() }],
      }),
      makePrismaUser({
        id: "user-2",
        transactions: [
          { id: 2, total: 10, purchaseDate: new Date() },
          { id: 3, total: 10, purchaseDate: new Date() },
          { id: 4, total: 10, purchaseDate: new Date() },
        ],
      }),
      makePrismaUser({
        id: "user-3",
        transactions: [
          { id: 5, total: 10, purchaseDate: new Date() },
          { id: 6, total: 10, purchaseDate: new Date() },
        ],
      }),
    ] as any);

    // Act
    const result = await getAdminClients();

    // Assert
    expect(result[0]?.id).toBe("user-2"); // 3 commandes
    expect(result[1]?.id).toBe("user-3"); // 2 commandes
    expect(result[2]?.id).toBe("user-1"); // 1 commande
  });

  // Teste getAdminClients que le tri secondaire se fait par totalSpent décroissant
  it("getAdminClients_WhenSameOrderCount_SortedByTotalSpentDesc", async () => {
    // Arrange
    prismaMock.user.findMany.mockResolvedValue([
      makePrismaUser({
        id: "user-pauvre",
        transactions: [{ id: 1, total: 20.0, purchaseDate: new Date() }],
      }),
      makePrismaUser({
        id: "user-riche",
        transactions: [{ id: 2, total: 200.0, purchaseDate: new Date() }],
      }),
    ] as any);

    // Act
    const result = await getAdminClients();

    // Assert
    expect(result[0]?.id).toBe("user-riche");
    expect(result[1]?.id).toBe("user-pauvre");
  });

  // Teste getAdminClients que totalSpent est arrondi à 2 décimales
  it("getAdminClients_TotalSpent_IsRounded", async () => {
    // Arrange
    prismaMock.user.findMany.mockResolvedValue([
      makePrismaUser({
        transactions: [
          { id: 1, total: 0.1, purchaseDate: new Date() },
          { id: 2, total: 0.2, purchaseDate: new Date() },
        ],
      }),
    ] as any);

    // Act
    const result = await getAdminClients();

    // Assert
    // 0.1 + 0.2 = 0.30000000000000004 en JS → roundMoney doit retourner 0.30
    expect(result[0]?.totalSpent).toBe(0.3);
  });

  // Teste getAdminClientDetails quand le client n'existe pas
  it("getAdminClientDetails_WhenClientNotFound", async () => {
    // Arrange
    prismaMock.user.findUnique.mockResolvedValue(null);

    // Act
    const result = await getAdminClientDetails("user-999");

    // Assert
    expect(result).toBeNull();
  });

  // Teste getAdminClientDetails quand le client existe sans transactions
  it("getAdminClientDetails_WhenClientHasNoOrders", async () => {
    // Arrange
    prismaMock.user.findUnique.mockResolvedValue(
      makePrismaUserDetails({ transactions: [] }) as any,
    );

    // Act
    const result = await getAdminClientDetails("user-1");

    // Assert
    expect(result).not.toBeNull();
    expect(result!.ordersCount).toBe(0);
    expect(result!.totalSpent).toBe(0);
    expect(result!.orders).toEqual([]);
  });
  // Teste getAdminClientDetails que la structure complète est retournée
  it("getAdminClientDetails_WhenClientExists_ReturnsFullStructure", async () => {
    // Arrange
    prismaMock.user.findUnique.mockResolvedValue(
      makePrismaUserDetails({
        transactions: [
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
              createdAt: new Date(),
              updatedAt: new Date(),
              readyForPickupAt: null,
              deliveryPickedUpAt: null,
            },
            items: [
              {
                id: 101,
                quantity: 2,
                price: 25.0,
                product: { id: 5, name: "Pizza", imageUrl: "pizza.jpg" },
              },
            ],
          },
        ],
      }) as any,
    );

    // Act
    const result = await getAdminClientDetails("user-1");

    // Assert
    expect(result!.ordersCount).toBe(1);
    expect(result!.totalSpent).toBe(50.0);
    expect(result!.orders).toHaveLength(1);
    expect(result?.orders[0]?.items[0]?.productName).toBe("Pizza");
  });

  // Teste getAdminClientDetails que lineTotal = price * quantity arrondi
  it("getAdminClientDetails_LineTotalIsCalculated", async () => {
    // Arrange
    prismaMock.user.findUnique.mockResolvedValue(
      makePrismaUserDetails({
        transactions: [
          {
            id: 1,
            purchaseDate: new Date(),
            total: 37.47,
            creditUsed: 0,
            loyaltyPointsUsed: 0,
            loyaltyDiscount: 0,
            loyaltyPointsEarned: 0,
            stripeAmountPaid: 37.47,
            commande: null,
            items: [
              {
                id: 101,
                quantity: 3,
                price: 12.49,
                product: { id: 5, name: "Burger", imageUrl: "burger.jpg" },
              },
            ],
          },
        ],
      }) as any,
    );

    // Act
    const result = await getAdminClientDetails("user-1");

    // Assert
    // 12.49 * 3 = 37.47
    expect(result?.orders[0]?.items[0]?.lineTotal).toBe(37.47);
  });

  // Teste getAdminClientDetails que totalSpent est arrondi à 2 décimales
  it("getAdminClientDetails_TotalSpent_IsRounded", async () => {
    // Arrange
    prismaMock.user.findUnique.mockResolvedValue(
      makePrismaUserDetails({
        transactions: [
          {
            id: 1,
            purchaseDate: new Date(),
            total: 0.1,
            creditUsed: 0,
            loyaltyPointsUsed: 0,
            loyaltyDiscount: 0,
            loyaltyPointsEarned: 0,
            stripeAmountPaid: 0.1,
            commande: null,
            items: [],
          },
          {
            id: 2,
            purchaseDate: new Date(),
            total: 0.2,
            creditUsed: 0,
            loyaltyPointsUsed: 0,
            loyaltyDiscount: 0,
            loyaltyPointsEarned: 0,
            stripeAmountPaid: 0.2,
            commande: null,
            items: [],
          },
        ],
      }) as any,
    );

    // Act
    const result = await getAdminClientDetails("user-1");

    // Assert
    expect(result!.totalSpent).toBe(0.3);
  });

  // Teste getAdminClientHabits quand le client n'existe pas
  it("getAdminClientHabits_WhenClientNotFound", async () => {
    // Arrange
    prismaMock.user.findUnique.mockResolvedValue(null);

    // Act
    const result = await getAdminClientHabits("user-999", "month");

    // Assert
    expect(result).toBeNull();
  });

  // Teste getAdminClientHabits quand le client n'a aucune transaction
  it("getAdminClientHabits_WhenNoTransactions", async () => {
    // Arrange
    prismaMock.user.findUnique.mockResolvedValue({
      id: "user-1",
      transactions: [],
    } as any);

    // Act
    const result = await getAdminClientHabits("user-1", "month");

    // Assert
    expect(result).toEqual([]);
  });

  // Teste getAdminClientHabits avec period "month" regroupe par année-mois
  it("getAdminClientHabits_WithMonthPeriod_GroupsByYearMonth", async () => {
    // Arrange
    prismaMock.user.findUnique.mockResolvedValue({
      id: "user-1",
      transactions: [
        {
          id: 1,
          total: 50.0,
          purchaseDate: new Date("2024-01-10"),
          items: [{ quantity: 2 }],
        },
        {
          id: 2,
          total: 30.0,
          purchaseDate: new Date("2024-01-25"),
          items: [{ quantity: 1 }],
        },
        {
          id: 3,
          total: 20.0,
          purchaseDate: new Date("2024-02-05"),
          items: [{ quantity: 4 }],
        },
      ],
    } as any);

    // Act
    const result = await getAdminClientHabits("user-1", "month");

    // Assert
    expect(result).toHaveLength(2);
    const jan = result!.find((h) => h.period === "2024-01");
    expect(jan?.ordersCount).toBe(2);
    expect(jan?.itemsCount).toBe(3);
    expect(jan?.totalSpent).toBe(80.0);
  });

  // Teste getAdminClientHabits avec period "day" regroupe par année-mois-jour
  it("getAdminClientHabits_WithDayPeriod_GroupsByDay", async () => {
    // Arrange
    const sameDay = new Date(2024, 0, 10, 12); // 10 jan local midi
    const otherDay = new Date(2024, 0, 15, 12); // 15 jan local midi

    prismaMock.user.findUnique.mockResolvedValue({
      id: "user-1",
      transactions: [
        { id: 1, total: 50.0, purchaseDate: sameDay, items: [{ quantity: 2 }] },
        { id: 2, total: 30.0, purchaseDate: sameDay, items: [{ quantity: 1 }] },
        {
          id: 3,
          total: 20.0,
          purchaseDate: otherDay,
          items: [{ quantity: 4 }],
        },
      ],
    } as any);

    // Act
    const result = await getAdminClientHabits("user-1", "day");

    // Assert
    expect(result).toHaveLength(2);
    const groupWith2Orders = result!.find((h) => h.ordersCount === 2);
    expect(groupWith2Orders).toBeDefined();
    expect(groupWith2Orders?.itemsCount).toBe(3);
    expect(groupWith2Orders?.totalSpent).toBe(80.0);
  });

  // Teste getAdminClientHabits que les résultats sont triés par période croissante
  it("getAdminClientHabits_SortedByPeriodAsc", async () => {
    // Arrange
    prismaMock.user.findUnique.mockResolvedValue({
      id: "user-1",
      transactions: [
        { id: 1, total: 10.0, purchaseDate: new Date(2024, 2, 15), items: [] }, // mars
        { id: 2, total: 10.0, purchaseDate: new Date(2024, 0, 15), items: [] }, // janvier
        { id: 3, total: 10.0, purchaseDate: new Date(2024, 5, 15), items: [] }, // juin
      ],
    } as any);

    // Act
    const result = await getAdminClientHabits("user-1", "month");

    // Assert
    expect(result?.[0]?.period).toBe("2024-01");
    expect(result?.[1]?.period).toBe("2024-03");
    expect(result?.[2]?.period).toBe("2024-06");
  });

  // Teste getAdminClientHabits que totalSpent est arrondi à 2 décimales
  it("getAdminClientHabits_TotalSpent_IsRounded", async () => {
    // Arrange
    // Les deux transactions sont dans le même mois (janvier local)
    prismaMock.user.findUnique.mockResolvedValue({
      id: "user-1",
      transactions: [
        {
          id: 1,
          total: 0.1,
          purchaseDate: new Date(2024, 0, 10),
          items: [{ quantity: 1 }],
        },
        {
          id: 2,
          total: 0.2,
          purchaseDate: new Date(2024, 0, 20),
          items: [{ quantity: 1 }],
        },
      ],
    } as any);

    // Act
    const result = await getAdminClientHabits("user-1", "month");

    // Assert
    // 0.1 + 0.2 = 0.30000000000000004 en JS → roundMoney doit retourner 0.30
    expect(result).toHaveLength(1);
    expect(result?.[0]?.totalSpent).toBe(0.3);
  });

  // Teste getAdminClientsExportCsv quand il n'y a aucun client
  it("getAdminClientsExportCsv_WhenNoClients_ReturnsHeadersOnly", async () => {
    // Arrange
    prismaMock.user.findMany.mockResolvedValue([]);

    // Act
    const result = await getAdminClientsExportCsv();

    // Assert
    const lines = result.split("\n");
    expect(lines).toHaveLength(1);
    expect(lines[0] ?? "").toBe(
      "id,firstName,lastName,email,phone,address,createdAt,loyaltyPoints,ordersCount,totalSpent,lastPurchaseDate",
    );
  });

  // Teste getAdminClientsExportCsv que chaque client génère une ligne de données
  it("getAdminClientsExportCsv_WhenClientsExist_GeneratesDataRows", async () => {
    // Arrange
    prismaMock.user.findMany.mockResolvedValue([
      makePrismaUser({ transactions: [] }),
      makePrismaUser({
        id: "user-2",
        email: "user2@example.com",
        transactions: [],
      }),
    ] as any);

    // Act
    const result = await getAdminClientsExportCsv();

    // Assert
    const lines = result.split("\n");
    expect(lines).toHaveLength(3); // 1 header + 2 lignes de données
  });

  // Teste getAdminClientsExportCsv que les valeurs avec virgule sont entre guillemets
  it("getAdminClientsExportCsv_EscapesCommasInValues", async () => {
    // Arrange
    prismaMock.user.findMany.mockResolvedValue([
      makePrismaUser({ address: "123, rue des Tests", transactions: [] }),
    ] as any);

    // Act
    const result = await getAdminClientsExportCsv();

    // Assert
    const dataRow = result.split("\n")[1] ?? "";
    expect(dataRow).toContain('"123, rue des Tests"');
  });

  // Teste getAdminClientsExportCsv que les guillemets dans les valeurs sont échappés
  it("getAdminClientsExportCsv_EscapesQuotesInValues", async () => {
    // Arrange
    prismaMock.user.findMany.mockResolvedValue([
      makePrismaUser({ firstName: 'Jean "Jojo"', transactions: [] }),
    ] as any);

    // Act
    const result = await getAdminClientsExportCsv();

    // Assert
    const dataRow = result.split("\n")[1] ?? "";
    expect(dataRow).toContain('"Jean ""Jojo"""');
  });

  // Teste getAdminClientsExportCsv que les valeurs null produisent une cellule vide
  it("getAdminClientsExportCsv_NullValuesProduceEmptyCell", async () => {
    // Arrange
    prismaMock.user.findMany.mockResolvedValue([
      makePrismaUser({ phone: null, address: null, transactions: [] }),
    ] as any);

    // Act
    const result = await getAdminClientsExportCsv();

    // Assert
    const dataRow = result.split("\n")[1] ?? "";
    const fields = dataRow.split(",");
    expect(fields[4] ?? "").toBe("");
    expect(fields[5] ?? "").toBe("");
  });

  // Teste getAdminClientsExportJson retourne les fiches détaillées de tous les clients
  it("getAdminClientsExportJson_ReturnsDetailedClientsForAll", async () => {
    // Arrange
    const prismaUser = makePrismaUser({ transactions: [] });
    const prismaUserDetails = makePrismaUserDetails({ transactions: [] });

    prismaMock.user.findMany.mockResolvedValue([prismaUser] as any);
    prismaMock.user.findUnique.mockResolvedValue(prismaUserDetails as any);

    // Act
    const result = await getAdminClientsExportJson();

    // Assert
    expect(result).toHaveLength(1);
    expect(prismaMock.user.findUnique).toHaveBeenCalledTimes(1);
  });
});

describe("AdminClientLoyaltyPointsServiceTests", () => {
  // Vérifie qu'un ajustement admin positif ajoute des points au solde du client.
  it("AdjustAdminClientLoyaltyPoints_WhenClientExists_AddsPoints", async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      id: "user-1",
      role: "user",
      loyaltyPoints: 1000,
    } as any);
    prismaMock.user.update.mockResolvedValue({
      id: "user-1",
      loyaltyPoints: 1500,
    } as any);

    const result = await adjustAdminClientLoyaltyPoints("user-1", 500);

    expect(result).toEqual({ id: "user-1", loyaltyPoints: 1500 });
    expect(prismaMock.user.update).toHaveBeenCalledWith({
      where: { id: "user-1" },
      data: { loyaltyPoints: 1500 },
      select: {
        id: true,
        loyaltyPoints: true,
      },
    });
  });

  // Vérifie qu'un ajustement admin est arrondi à la tranche de 10 points la plus proche.
  it("AdjustAdminClientLoyaltyPoints_RoundsDeltaToNearestTen", async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      id: "user-1",
      role: "user",
      loyaltyPoints: 1000,
    } as any);
    prismaMock.user.update.mockResolvedValue({
      id: "user-1",
      loyaltyPoints: 1510,
    } as any);

    const result = await adjustAdminClientLoyaltyPoints("user-1", 506);

    expect(result).toEqual({ id: "user-1", loyaltyPoints: 1510 });
    expect(prismaMock.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { loyaltyPoints: 1510 },
      }),
    );
  });

  // Vérifie qu'un retrait supérieur au solde ramène les points à zéro sans solde négatif.
  it("AdjustAdminClientLoyaltyPoints_WhenRemovingMoreThanBalance_FloorsAtZero", async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      id: "user-1",
      role: "user",
      loyaltyPoints: 300,
    } as any);
    prismaMock.user.update.mockResolvedValue({
      id: "user-1",
      loyaltyPoints: 0,
    } as any);

    await adjustAdminClientLoyaltyPoints("user-1", -1000);

    expect(prismaMock.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { loyaltyPoints: 0 },
      }),
    );
  });

  // Vérifie que l'ajustement retourne null quand le client est introuvable.
  it("AdjustAdminClientLoyaltyPoints_WhenClientMissing_ReturnsNull", async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);

    await expect(
      adjustAdminClientLoyaltyPoints("missing", 500),
    ).resolves.toBeNull();
    expect(prismaMock.user.update).not.toHaveBeenCalled();
  });

  // Vérifie que l'ajustement refuse les comptes qui ne sont pas des clients.
  it("AdjustAdminClientLoyaltyPoints_WhenUserIsNotClient_ReturnsNull", async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      id: "admin-1",
      role: "admin",
      loyaltyPoints: 1000,
    } as any);

    await expect(
      adjustAdminClientLoyaltyPoints("admin-1", 500),
    ).resolves.toBeNull();
    expect(prismaMock.user.update).not.toHaveBeenCalled();
  });

  // Vérifie qu'un ajout arrondi au-dessus du cap maximal est refusé.
  it("AdjustAdminClientLoyaltyPoints_WhenAddingPastCap_RejectsUpdate", async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      id: "user-1",
      role: "user",
      loyaltyPoints: LOYALTY_MAX_POINTS - 50,
    } as any);

    await expect(
      adjustAdminClientLoyaltyPoints("user-1", 56),
    ).rejects.toBeInstanceOf(LoyaltyPointsLimitError);
    expect(prismaMock.user.update).not.toHaveBeenCalled();
  });
});
