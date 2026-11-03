import { prismaMock } from "../prismaMock";
import { jest } from "@jest/globals";

jest.mock("../../services/loyalty.service", () => ({
  awardLoyaltyPointsForCompletedOrder: jest.fn(),
}));

import {
  cancelActiveOrderByUser,
  confirmOrderCode,
  getActiveOrderByUser,
  getAllActiveOrders,
  getAllFinishedOrders,
  OrderRequestError,
  toCommandeDashboardDTO,
  toCommandeDashboardDTOList,
  triggerReadyForPickup,
} from "../../services/orders.service";
import { awardLoyaltyPointsForCompletedOrder } from "../../services/loyalty.service";

const makeCommande = (overrides: any) =>
  ({
    id: 1,
    type: "PICKUP",
    etat: "EN_PREPARATION",
    transactionId: 1,
    livreurId: null,
    preparateurId: null,
    readyForPickupAt: null,
    codeConfirmation: "ABC123",
    createdAt: new Date("2026-04-01T10:00:00Z"),
    updatedAt: new Date("2026-04-01T10:00:00Z"),
    ...overrides,
  }) as any;

describe("OrdersServiceTests", () => {
  it("TriggerReadyForPickup_WhenOrderIsNotOldest_Throws409", async () => {
    prismaMock.commande.findUnique.mockResolvedValue(
      makeCommande({
        id: 2,
        createdAt: new Date("2026-04-01T10:05:00Z"),
      }),
    );
    prismaMock.commande.findFirst.mockResolvedValue(
      makeCommande({
        id: 1,
        createdAt: new Date("2026-04-01T10:00:00Z"),
      }),
    );

    await expect(triggerReadyForPickup(2, "emp_1")).rejects.toThrow(
      "Vous devez compléter la plus vieille en premier (#1).",
    );
    await expect(triggerReadyForPickup(2, "emp_1")).rejects.toMatchObject({
      status: 409,
    });
    expect(prismaMock.commande.update).not.toHaveBeenCalled();
  });

  it("TriggerReadyForPickup_WhenOrderIsOldest_MarksPickupReady", async () => {
    const commande = makeCommande({ id: 1, type: "PICKUP" });
    const readyCommande = makeCommande({
      id: 1,
      type: "PICKUP",
      etat: "READY_FOR_PICKUP",
    });

    prismaMock.commande.findUnique.mockResolvedValue(commande);
    prismaMock.commande.findFirst.mockResolvedValue(makeCommande({ id: 1 }));
    prismaMock.commande.update.mockResolvedValue(readyCommande);

    const result = await triggerReadyForPickup(1, "emp_1");

    expect(prismaMock.commande.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 1 },
        data: expect.objectContaining({
          etat: "READY_FOR_PICKUP",
          preparateurId: "emp_1",
        }),
      }),
    );
    expect(result).toBe(readyCommande);
  });

  it("TriggerReadyForPickup_WhenLivraisonIsOldest_MarksDeliveryReady", async () => {
    const commande = makeCommande({ id: 3, type: "LIVRAISON" });
    const readyCommande = makeCommande({
      id: 3,
      type: "LIVRAISON",
      etat: "READY_FOR_DELIVERY",
    });

    prismaMock.commande.findUnique.mockResolvedValue(commande);
    prismaMock.commande.findFirst.mockResolvedValue(makeCommande({ id: 3 }));
    prismaMock.commande.update.mockResolvedValue(readyCommande);

    await triggerReadyForPickup(3, "emp_1");

    expect(prismaMock.commande.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          etat: "READY_FOR_DELIVERY",
        }),
      }),
    );
  });

  it("OrderRequestError_StoresStatus", () => {
    const error = new OrderRequestError(400, "Erreur");

    expect(error.status).toBe(400);
    expect(error.message).toBe("Erreur");
  });
});


