jest.mock("../../services/orders.service", () => {
  class MockOrderRequestError extends Error {
    status: number;

    constructor(status: number, message: string) {
      super(message);
      this.status = status;
    }
  }

  return {
    getAllPickupOrders: jest.fn(),
    getAllLivraisonOrders: jest.fn(),
    OrderRequestError: MockOrderRequestError,
    triggerReadyForPickup: jest.fn(),
  };
});

import {
  getOrdersToPrepare,
  getPreparationBoard,
  getReadyOrders,
  markOrderReadyByPreparateur,
} from "../../services/preparateur.service";
import {
  getAllLivraisonOrders,
  getAllPickupOrders,
  triggerReadyForPickup,
  OrderRequestError,
} from "../../services/orders.service";

const makeOrder = (overrides: any) => ({
  id: overrides.id,
  type: overrides.type ?? "PICKUP",
  etat: overrides.etat ?? "EN_PREPARATION",
  createdAt: overrides.createdAt ?? new Date("2026-04-01T10:00:00Z"),
  updatedAt: overrides.updatedAt ?? new Date("2026-04-01T10:00:00Z"),
  readyForPickupAt: overrides.readyForPickupAt ?? null,
  ...overrides,
});

describe("PreparateurServiceTests", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("GetOrdersToPrepare_FiltersPreparationOrdersAndSortsOldestFirst", async () => {
    (getAllPickupOrders as jest.Mock).mockResolvedValue([
      makeOrder({
        id: 2,
        type: "PICKUP",
        createdAt: new Date("2026-04-01T10:05:00Z"),
      }),
      makeOrder({
        id: 3,
        type: "PICKUP",
        etat: "READY_FOR_PICKUP",
        createdAt: new Date("2026-04-01T10:00:00Z"),
      }),
    ]);
    (getAllLivraisonOrders as jest.Mock).mockResolvedValue([
      makeOrder({
        id: 1,
        type: "LIVRAISON",
        createdAt: new Date("2026-04-01T10:00:00Z"),
      }),
    ]);

    const orders = await getOrdersToPrepare();

    expect(orders.map((order) => order.id)).toEqual([1, 2]);
  });

  it("GetReadyOrders_FiltersReadyStatesAndSortsByReadyTime", async () => {
    (getAllPickupOrders as jest.Mock).mockResolvedValue([
      makeOrder({
        id: 1,
        type: "PICKUP",
        etat: "READY_FOR_PICKUP",
        readyForPickupAt: new Date("2026-04-01T10:10:00Z"),
      }),
      makeOrder({
        id: 3,
        type: "PICKUP",
        etat: "EN_PREPARATION",
      }),
      makeOrder({
        id: 4,
        type: "PICKUP",
        etat: "COMPLETEE",
      }),
    ]);
    (getAllLivraisonOrders as jest.Mock).mockResolvedValue([
      makeOrder({
        id: 2,
        type: "LIVRAISON",
        etat: "READY_FOR_DELIVERY",
        readyForPickupAt: new Date("2026-04-01T10:05:00Z"),
      }),
      makeOrder({
        id: 5,
        type: "LIVRAISON",
        etat: "ANNULEE",
      }),
    ]);

    const orders = await getReadyOrders();

    expect(orders.map((order) => order.id)).toEqual([2, 1]);
  });

  it("GetPreparationBoard_ReturnsToPrepareAndReadyLists", async () => {
    (getAllPickupOrders as jest.Mock).mockResolvedValue([
      makeOrder({ id: 1, type: "PICKUP", etat: "EN_PREPARATION" }),
      makeOrder({ id: 2, type: "PICKUP", etat: "READY_FOR_PICKUP" }),
    ]);
    (getAllLivraisonOrders as jest.Mock).mockResolvedValue([]);

    const board = await getPreparationBoard();

    expect(board.toPrepare.map((order) => order.id)).toEqual([1]);
    expect(board.ready.map((order) => order.id)).toEqual([2]);
  });

  it("MarkOrderReadyByPreparateur_NoPreparateurId_Throws401", async () => {
    await expect(markOrderReadyByPreparateur(1, "")).rejects.toMatchObject({
      status: 401,
      message: "Préparateur non authentifié",
    });
  });

  it("MarkOrderReadyByPreparateur_InvalidOrderId_Throws400", async () => {
    await expect(markOrderReadyByPreparateur(0, "emp_1")).rejects.toMatchObject({
      status: 400,
      message: "ID commande invalide",
    });
  });

  it("MarkOrderReadyByPreparateur_ValidInput_DelegatesToOrdersService", async () => {
    const readyOrder = makeOrder({ id: 5, etat: "READY_FOR_PICKUP" });
    (triggerReadyForPickup as jest.Mock).mockResolvedValue(readyOrder);

    const result = await markOrderReadyByPreparateur(5, "emp_1");

    expect(triggerReadyForPickup).toHaveBeenCalledWith(5, "emp_1");
    expect(result).toBe(readyOrder);
  });

  it("OrderRequestError_MockIsUsableForStatusAssertions", () => {
    const error = new OrderRequestError(409, "Erreur");

    expect(error).toMatchObject({ status: 409, message: "Erreur" });
  });
});