describe("GetActiveCommandeByUser", () => {


  // Vérifie qu'une commande active existante est bien retournée avec le bon filtre userId

  it("GetActiveCommandeByUser_WhenActiveOrderExists_ReturnsIt", async () => {
    const commande = makeCommande({ etat: "EN_PREPARATION" });
    prismaMock.commande.findFirst.mockResolvedValue(commande);

    const result = await getActiveOrderByUser("user_1");

    expect(prismaMock.commande.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          transaction: { userId: "user_1" },
          etat: { notIn: ["COMPLETEE", "ANNULEE"] },
        },
        orderBy: { createdAt: "desc" },
      }),
    );
    expect(result).toBe(commande);
  });


  // Vérifie que null est retourné lorsqu'aucune commande active n'existe pour l'utilisateur

  it("GetActiveCommandeByUser_WhenNoActiveOrder_ReturnsNull", async () => {
    prismaMock.commande.findFirst.mockResolvedValue(null);

    const result = await getActiveOrderByUser("user_1");

    expect(result).toBeNull();
  });


  // Vérifie que le filtre userId est transmis correctement à Prisma

  it("GetActiveCommandeByUser_UsesCorrectUserIdFilter", async () => {
    prismaMock.commande.findFirst.mockResolvedValue(null);

    await getActiveOrderByUser("user_42");

    expect(prismaMock.commande.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          transaction: { userId: "user_42" },
        }),
      }),
    );
  });
});

describe("CancelActiveOrderByUser", () => {
  it("CancelActiveOrderByUser_WhenOrderCanBeCancelled_ReturnsOrderId", async () => {
    const commande = makeCommande({
      id: 12,
      etat: "EN_PREPARATION",
      preparateurId: null,
      transaction: {
        userId: "user_1",
        total: 25,
        items: [{ productId: 3, quantity: 1 }],
      },
    });
    const tx: any = {
      commande: { updateMany: jest.fn(async () => ({ count: 1 })) },
      user: {
        findUnique: jest.fn(async () => ({ loyaltyPoints: 0 })),
        update: jest.fn(async () => ({})),
      },
      product: { update: jest.fn(async () => ({})) },
    };

    prismaMock.commande.findUnique.mockResolvedValue(commande);
    prismaMock.$transaction.mockImplementation(async (callback: any) =>
      callback(tx),
    );

    await expect(cancelActiveOrderByUser(12, "user_1")).resolves.toBe(12);
  });

  it("CancelActiveOrderByUser_WhenOrderCannotBeCancelled_Throws409", async () => {
    prismaMock.commande.findUnique.mockResolvedValue(
      makeCommande({
        id: 12,
        etat: "READY_FOR_PICKUP",
        transaction: {
          userId: "user_1",
          total: 25,
          items: [],
        },
      }),
    );

    await expect(cancelActiveOrderByUser(12, "user_1")).rejects.toMatchObject({
      status: 409,
      message: "Cette commande ne peut plus être annulée.",
    });
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });
});

describe("ConfirmCommandeCode", () => {


  // Vérifie qu'une erreur 404 est levée si la commande n'existe pas en base

  it("ConfirmCommandeCode_WhenOrderNotFound_Throws404", async () => {
    prismaMock.commande.findUnique.mockResolvedValue(null);

    await expect(confirmOrderCode(99, "ABC123")).rejects.toMatchObject({
      status: 404,
      message: "Commande introuvable",
    });
    expect(prismaMock.commande.update).not.toHaveBeenCalled();
  });


  // Vérifie qu'une erreur 409 est levée si la commande n'est pas dans un état éligible à la confirmation

  it("ConfirmCommandeCode_WhenNotReadyForPickup_Throws409", async () => {
    prismaMock.commande.findUnique.mockResolvedValue(
      makeCommande({ etat: "EN_PREPARATION" }),
    );

    await expect(confirmOrderCode(1, "ABC123")).rejects.toMatchObject({
      status: 409,
    });
    expect(prismaMock.commande.update).not.toHaveBeenCalled();
  });


  // Vérifie qu'une erreur 400 est levée si le code de confirmation fourni est incorrect

  it("ConfirmCommandeCode_WhenCodeIsWrong_Throws400", async () => {
    prismaMock.commande.findUnique.mockResolvedValue(
      makeCommande({ etat: "READY_FOR_PICKUP", codeConfirmation: "ABC123" }),
    );

    await expect(confirmOrderCode(1, "WRONG")).rejects.toMatchObject({
      status: 400,
      message: "Code incorrect",
    });
    expect(prismaMock.commande.update).not.toHaveBeenCalled();
  });


  // Vérifie qu'une commande READY_FOR_PICKUP avec le bon code est bien marquée COMPLETEE

  it("ConfirmCommandeCode_WhenReadyForPickupAndCodeCorrect_MarksComplete", async () => {
    const commande = makeCommande({
      etat: "READY_FOR_PICKUP",
      codeConfirmation: "ABC123",
    });
    const completed = makeCommande({ etat: "COMPLETEE" });

    prismaMock.commande.findUnique.mockResolvedValue(commande);
    prismaMock.commande.update.mockResolvedValue(completed);

    const result = await confirmOrderCode(1, "ABC123");

    expect(prismaMock.commande.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 1 },
        data: { etat: "COMPLETEE" },
      }),
    );
    expect(awardLoyaltyPointsForCompletedOrder).toHaveBeenCalledWith(1);
    expect(result).toBe(completed);
  });


  // Vérifie qu'une commande IN_DELIVERY avec le bon code est également marquée COMPLETEE

  it("ConfirmCommandeCode_WhenInDeliveryAndCodeCorrect_MarksComplete", async () => {
    const commande = makeCommande({
      etat: "IN_DELIVERY",
      codeConfirmation: "XYZ789",
    });
    const completed = makeCommande({ etat: "COMPLETEE" });

    prismaMock.commande.findUnique.mockResolvedValue(commande);
    prismaMock.commande.update.mockResolvedValue(completed);

    const result = await confirmOrderCode(1, "XYZ789");

    expect(prismaMock.commande.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { etat: "COMPLETEE" },
      }),
    );
    expect(awardLoyaltyPointsForCompletedOrder).toHaveBeenCalledWith(1);
    expect(result).toBe(completed);
  });
});

//----------------------------------------------------------------------------
//                    toCommandeDashboardDTO
//----------------------------------------------------------------------------
describe("toCommandeDashboardDTO", () => {
  it("toCommandeDashboardDTO -- should map order correctly", () => {
    const order = makeCommande({
      type: "LIVRAISON",
      etat: "COMPLETEE",
      createdAt: new Date("2025-01-01"),
      updatedAt: new Date("2025-01-02"),
      readyForPickupAt: null,
      deliveryPickedUpAt: null,
      codeConfirmation: "1234",

      transaction: {
        total: 150,
        user: {
          id: "u1",
          firstName: "John",
          lastName: "Doe",
          email: "john@test.com",
        },
        items: [
          {
            id: 10,
            productId: 100,
            quantity: 2,
            price: 50,
            product: {
              name: "Burger",
              imageUrl: "burger.png",
            },
          },
        ],
      },

      livreur: {
        id: "l1",
        firstName: "Mike",
      },
    });

    const result = toCommandeDashboardDTO(order);

    expect(result).toEqual({
      id: 1,
      type: "LIVRAISON",
      etat: "COMPLETEE",
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
      readyForPickupAt: null,
      deliveryPickedUpAt: null,
      codeConfirmation: "1234",

      client: {
        id: "u1",
        name: "John Doe",
        email: "john@test.com",
      },

      livreur: {
        id: "l1",
        name: "Mike",
      },

      items: [
        {
          id: 10,
          imageUrl: "burger.png",
          productId: 100,
          productName: "Burger",
          quantity: 2,
          price: 50,
        },
      ],

      itemsCount: 1,
      total: 150,
    });
  });

  //----------------------------------------------------------------------------
  it("toCommandeDashboardDTO -- should handle missing optional fields", () => {
    const order = {
      id: 2,
      type: "PICKUP",
      etat: "ANNULEE",
      createdAt: new Date(),
      updatedAt: new Date(),

      transaction: {
        total: 0,
        user: {
          id: "u2",
          firstName: "Jane",
        },
        items: [],
      },

      livreur: null,
    };

    const result = toCommandeDashboardDTO(order);

    expect(result.client).toEqual({
      id: "u2",
      name: "Jane",
      email: null,
    });

    expect(result.livreur).toBeNull();
    expect(result.items).toEqual([]);
    expect(result.itemsCount).toBe(0);
    expect(result.total).toBe(0);
  });

  //----------------------------------------------------------------------------
  it('toCommandeDashboardDTO -- should fallback product name to "Unknown"', () => {
    const order = {
      id: 3,
      type: "LIVRAISON",
      etat: "COMPLETEE",
      createdAt: new Date(),
      updatedAt: new Date(),

      transaction: {
        total: 20,
        user: {
          id: "u3",
        },
        items: [
          {
            id: 1,
            productId: 99,
            quantity: 1,
            price: 20,
            product: {},
          },
        ],
      },
    };

    const result = toCommandeDashboardDTO(order);

    expect(result.items[0]?.productName).toBe("Unknown");
  });
});

//----------------------------------------------------------------------------
//                    toCommandeDashboardDTOList
//----------------------------------------------------------------------------
describe("toCommandeDashboardDTOList", () => {
  it("toCommandeDashboardDTOList -- should map a list of orders", () => {
    const orders = [
      {
        id: 1,
        type: "LIVRAISON",
        etat: "COMPLETEE",
        createdAt: new Date(),
        updatedAt: new Date(),
        transaction: {
          total: 10,
          user: {
            id: "u1",
          },
          items: [],
        },
      },
    ];

    const result = toCommandeDashboardDTOList(orders);

    expect(result).toHaveLength(1);
    expect(result[0]?.id).toBe(1);
  });

   it("toCommandeDashboardDTOList -- should return empty array when no orders", () => {
    expect(toCommandeDashboardDTOList([])).toEqual([]);
  });
});

//----------------------------------------------------------------------------
//                    getAllFinishedOrders
//----------------------------------------------------------------------------
describe("getAllFinishedOrders", () => {
  it("getAllFinishedOrders -- should fetch and map finished orders", async () => {
    const mockOrders = [makeCommande({ 
      id: 1,
        type: "LIVRAISON",
        etat: "COMPLETEE",
        createdAt: new Date(),
        updatedAt: new Date(),

        transaction: {
          total: 100,
          user: {
            id: "u1",
            name: "John",
            email: "john@test.com",
          },
          items: [],
        },

        livreur: null,
    })];

    prismaMock.commande.findMany.mockResolvedValue(mockOrders);

    const result = await getAllFinishedOrders();

    expect(prismaMock.commande.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          etat: {
            in: ["COMPLETEE", "ANNULEE"],
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      })
    );

    expect(result).toHaveLength(1);
    expect(result[0]?.etat).toBe("COMPLETEE");
  });

  //----------------------------------------------------------------------------
  it("getAllFinishedOrders -- should return empty array if no finished orders", async () => {
    (prismaMock.commande.findMany as jest.Mock).mockResolvedValue([]);

    const result = await getAllFinishedOrders();

    expect(result).toEqual([]);
  });

  //----------------------------------------------------------------------------
  it("getAllFinishedOrders -- should throw if prisma fails", async () => {
    prismaMock.commande.findMany.mockRejectedValue(
      new Error("DB ERROR")
    );

    await expect(getAllFinishedOrders()).rejects.toThrow("DB ERROR");
  });
});

//----------------------------------------------------------------------------
//                    getAllActiveOrders
//----------------------------------------------------------------------------
describe("getAllActiveOrders", () => {
  it("getAllActiveOrders -- should fetch and map finished orders", async () => {
    const mockOrders = [makeCommande({ 
      id: 1,
        type: "LIVRAISON",
        etat: "EN_PREPARATION",
        createdAt: new Date(),
        updatedAt: new Date(),

        transaction: {
          total: 100,
          user: {
            id: "u1",
            name: "John",
            email: "john@test.com",
          },
          items: [],
        },

        livreur: null,
    })];

    prismaMock.commande.findMany.mockResolvedValue(mockOrders);

    const result = await getAllActiveOrders();

    expect(prismaMock.commande.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          etat: {
            notIn: ["COMPLETEE", "ANNULEE"],
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      })
    );

    expect(result).toHaveLength(1);
    expect(result[0]?.etat).toBe("EN_PREPARATION");
  });

  //----------------------------------------------------------------------------
  it("getAllActiveOrders -- should return empty array if no finished orders", async () => {
    (prismaMock.commande.findMany as jest.Mock).mockResolvedValue([]);

    const result = await getAllActiveOrders();

    expect(result).toEqual([]);
  });

  //----------------------------------------------------------------------------
  it("getAllActiveOrders -- should throw if prisma fails", async () => {
    prismaMock.commande.findMany.mockRejectedValue(
      new Error("DB ERROR")
    );

    await expect(getAllActiveOrders()).rejects.toThrow("DB ERROR");
  });
});
